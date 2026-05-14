import { DurableObject, waitUntil } from "cloudflare:workers";
import { and, asc, eq, gt, gte, or, sql } from "drizzle-orm";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";

import { createId } from "@paralleldrive/cuid2";
import {
  APICallError,
  stepCountIs,
  streamText,
  type AssistantContent,
  type AssistantModelMessage,
  type ModelMessage,
  type ToolModelMessage,
  type UserModelMessage,
} from "ai";
import * as v from "valibot";
import type { ChatMessageInput } from "~/server/llm.functions";
import {
  generateImageChunkSchema,
  generateImageTool,
  webFetchChunkSchema,
  webFetchTool,
  websearchChunkSchema,
  webSearchTool,
} from "~/server/llm.server";
import { ChunkAggregator } from "~/server/llm/chunk-aggregator";
import { getProvider, selectModel } from "~/server/model-picker.server";
import type { ClientWsMessage, WsMessage } from "~/store/ws-message";
import migrations from "../db/session/drizzle/migrations";
import * as schema from "../db/session/schema";

export type InitialThreadData = {
  lastModel: string;
  title: string | undefined;
  messages: schema.SavedMessageWithParts[];
};

export class ChatSession extends DurableObject<Env> {
  private db: DrizzleSqliteDODatabase<typeof schema>;
  private isGeneraing = false;
  private model: string | undefined;
  private chunkAggregator = new ChunkAggregator({ limit: 100 });
  private abortController = new AbortController();

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

