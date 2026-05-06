import { DurableObject, waitUntil } from "cloudflare:workers";
import { asc, eq, sql } from "drizzle-orm";
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
  type UserModelMessage,
} from "ai";
import * as v from "valibot";
import type { ClientWsMessage, WsMessage } from "~/hooks/use-ws-messages";
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
      wsMessage = JSON.parse(message);
    } else {
      wsMessage = JSON.parse(new TextDecoder().decode(message));
    }

    if (wsMessage !== "stop") {
      return;
    }

    console.log("Stopping active generation");
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

  public async getMessages(): Promise<schema.SavedMessageWithParts[]> {
    const messages = await this.db.query.message.findMany({
      orderBy: (m, { asc }) => [asc(m.createdAt), asc(m.order)],
      with: {
        parts: true,
      },
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
    this.model = message.model;

    waitUntil(this.streamLlmMessage(newMessageId));

    await threadData;
  }

  private async streamLlmMessage(messageId: string) {
    const previousMessages = await this.getPreviousMessages();
    const llmModel = selectModel(this.env, this.model!);
    const prompts = this.toModelMessages(previousMessages);
    const abortSignal = this.abortController.signal;
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
        },
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
            if (
              chunk.error instanceof APICallError &&
              chunk.error.responseBody
            ) {
              const response: { error?: { message?: string } } = JSON.parse(
                chunk.error.responseBody,
              );
              if (response.error?.message) {
                // const chunk = response.error.message;

                // FIXME: error handling not implemented
                console.log("error handling not implemented");
                // await this.handleChunk({
                //   chunk,
                //   messagePartId,
                //   chunkType: "error",
                //   forceDump: true,
                //   abortSignal,
                // });
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
      return "";
    }

    if (lastChunkType !== undefined) {
      await this.flushBufferedChunk(messagePartId, lastChunkType, abortSignal);
    }

    // FIXME: place in Promise.all
    const [fullMessage] = await this.db
      .update(schema.message)
      .set({
        status: "done",
      })
      .where(eq(schema.message.id, messageId))
      .returning();
    const parts = await this.db.query.messagePart.findMany({
      where: eq(schema.messagePart.messageId, messageId),
      orderBy: asc(schema.messagePart.createdAt),
    });

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
      where: (message, { isNotNull }) => isNotNull(message.textContent),
      orderBy: (message, { asc }) => [
        asc(message.createdAt),
        asc(message.order),
      ],
    });
  }

  private toModelMessages(
    previousMessages: Awaited<ReturnType<ChatSession["getPreviousMessages"]>>,
  ): ModelMessage[] {
    const modelMessages: ModelMessage[] = new Array<ModelMessage>(
      previousMessages.length,
    );

    for (const messageIndex in previousMessages) {
      const message = previousMessages[messageIndex];
      if (message.sender === "user") {
        if (!message.textContent) {
          continue;
        }

        modelMessages[messageIndex] = {
          role: "user",
          content: [
            {
              type: "text",
              text: message.textContent,
            },
          ],
        } satisfies UserModelMessage;
      } else {
        const modelContent = new Array<
          Exclude<AssistantContent, string>[number]
        >(message.parts.length);

        let messagePartIndex = 0;
        for (const part of message.parts) {
          if (!part.textContent) {
            continue;
          }

          switch (part.textContent.type) {
            case "reasoning":
            case "text":
              modelContent[messagePartIndex] = {
                type: part.textContent.type,
                text: part.textContent.content,
              };
              break;
            case "web-fetch":
            case "web-search":
              modelContent[messagePartIndex] = {
                type: "tool-call",
                toolCallId: part.id,
                toolName: part.textContent.type,
                input: part.textContent.search,
              };
              modelContent[messagePartIndex++] = {
                type: "tool-result",
                toolCallId: part.id,
                toolName: part.textContent.type,
                output: {
                  type: "json",
                  value: JSON.stringify(part.textContent.results),
                },
              };
          }
        }

        modelMessages[messageIndex] = {
          role: "assistant",
          content: modelContent,
        } satisfies AssistantModelMessage;
      }
    }

    return modelMessages;
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

  private async handleWebToolResult(messagePartId: string, output: any) {
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
        // TODO: pass results
        results: [],
      },
    });
    const broadcast: WsMessage = {
      id: messagePartId,
      type: "web-search",
      search: [search],
      // TODO: pass results
      results: [],
    };

    this.broadcast(JSON.stringify(broadcast));
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
      case "tool-call":
      case "error":
        // FIXME: riješi se duplog tipa
        return undefined;
    }
    return previous;
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
