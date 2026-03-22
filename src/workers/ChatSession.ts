import { DurableObject } from "cloudflare:workers";
import { asc, isNotNull } from "drizzle-orm";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";

import { createId } from "@paralleldrive/cuid2";
import { streamText, type ModelMessage } from "ai";
import type { ChatMessageInput } from "~/components/thread/thread";
import { selectModel } from "~/server/model-picker.server";
import migrations from "../db/session/drizzle/migrations";
import * as schema from "../db/session/schema";

export class ChatSession extends DurableObject<Env> {
  private db: DrizzleSqliteDODatabase<typeof schema>;
  private generatingMessage: string | null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.db = drizzle(ctx.storage, { schema, logger: false });

    ctx.blockConcurrencyWhile(async () => {
      await migrate(this.db, migrations);
    });
  }

  public async sendMessage(message: ChatMessageInput) {
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
  }

  public async getMessages() {
    const messages = await this.db.query.message.findMany({
      orderBy: (m, { asc }) => asc(m.id),
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
      console.log("chunk");

      switch (chunk.type) {
        case "text-delta":
          this.generatingMessage += chunk.text;
      }
    }
    const usage = await stream.usage;
    console.log("usage", usage);
    console.log("full message", this.generatingMessage);
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
      .orderBy(asc(schema.message.id));
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
}