  public async webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer) {
    let wsMessage: ClientWsMessage;
    if (typeof message === "string") {
      try {
        wsMessage = JSON.parse(message);
      } catch {
        wsMessage = message as ClientWsMessage;
      }
    } else {
      wsMessage = JSON.parse(new TextDecoder().decode(message));
    }

    if (wsMessage !== "stop") {
      return;
    }

    this.abortController.abort();
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

  public async getMessages(): Promise<schema.SavedMessageWithParts[]> {
    const messages = await this.db.query.message.findMany({
      orderBy: (m, { asc }) => [asc(m.createdAt), asc(m.order)],
      with: {
        parts: true,
      },
    });

    return messages;
  }

  public async retryMessage(messageId: string, model: string) {
    const target = await this.deleteMessagesAfter(messageId);
    if (!target) {
      return;
    }

    const newMessageId = createId();
    await this.db.insert(schema.message).values({
      id: newMessageId,
      sender: "llm",
      model,
      createdAt: new Date(),
      order: 1,
      status: "streaming",
    });

    this.model = model;
    const abortController = new AbortController();
    this.abortController = abortController;
    waitUntil(this.streamLlmMessage(newMessageId, abortController.signal));
  }

  public async sendMessage(
    userId: string,
    message: ChatMessageInput,
  ): Promise<string | undefined> {
    if (this.isGeneraing) {
      throw Error("Already generating");
    }
    this.isGeneraing = true;
    const threadData = this.createThreadIfNotExists(
      userId,
      message.q,
      message.threadId,
    );

    const newMessageId = message.llmMessageId;
    const createdAt = new Date();
    await this.db.insert(schema.message).values([
      {
        id: message.id,
        sender: "user",
        textContent: message.q,
        model: message.model,
        createdAt,
        status: "done",
        order: 0,
        // TODO: attachemts
        // messageAttachemts: message.files,
      },
      {
        id: newMessageId,
        sender: "llm",
        model: message.model,
        createdAt: new Date(createdAt.getTime() + 1),
        order: 1,
        status: "streaming",
      },
    ]);
    this.model = message.model;
    const abortController = new AbortController();
    this.abortController = abortController;

    waitUntil(this.streamLlmMessage(newMessageId, abortController.signal));

    return await threadData;
  }

  public async deleteMessages() {
    await this.db.delete(schema.messagePart);
    await this.db.delete(schema.message);
  }

  public async getGeneratedImage(messageId: string, key: string) {
    if (!key.startsWith("tools/image/")) {
      return null;
    }

    const [matchingPart] = await this.db
      .select({ id: schema.messagePart.id })
      .from(schema.messagePart)
      .where(
        and(
          eq(schema.messagePart.messageId, messageId),
          eq(schema.messagePart.type, "text"),
          sql`json_extract(${schema.messagePart.textContent}, '$.content') = ${key}`,
        ),
      )
      .limit(1);

    if (!matchingPart) {
      return null;
    }

    const image = await this.env.upload_files.get(key);
    if (!image) {
      return null;
    }

    return {
      buffer: await image.arrayBuffer(),
      contentType: image.httpMetadata?.contentType ?? "image/png",
    };
  }

  private async streamLlmMessage(messageId: string, abortSignal: AbortSignal) {
    const previousMessages = await this.getPreviousMessages();
    const llmModel = selectModel(this.env, this.model!);
    const prompts = this.toModelMessages(previousMessages);
    let aborted = abortSignal.aborted;
    let lastChunkType: schema.MessagePart["type"] | undefined = undefined;
    let messagePartId: string = createId();
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
          generateImage: generateImageTool(
            getProvider(),
            (key, value, options) =>
              this.env.upload_files.put(key, value, options),
          ),
        },
        onError: () => {},
        stopWhen: stepCountIs(10),
      });

      for await (const chunk of stream.fullStream) {
        if (abortSignal.aborted) {
          aborted = true;
          break;
        }

        const newChunkType = this.partChunkType(chunk.type, lastChunkType);
        if (newChunkType === undefined) {
          if (chunk.type !== "tool-call" && chunk.type !== "error") {
            continue;
          }
        } else if (lastChunkType !== newChunkType) {
          if (lastChunkType !== undefined) {
            await this.flushBufferedChunk(
              messagePartId,
              lastChunkType,
              abortSignal,
            );
          }
          messagePartId = createId();
          lastChunkType = newChunkType;

          await this.db
            .insert(schema.messagePart)
            .values(
              this.createMessagePart(messageId, messagePartId, newChunkType),
            );
        }

        switch (chunk.type) {
          case "text-delta":
          case "reasoning-delta":
            if (newChunkType === undefined) {
              break;
            }

            await this.handleChunk({
              chunk: chunk.text,
              messagePartId,
              chunkType: newChunkType,
              abortSignal,
            });
            break;

          case "tool-call":
            if (lastChunkType !== undefined) {
              await this.flushBufferedChunk(
                messagePartId,
                lastChunkType,
                abortSignal,
              );
              lastChunkType = undefined;
            }
            if ("toolName" in chunk) {
              const toolCallChunk = {
                ...chunk,
                input:
                  typeof chunk.input === "string"
                    ? JSON.parse(chunk.input)
                    : chunk.input,
              };
              const websearchResult = v.safeParse(
                websearchChunkSchema,
                toolCallChunk,
              );
              const webFetchResult = v.safeParse(
                webFetchChunkSchema,
                toolCallChunk,
              );
              const generateImageResult = v.safeParse(
                generateImageChunkSchema,
                toolCallChunk,
              );

              if (websearchResult.success) {
                await this.handleWebsearchTool(
                  websearchResult.output.input.query,
                  messageId,
                  chunk.toolCallId,
                );
              } else if (webFetchResult.success) {
                await this.handleFetchTool(
                  webFetchResult.output.input.urls,
                  messageId,
                  chunk.toolCallId,
                );
              } else if (generateImageResult.success) {
                console.log("USING== image prompt", generateImageResult.output);
                generateImageResult.output;
                this.handleGenerateImageToolResult(messageId, messagePartId, {
                  fileKey: generateImageResult.output.output.fileKey,
                  type: "image-generation",
                });
              } else {
                console.error("No tool with type", chunk);
              }
            }
            break;
          case "tool-result":
            if (
              chunk.toolName === "websearch" ||
              chunk.toolName === "webfetch"
            ) {
              this.handleWebToolResult(chunk.toolCallId, chunk.output);
            }
            break;
          case "error":
            messagePartId = await this.handleError(
              messageId,
              messagePartId,
              lastChunkType ?? "text",
              this.extractApiErrorMessage(chunk.error),
            );
            lastChunkType = "error";
            break;
        }
      }
    } catch (error) {
      console.log("USING== CATCH error message", error);
      if (isAbortError(error) || abortSignal.aborted) {
        aborted = true;
      } else {
        const errorMessage = this.extractApiErrorMessage(error);
        messagePartId = await this.handleError(
          messageId,
          messagePartId,
          lastChunkType ?? "text",
          errorMessage,
        );
        lastChunkType = "error";
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
      return "";
    }

    if (lastChunkType !== undefined) {
      await this.flushBufferedChunk(messagePartId, lastChunkType, abortSignal);
    }

    const [[fullMessage], parts] = await Promise.all([
      this.db
        .update(schema.message)
        .set({
          status: "done",
        })
        .where(eq(schema.message.id, messageId))
        .returning(),
      this.db.query.messagePart.findMany({
        where: eq(schema.messagePart.messageId, messageId),
        orderBy: asc(schema.messagePart.createdAt),
      }),
    ]);

    if (fullMessage) {
      await this.broadcast(
        JSON.stringify({
          ...fullMessage,
          parts,
          type: "message-finished",
        } satisfies WsMessage),
      );
    } else {
      console.warn("no final message", messageId);
    }

    this.isGeneraing = false;
    return fullMessage.textContent ?? "";
  }

  private createMessagePart(
    messageId: string,
    messagePartId: string,
    partType: schema.MessagePartContentType,
  ): schema.MessagePartInput {
    if (partType === "text") {
      return {
        type: partType,
        id: messagePartId,
        messageId,
        createdAt: new Date(),
        textContent: { type: partType, content: "" },
      };
    } else if (partType === "reasoning") {
      return {
        type: partType,
        id: messagePartId,
        messageId,
        createdAt: new Date(),
        textContent: { type: partType, content: "" },
      };
    } else if (partType === "error") {
      throw Error("Cannot eagerly create error part");
    }

    return {
      type: partType,
      id: messagePartId,
      messageId,
      createdAt: new Date(),
      textContent: { type: partType, search: [], results: [] },
    };
  }

  private async getPreviousMessages() {
    return await this.db.query.message.findMany({
      columns: {
        textContent: true,
        sender: true,
        messageAttachemts: true,
      },
      with: {
        parts: {
          orderBy: (part, { asc }) => asc(part.createdAt),
        },
      },
      where: (message, { not, eq }) => not(eq(message.status, "streaming")),
      orderBy: (message, { asc }) => [
        asc(message.createdAt),
        asc(message.order),
      ],
    });
  }

  private toModelMessages(
    previousMessages: Awaited<ReturnType<ChatSession["getPreviousMessages"]>>,
  ): ModelMessage[] {
    const modelMessages: ModelMessage[] = [];

    for (const message of previousMessages) {
      if (message.sender === "user") {
        if (!message.textContent) {
          continue;
        }

        modelMessages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: message.textContent,
            },
          ],
        } satisfies UserModelMessage);
      } else {
        let modelContent: Exclude<AssistantContent, string> = [];

        for (const part of message.parts) {
          if (!part.textContent) {
            continue;
          }

          switch (part.textContent.type) {
            case "reasoning":
            case "text":
              modelContent.push({
                type: part.textContent.type,
                text: part.textContent.content,
              });
              break;
            case "web-fetch":
            case "web-search":
              const toolName = this.toModelToolName(part.textContent.type);
              modelContent.push({
                type: "tool-call",
                toolCallId: part.id,
                toolName,
                input:
                  part.textContent.type === "web-search"
                    ? { query: part.textContent.search[0] ?? "" }
                    : { urls: part.textContent.search },
              });
              this.appendAssistantMessage(modelMessages, modelContent);
              modelContent = [];
              modelMessages.push({
                role: "tool",
                content: [
                  {
                    type: "tool-result",
                    toolCallId: part.id,
                    toolName,
                    output: {
                      type: "json",
                      value: part.textContent.results as any,
                    },
                  },
                ],
              } satisfies ToolModelMessage);
          }
        }

        this.appendAssistantMessage(modelMessages, modelContent);
      }
    }

    return modelMessages;
  }

  private appendAssistantMessage(
    modelMessages: ModelMessage[],
    content: Exclude<AssistantContent, string>,
  ) {
    if (content.length === 0) {
      return;
    }

    modelMessages.push({
      role: "assistant",
      content,
    } satisfies AssistantModelMessage);
  }

  private toModelToolName(toolType: "web-search" | "web-fetch") {
    return toolType === "web-search" ? "websearch" : "webfetch";
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

  private async handleError(
    messageId: string,
    messagePartId: string,
    lastChunkType: schema.MessagePartContentType,
    error: string,
  ): Promise<string> {
    if ("reasoning" === lastChunkType || "text" === lastChunkType) {
      await this.flushBufferedChunk(messagePartId, lastChunkType);
    }

    const newPartId = createId();
    await this.db.insert(schema.messagePart).values({
      id: newPartId,
      messageId,
      type: "error",
      textContent: {
        type: "error",
        content: error,
      },
    });
    const broadcast: WsMessage = {
      id: newPartId,
      type: "error",
      content: error,
    };

    await this.broadcast(JSON.stringify(broadcast));
    return newPartId;
  }

  private extractApiErrorMessage(error: unknown): string {
    if (error instanceof Error && APICallError.isInstance(error)) {
      const responseBody = error.responseBody;
      try {
        const response: { error?: { message?: string } } = responseBody
          ? JSON.parse(responseBody)
          : {};
        if (response.error?.message) {
          return response.error.message;
        }
      } catch {
        return error.message;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "The model request failed.";
  }

  private async handleFetchTool(
    urls: string[],
    messageId: string,
    messagePartId: string,
  ) {
    await this.db.insert(schema.messagePart).values({
      id: messagePartId,
      messageId,
      type: "web-fetch",
      textContent: {
        type: "web-fetch",
        search: urls,
        results: [],
      },
    });
    const broadcast: WsMessage = {
      id: messagePartId,
      type: "web-fetch",
      search: urls,
      results: [],
    };

    this.broadcast(JSON.stringify(broadcast));
  }

  private async handleWebToolResult(messagePartId: string, output: unknown) {
    this.db.run(sql`
      update messagePart
      set textContent = json_set(
        textContent,
        '$.results',
        ${JSON.stringify(output)}
      )
      where id = ${messagePartId}
    `);
  }

  private async handleWebsearchTool(
    search: string,
    messageId: string,
    messagePartId: string,
  ) {
    await this.db.insert(schema.messagePart).values({
      id: messagePartId,
      messageId,
      type: "web-search",
      textContent: {
        type: "web-search",
        search: [search],
        results: [],
      },
    });
    const broadcast: WsMessage = {
      id: messagePartId,
      type: "web-search",
      search: [search],
      results: [],
    };

    this.broadcast(JSON.stringify(broadcast));
  }

  private async handleGenerateImageToolResult(
    messageId: string,
    messagePartId: string,
    output: schema.ImageGenerationMessagePart,
  ) {
    await this.db.insert(schema.messagePart).values({
      id: messagePartId,
      messageId,
      type: "text",
      textContent: output,
    });

    await this.broadcast(
      JSON.stringify({
        type: "image-generation",
        id: messagePartId,
        fileKey: output.fileKey,
      } satisfies WsMessage),
    );
  }

  private async handleChunk({
    chunk,
    messagePartId,
    chunkType,
    forceDump,
    abortSignal,
  }: {
    chunk: string;
    messagePartId: string;
    chunkType: Omit<schema.MessagePartContentType, "text" | "reasoning">;
    forceDump?: boolean;
    abortSignal?: AbortSignal;
  }): Promise<void>;
  private async handleChunk({
    chunk,
    messagePartId,
    chunkType,
    forceDump,
    abortSignal,
  }: {
    chunk: string;
    messagePartId: string;
    chunkType: "text" | "reasoning";
    forceDump?: boolean;
    abortSignal?: AbortSignal;
  }) {
    if (!["text", "reasoning"].includes(chunkType)) {
      return;
    }

    if (abortSignal?.aborted) {
      return;
    }

    this.chunkAggregator.append(chunk);

    if (forceDump || this.chunkAggregator.hasReachedLimit()) {
      await this.flushBufferedChunk(messagePartId, chunkType, abortSignal);
    }
  }

  private async flushBufferedChunk(
    messagePartId: string,
    type: Omit<schema.MessagePartContentType, "text" | "reasoning">,
    abortSignal?: AbortSignal,
  ): Promise<void>;
  private async flushBufferedChunk(
    messagePartId: string,
    type: "text" | "reasoning",
    abortSignal?: AbortSignal,
  ): Promise<void> {
    if (abortSignal?.aborted) {
      this.chunkAggregator.getAggregateAndClear();
      return;
    }

    const aggregatedChunk = this.chunkAggregator.getAggregateAndClear();
    if (aggregatedChunk.length === 0) {
      return;
    }

    this.db.run(sql`
      update messagePart
      set textContent = json_set(
        textContent,
        '$.content',
        coalesce(json_extract(textContent, '$.content'), '') || ${aggregatedChunk}
      )
      where id = ${messagePartId}
    `);

    const message: WsMessage = {
      type,
      id: messagePartId,
      content: aggregatedChunk,
    };
    await this.broadcast(JSON.stringify(message));
  }

  private async deleteMessagesAfter(messageId: string): Promise<boolean> {
    const [target] = await this.db
      .select({
        createdAt: schema.message.createdAt,
        order: schema.message.order,
        sender: schema.message.sender,
      })
      .from(schema.message)
      .where(eq(schema.message.id, messageId));
    if (!target) {
      console.warn("no messages to delete for retrying");
      return false;
    }
    if (target.sender !== "llm") {
      console.warn("only llm messages can be retried");
      return false;
    }

    await this.db
      .delete(schema.message)
      .where(
        or(
          gt(schema.message.createdAt, target.createdAt),
          and(
            eq(schema.message.createdAt, target.createdAt),
            target.order === null
              ? eq(schema.message.id, messageId)
              : gte(schema.message.order, target.order),
          ),
        ),
      )
      .returning({ id: schema.message.id });
    return true;
  }

  private partChunkType(
    chunkType: string,
    previous: schema.MessagePartContentType | undefined,
  ): schema.MessagePartContentType | undefined {
    switch (chunkType) {
      case "reasoning-start":
      case "reasoning-delta":
      case "reasoning-end":
        return "reasoning";
      case "text-start":
      case "text-delta":
      case "text-end":
        return "text";
      // FIXME: riješi se duplog tipa
      case "tool-call":
      case "error":
        return undefined;
    }
    return previous;
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
