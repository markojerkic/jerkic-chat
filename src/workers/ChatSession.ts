import { createId } from "@paralleldrive/cuid2";
import { DurableObject, waitUntil } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";

import { APICallError, stepCountIs, streamText, type ModelMessage } from "ai";
import * as v from "valibot";
import type { ClientWsMessage, WsMessage } from "~/hooks/use-ws-messages";
import {
  buildSegmentsForStoredMessage,
  getCanonicalTextContent,
} from "~/lib/message-segments";
import type { ChatMessageInput } from "~/server/llm.functions";
import {
  webFetchChunkSchema,
  webFetchTool,
  websearchChunkSchema,
  webSearchTool,
} from "~/server/llm.server";
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
  private isGeneraing = false;
  private chunkAggregator = new ChunkAggregator({ limit: 400 });
  private abortController = new AbortController();
  private activeSegment: {
    id: string;
    messageId: string;
    type: schema.SavedMessageSegment["type"];
    order: number;
    persisted: boolean;
  } | null = null;
  private currentStreamingMessageId: string | null = null;
  private currentStreamingModel: string | null = null;
  private nextSegmentOrder = 0;

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

  public async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    let wsMessage: ClientWsMessage;
    if (typeof message === "string") {
      wsMessage = JSON.parse(message);
    } else {
      wsMessage = JSON.parse(new TextDecoder().decode(message));
    }

    if (wsMessage !== "stop") {
      return;
    }

    console.log("Stopping active generation");
    if (this.currentStreamingModel) {
      await this.flushBufferedChunk(this.currentStreamingModel);
    }
    this.abortController.abort();
    this.abortController = new AbortController();
    this.chunkAggregator.getAggregateAndClear();
    await this.broadcast(
      JSON.stringify({ type: "streaming-done" } as WsMessage),
    );
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

    return this.hydrateMessages(messages);
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
    await this.db.insert(schema.messageSegment).values({
      id: createId(),
      messageId: message.id,
      type: "text",
      content: message.q,
      order: 0,
    });

    this.resetStreamingState(newMessageId, message.model);

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
    const abortSignal = this.abortController.signal;
    let aborted = abortSignal.aborted;

    try {
      const stream = streamText({
        abortSignal,
        model: llmModel,
        system: `
You are a helpful chat assistant. Answer in markdown format so that it's easier to render. When analyzing files, be thorough and provide detailed explanations.
Try to answer in the language of the question. Today's date is ${new Date().toISOString()}
        `,
        messages: prompts,
        tools: {
          websearch: webSearchTool,
          webfetch: webFetchTool,
        },
        stopWhen: stepCountIs(10),
      });

      for await (const chunk of stream.fullStream) {
        if (abortSignal.aborted) {
          aborted = true;
          break;
        }

        switch (chunk.type) {
          case "reasoning-delta":
            await this.handleChunk({
              chunk: chunk.text,
              model,
              messageId,
              segmentType: "reasoning",
              abortSignal,
            });
            break;
          case "text-delta":
            await this.handleChunk({
              chunk: chunk.text,
              model,
              messageId,
              segmentType: "text",
              abortSignal,
            });
            break;
          case "reasoning-start":
            await this.handleReasoning("start", messageId, model, abortSignal);
            break;
          case "reasoning-end":
            await this.handleReasoning("end", messageId, model, abortSignal);
            break;

          case "tool-call":
            if ("toolName" in chunk) {
              const websearchResult = v.safeParse(websearchChunkSchema, chunk);
              const webFetchResult = v.safeParse(webFetchChunkSchema, chunk);

              if (websearchResult.success) {
                await this.handleWebsearchTool(
                  websearchResult.output.input.query,
                  messageId,
                  model,
                  abortSignal,
                );
              }

              if (webFetchResult.success) {
                await this.handleFetchTool(
                  webFetchResult.output.input.urls,
                  messageId,
                  model,
                  abortSignal,
                );
              }
            }
            break;
          case "error":
            if (
              chunk.error instanceof APICallError &&
              chunk.error.responseBody
            ) {
              const response: { error?: { message?: string } } = JSON.parse(
                chunk.error.responseBody,
              );
              if (response.error?.message) {
                const chunk = `> Error: ${response.error.message}\n`;

                await this.handleChunk({
                  chunk,
                  messageId,
                  model,
                  segmentType: "text",
                  forceDump: true,
                  abortSignal,
                });
              }
            }
            break;
        }
      }
    } catch (error) {
      if (isAbortError(error) || abortSignal.aborted) {
        aborted = true;
      } else {
        this.isGeneraing = false;
        this.clearStreamingState();
        throw error;
      }
    }

    if (aborted) {
      await this.db
        .update(schema.message)
        .set({
          status: "done",
        })
        .where(eq(schema.message.id, messageId));

      this.isGeneraing = false;
      this.clearStreamingState();
      return "";
    }

    await this.flushBufferedChunk(model, abortSignal);

    await this.db
      .update(schema.message)
      .set({
        status: "done",
      })
      .where(eq(schema.message.id, messageId));

    const fullMessage = await this.getMessage(messageId);

    if (fullMessage) {
      await this.broadcast(
        JSON.stringify({
          ...fullMessage,
          type: "last-chunk",
        } satisfies WsMessage),
      );
    }

    this.isGeneraing = false;
    this.clearStreamingState();
    return fullMessage?.textContent ?? "";
  }

  private async getPreviousMessages() {
    const messages = await this.getMessages();

    return messages
      .filter((message) => message.textContent)
      .map((message) => ({
        message: message.textContent,
        sender: message.sender,
        attachments: message.messageAttachemts,
      }));
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

  private async handleReasoning(
    type: "start" | "end",
    _messageId: string,
    model: string,
    abortSignal?: AbortSignal,
  ) {
    await this.flushBufferedChunk(model, abortSignal);
    this.closeActiveSegment();

    if (type === "start") {
      return;
    }
  }

  private async handleFetchTool(
    urls: string[],
    messageId: string,
    model: string,
    abortSignal?: AbortSignal,
  ) {
    await this.handleToolCall({
      content: `Fetching ${urls.join(", ")}`,
      messageId,
      model,
      abortSignal,
    });
  }

  private async handleWebsearchTool(
    search: string,
    messageId: string,
    model: string,
    abortSignal?: AbortSignal,
  ) {
    await this.handleToolCall({
      content: `Web search ${search}`,
      messageId,
      model,
      abortSignal,
    });
  }

  private async handleChunk({
    chunk,
    messageId,
    model,
    segmentType,
    forceDump,
    abortSignal,
  }: {
    chunk: string;
    messageId: string;
    model: string;
    segmentType: schema.SavedMessageSegment["type"];
    forceDump?: boolean;
    abortSignal?: AbortSignal;
  }) {
    if (abortSignal?.aborted) {
      return;
    }

    await this.ensureActiveSegment({
      messageId,
      model,
      segmentType,
      abortSignal,
    });

    this.chunkAggregator.append(chunk);

    if (forceDump || this.chunkAggregator.hasReachedLimit()) {
      await this.flushBufferedChunk(model, abortSignal);
    }
  }

  private async flushBufferedChunk(model: string, abortSignal?: AbortSignal) {
    if (abortSignal?.aborted) {
      this.chunkAggregator.getAggregateAndClear();
      return;
    }

    if (!this.activeSegment) {
      this.chunkAggregator.getAggregateAndClear();
      return;
    }

    const aggregatedChunk = this.chunkAggregator.getAggregateAndClear();
    if (aggregatedChunk.length === 0) {
      return;
    }

    const { id, messageId, order, type } = this.activeSegment;

    await this.broadcast(
      JSON.stringify({
        type: "segment-delta",
        messageId,
        delta: aggregatedChunk,
        model,
        segment: {
          id,
          order,
          type,
        },
      } satisfies WsMessage),
    );

    if (!this.activeSegment.persisted) {
      await this.db.insert(schema.messageSegment).values({
        id,
        messageId,
        type,
        content: aggregatedChunk,
        order,
      });
      this.activeSegment.persisted = true;
    } else {
      this.db.run(
        sql`update messageSegment set content = content || ${aggregatedChunk} where id = ${id}`,
      );
    }

    if (type === "text") {
      this.db.run(
        sql`update message set textContent = coalesce(textContent, '') || ${aggregatedChunk} where id = ${messageId}`,
      );
    }
  }

  private async getMessage(messageId: string) {
    const message = await this.db.query.message.findFirst({
      where: eq(schema.message.id, messageId),
    });

    if (!message) {
      return undefined;
    }

    const [hydratedMessage] = await this.hydrateMessages([message]);
    return hydratedMessage;
  }

  private async hydrateMessages(messages: schema.SavedMessageRow[]) {
    if (!messages.length) {
      return [];
    }

    const existingSegments = await this.db.query.messageSegment.findMany({
      orderBy: (segment, { asc }) => [
        asc(segment.messageId),
        asc(segment.order),
      ],
    });

    const segmentsByMessage = new Map<string, schema.SavedMessageSegment[]>();
    for (const segment of existingSegments) {
      const segments = segmentsByMessage.get(segment.messageId) ?? [];
      segments.push(segment);
      segmentsByMessage.set(segment.messageId, segments);
    }

    const missingSegments = messages.filter(
      (message) => message.textContent && !segmentsByMessage.has(message.id),
    );

    if (missingSegments.length > 0) {
      const backfilledSegments =
        await this.backfillMissingSegments(missingSegments);

      for (const [messageId, segments] of backfilledSegments) {
        segmentsByMessage.set(messageId, segments);
      }

      messages = messages.map((message) => {
        const segments = backfilledSegments.get(message.id);
        if (!segments) {
          return message;
        }

        return {
          ...message,
          textContent: getCanonicalTextContent(segments) || null,
        };
      });
    }

    return messages.map((message) => ({
      ...message,
      segments: segmentsByMessage.get(message.id) ?? [],
    }));
  }

  private async backfillMissingSegments(messages: schema.SavedMessageRow[]) {
    const segmentsByMessage = new Map<string, schema.SavedMessageSegment[]>();

    for (const message of messages) {
      const segments = buildSegmentsForStoredMessage(message);
      if (segments.length > 0) {
        await this.db.insert(schema.messageSegment).values(segments);
      }

      await this.db
        .update(schema.message)
        .set({
          textContent: getCanonicalTextContent(segments) || null,
        })
        .where(eq(schema.message.id, message.id));

      segmentsByMessage.set(message.id, segments);
    }

    return segmentsByMessage;
  }

  private async handleToolCall({
    content,
    messageId,
    model,
    abortSignal,
  }: {
    content: string;
    messageId: string;
    model: string;
    abortSignal?: AbortSignal;
  }) {
    await this.flushBufferedChunk(model, abortSignal);
    this.closeActiveSegment();
    await this.handleChunk({
      chunk: content,
      messageId,
      model,
      segmentType: "tool",
      forceDump: true,
      abortSignal,
    });
    this.closeActiveSegment();
  }

  private async ensureActiveSegment({
    messageId,
    model,
    segmentType,
    abortSignal,
  }: {
    messageId: string;
    model: string;
    segmentType: schema.SavedMessageSegment["type"];
    abortSignal?: AbortSignal;
  }) {
    if (
      this.activeSegment &&
      this.activeSegment.messageId === messageId &&
      this.activeSegment.type === segmentType
    ) {
      return;
    }

    await this.flushBufferedChunk(model, abortSignal);
    this.closeActiveSegment();
    this.openSegment(messageId, segmentType);
  }

  private openSegment(
    messageId: string,
    type: schema.SavedMessageSegment["type"],
  ) {
    if (this.currentStreamingMessageId !== messageId) {
      this.currentStreamingMessageId = messageId;
      this.nextSegmentOrder = 0;
    }

    this.activeSegment = {
      id: createId(),
      messageId,
      type,
      order: this.nextSegmentOrder++,
      persisted: false,
    };
  }

  private closeActiveSegment() {
    this.activeSegment = null;
  }

  private resetStreamingState(messageId: string, model: string) {
    this.currentStreamingMessageId = messageId;
    this.currentStreamingModel = model;
    this.nextSegmentOrder = 0;
    this.activeSegment = null;
    this.chunkAggregator.getAggregateAndClear();
  }

  private clearStreamingState() {
    this.currentStreamingMessageId = null;
    this.currentStreamingModel = null;
    this.nextSegmentOrder = 0;
    this.activeSegment = null;
    this.chunkAggregator.getAggregateAndClear();
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
