import { DurableObject } from "cloudflare:workers";
import { desc, eq, isNotNull } from "drizzle-orm";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";

import { createId } from "@paralleldrive/cuid2";
import { streamText, type ModelMessage } from "ai";
import type { ChatMessageInput } from "~/server/llm.functions";
import { selectModel } from "~/server/model-picker.server";
import migrations from "../db/session/drizzle/migrations";
import * as schema from "../db/session/schema";

export class ChatSession extends DurableObject<Env> {
  private db: DrizzleSqliteDODatabase<typeof schema>;
  private generatingMessage: string | null = null;
  private isGeneraing = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.db = drizzle(ctx.storage, { schema, logger: false });

    ctx.blockConcurrencyWhile(async () => {
      await migrate(this.db, migrations);
    });
  }

  public async sendMessage(userId: string, message: ChatMessageInput) {
    if (this.isGeneraing) {
      throw Error("Already generating");
    }
    this.isGeneraing = true;

    const newMessageId = createId();
    await this.db.insert(schema.message).values([
      {
        id: message.id,
        sender: "user",
        textContent: message.q,
        model: message.model,
        status: "done",
        // TODO: attachemts
        // messageAttachemts: message.files,
      },
      {
        id: newMessageId,
        sender: "llm",
        model: message.model,
        status: "streaming",
      },
    ]);
    const threadData = this.createThreadIfNotExists(
      userId,
      message.q,
      message.threadId,
    );

    const newMessage = await this.streamLlmMessage(newMessageId, message.model);
    await this.db.update(schema.message).set({
      textContent: newMessage,
    });

    this.isGeneraing = false;
    return await threadData;
  }

  public async getMessages() {
    const messages = await this.db.query.message.findMany({
      orderBy: (m, { desc }) => desc(m.createdAt),
    });

    return messages;
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
      }
    }
    // const usage = await stream.usage;
    // console.log("usage", usage);

    await this.db
      .update(schema.message)
      .set({
        textContent: await stream.text,
        status: "done",
      })
      .where(eq(schema.message.id, messageId));

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
      .orderBy(desc(schema.message.createdAt));
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
}
