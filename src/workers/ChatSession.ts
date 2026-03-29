import { DurableObject, waitUntil } from "cloudflare:workers";
import { asc, eq, isNotNull } from "drizzle-orm";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";

import { streamText, type ModelMessage } from "ai";
import type { WsMessage } from "~/hooks/use-ws-messages";
import type { ChatMessageInput } from "~/server/llm.functions";
import { ChunkAggregator } from "~/server/llm/chunk-aggregator";
import { selectModel } from "~/server/model-picker.server";
import migrations from "../db/session/drizzle/migrations";
import * as schema from "../db/session/schema";

export type InitialThreadData = {
  lastModel: string;
  title: string | undefined;
  messages: schema.SavedMessage[];
};

export class ChatSession extends DurableObject<Env> {
  private db: DrizzleSqliteDODatabase<typeof schema>;
  private generatingMessage: string | null = null;
  private isGeneraing = false;
  private chunkAggregator = new ChunkAggregator({ limit: 400 });

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.db = drizzle(ctx.storage, { schema, logger: false });

    ctx.blockConcurrencyWhile(async () => {
      try {
        await migrate(this.db, migrations);
      } catch (e) {
        console.error("failed to migrate chat session", e);
      }
    });
  }

  public async fetch() {
    const websocketPair = new WebSocketPair();
    const [client, server] = Object.values(websocketPair);

    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  public webSocketError(_ws: WebSocket, error: unknown) {
    console.error("webSocketError", error);
  }

  public webSocketClose(
    _ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ) {
    console.log("webSocketClose, connections", this.ctx.getWebSockets().length);
  }

  public async getInitialThreadData(
    userId: string,
    threadId: string,
  ): Promise<InitialThreadData> {
    const userData = this.env.USER_DATA_DO.get(
      this.env.USER_DATA_DO.idFromName(userId),
    );

    const [lastModel, title, messages] = await Promise.all([
      this.getLastModel(),
      userData.getThreadTitle(threadId),
      this.getMessages(),
    ]);

    return {
      lastModel: lastModel?.model ?? "",
      title,
      messages,
    };
  }

  public async getMessages(): Promise<schema.SavedMessage[]> {
    const messages = await this.db.query.message.findMany({
      orderBy: (m, { asc }) => [asc(m.createdAt), asc(m.order)],
    });

    return messages;
  }

  public async sendMessage(userId: string, message: ChatMessageInput) {
    if (this.isGeneraing) {
      throw Error("Already generating");
    }
    this.isGeneraing = true;

    const newMessageId = message.llmMessageId;
    await this.db.insert(schema.message).values([
      {
        id: message.id,
        sender: "user",
        textContent: message.q,
        model: message.model,
        status: "done",
        order: 0,
        // TODO: attachemts
        // messageAttachemts: message.files,
      },
      {
        id: newMessageId,
        sender: "llm",
        model: message.model,
        order: 1,
        status: "streaming",
      },
    ]);
    const threadData = this.createThreadIfNotExists(
      userId,
      message.q,
      message.threadId,
    );

    waitUntil(this.streamLlmMessage(newMessageId, message.model));

    await threadData;
  }

  private async streamLlmMessage(messageId: string, model: string) {
    const previousMessages = await this.getPreviousMessages();
    const llmModel = selectModel(this.env, model);
    const prompts = this.toModelMessages(previousMessages);

    this.generatingMessage = "";
    const stream = streamText({
      model: llmModel,
      system: `
You are a helpful chat assistant. Answer in markdown format so that it's easier to render. When analyzing files, be thorough and provide detailed explanations.
Try to answer in the language of the question.
        `,
      messages: prompts,
    });

    for await (const chunk of stream.fullStream) {
      switch (chunk.type) {
        case "text-delta":
          this.generatingMessage += chunk.text;
          this.handleChunk({
            chunk: chunk.text,
            model,
            messageId,
          });
      }
    }
    // const usage = await stream.usage;
    // console.log("usage", usage);

    const [fullMessage] = await this.db
      .update(schema.message)
      .set({
        textContent: await stream.text,
        status: "done",
      })
      .where(eq(schema.message.id, messageId))
      .returning();

    this.chunkAggregator.getAggregateAndClear();
    if (fullMessage) {
      await this.broadcast(
        JSON.stringify({
          ...fullMessage,
          type: "last-chunk",
        } satisfies WsMessage),
      );
    }

    this.isGeneraing = false;
    return this.generatingMessage;
  }

  private async getPreviousMessages() {
    return await this.db
      .select({
        message: schema.message.textContent,
        sender: schema.message.sender,
        attachments: schema.message.messageAttachemts,
      })
      .from(schema.message)
      .where(isNotNull(schema.message.textContent))
      .orderBy(asc(schema.message.createdAt));
  }

  private toModelMessages(
    previousMessages: Awaited<ReturnType<ChatSession["getPreviousMessages"]>>,
  ): ModelMessage[] {
    return previousMessages.map((message) => ({
      role: message.sender === "llm" ? "assistant" : "user",
      content: [
        {
          text: message.message ?? "",
          type: "text",
        },
      ],
    }));
  }

  private async createThreadIfNotExists(
    userId: string,
    prompt: string,
    threadId: string,
  ) {
    const userData = this.env.USER_DATA_DO.get(
      this.env.USER_DATA_DO.idFromName(userId),
    );
    return await userData.createThread(prompt, threadId);
  }

  private getLastModel() {
    return this.db.query.message.findFirst({
      columns: {
        model: true,
      },
      orderBy: ({ createdAt }, { desc }) => desc(createdAt),
    });
  }

  private async broadcast(message: string) {
    for (const connection of this.ctx.getWebSockets()) {
      connection.send(message);
    }
  }

  private async handleChunk({
    chunk,
    messageId,
    model,
    forceDump,
  }: {
    chunk: string;
    messageId: string;
    model: string;
    forceDump?: boolean;
  }) {
    this.chunkAggregator.append(chunk);

    if (forceDump || this.chunkAggregator.hasReachedLimit()) {
      const aggregatedChunk = this.chunkAggregator.getAggregateAndClear();
      await Promise.all([
        this.broadcast(
          JSON.stringify({
            type: "text-delta",
            id: messageId,
            delta: aggregatedChunk,
            model,
          } satisfies WsMessage),
        ),
      ]);
    }
  }
}
