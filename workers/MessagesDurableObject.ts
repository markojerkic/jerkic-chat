import { APICallError, streamText, type CoreMessage } from "ai";
import { DurableObject } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import type { AppLoadContext } from "react-router";
import type { WsMessage } from "~/hooks/use-ws-messages";
import type { AvailableModel } from "~/models/models";
import { ChunkAggregator } from "~/server/llm/chunk-aggregator";
import { selectModel } from "~/server/model-picker";
import * as schema from "../database/schema";
import { message } from "../database/schema";

export class MessagesDurableObject extends DurableObject<
  AppLoadContext["cloudflare"]["env"]
> {
  private db: DrizzleD1Database<typeof schema>;
  constructor(
    ctx: DurableObjectState,
    env: AppLoadContext["cloudflare"]["env"],
  ) {
    super(ctx, env);

    this.db = drizzle(env.DB, { schema });
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

  public async processStream(
    threadId: string,
    newMessageId: string,
    model: AvailableModel,
    prompts: CoreMessage[],
  ) {
    console.log("processStream", threadId, newMessageId, model, prompts);

    const llmModel = selectModel(this.env, model);

    const streamPromise = streamText({
      model: llmModel,
      system:
        "You are a helpful chat assistant. Answer in markdown format so that it's easier to render. When analyzing files, be thorough and provide detailed explanations.",
      messages: prompts,
    });

    let hasError = false;
    const chunkAggregator = new ChunkAggregator({ limit: 400 });
    const responseTypes: Record<string, number> = {};

    try {
      for await (const chunk of streamPromise.fullStream) {
        responseTypes[chunk.type] = (responseTypes[chunk.type] ?? 0) + 1;

        if (chunk.type === "text-delta") {
          chunkAggregator.append(chunk.textDelta);

          if (chunkAggregator.hasReachedLimit()) {
            const aggregatedChunk = chunkAggregator.getAggregateAndClear();
            await Promise.all([
              this.broadcast(
                JSON.stringify({
                  threadId,
                  id: newMessageId,
                  type: "text-delta",
                  delta: aggregatedChunk,
                  model,
                } satisfies WsMessage),
              ),
              this.db.run(
                sql`update message set textContent = coalesce(textContent, '') || ${aggregatedChunk} where id = ${newMessageId}`,
              ),
            ]);
          }
        } else if (chunk.type === "error") {
          console.error("error chunk:", chunk.error);
          if (chunk.error instanceof APICallError && chunk.error.responseBody) {
            const response: { error?: { message?: string } } = JSON.parse(
              chunk.error.responseBody,
            );
            if (response.error?.message) {
              const fieldError = `> Error: ${response.error.message}\n`;
              await Promise.all([
                this.broadcast(
                  JSON.stringify({
                    threadId,
                    id: newMessageId,
                    type: "text-delta",
                    delta: fieldError,
                    model,
                  } satisfies WsMessage),
                ),
                this.db.run(
                  sql`update message set textContent = coalesce(textContent, '') || ${fieldError} where id = ${newMessageId}`,
                ),
              ]);
            }
          }
        }
      }

      const lastChunk = chunkAggregator.getAggregateAndClear();
      await Promise.all([
        this.broadcast(
          JSON.stringify({
            threadId,
            id: newMessageId,
            type: "last-chunk",
            delta: lastChunk,
            model,
          } satisfies WsMessage),
        ),
        lastChunk.length > 0
          ? this.db.run(
              sql`update message set textContent = coalesce(textContent, '') || ${lastChunk} where id = ${newMessageId}`,
            )
          : Promise.resolve(),
      ]);
      console.log("done finished");
    } catch (err) {
      hasError = true;
      console.error("Error while streaming LLM response:", err);
      await Promise.all([
        this.db
          .update(message)
          .set({ status: "error", textContent: "An error occurred." })
          .where(eq(message.id, newMessageId)),
        this.broadcast(
          JSON.stringify({
            threadId,
            id: newMessageId,
            type: "error",
          } satisfies WsMessage),
        ),
      ]);
    } finally {
      if (!hasError) {
        await this.db
          .update(message)
          .set({ status: "done" })
          .where(eq(message.id, newMessageId));
      }
      console.log("llm response types", responseTypes);
    }
  }

  private async broadcast(message: string) {
    for (const connection of this.ctx.getWebSockets()) {
      connection.send(message);
    }
  }
}
