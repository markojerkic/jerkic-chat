import { GoogleGenAI, Modality } from "@google/genai";
import { smoothStream, streamText, tool } from "ai";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import type { AppLoadContext } from "react-router";
import * as v from "valibot";
import z from "zod";
import { chatSchema } from "~/components/thread";
import { message } from "~/database/schema";
import type { WsMessage } from "~/hooks/use-ws-messages";
import { createThreadTitle } from "./create-thread-title";
import { ChunkAggregator } from "./llm/chunk-aggregator";
import { selectModel } from "./model-picker";
import { createThreadIfNotExists } from "./thread-actions";

const requestSchema = v.pipeAsync(v.promise(), v.awaitAsync(), chatSchema);

export async function getLlmRespose(
  ctx: AppLoadContext,
  request: Request,
  threadId: string,
  userId: string,
  shouldFetchContext = true,
) {
  const {
    q,
    id: newMessageId,
    userMessageId,
    newThread,
    model,
  } = await v.parseAsync(
    requestSchema,
    request.formData().then((fd) => Object.fromEntries(fd.entries())),
  );

  const llmModel = selectModel(ctx, model);

  if (newThread) {
    const title = await createThreadTitle(ctx, q);
    await createThreadIfNotExists(ctx, threadId, userId, title);
  }

  ctx.cloudflare.ctx.waitUntil(
    ctx.db.insert(message).values({
      id: userMessageId,
      sender: "user",
      thread: threadId,
      textContent: q,
      model,
      status: "done",
    }),
  );

  let prompt = q;

  if (shouldFetchContext) {
    const context = await ctx.db
      .select({
        id: message.id,
        message: message.textContent,
        sender: message.sender,
      })
      .from(message)
      .where((m) => and(isNotNull(m.message), eq(message.thread, threadId)))
      .orderBy((m) => asc(m.id))
      .then((messages) =>
        messages.map(
          (m) =>
            `${m.sender === "user" ? "Question" : "Answer"}: ${m.message}\n`,
        ),
      );

    prompt = `${context}Question: ${q}\n\nPlease answer the last question with the context in mind. no need to prefix with Question:\n`;
  }

  await ctx.db
    .insert(message)
    .values({
      id: newMessageId,
      sender: "llm",
      thread: threadId,
      model,
      status: "streaming",
    })
    .returning({ id: message.id });
  const id = ctx.cloudflare.env.WEBSOCKET_SERVER.idFromName(userId);
  const stub = ctx.cloudflare.env.WEBSOCKET_SERVER.get(id);

  const streamPromise = streamText({
    model: llmModel,
    prompt,
    experimental_transform: smoothStream(),
    tools: {
      experimental_generateImage: tool({
        description: "Generate image",
        parameters: z.object({
          prompt: z.string().describe(q),
        }),
        execute: async ({ prompt }) => {
          const ai = new GoogleGenAI({
            apiKey: ctx.cloudflare.env.GEMINI_API_KEY,
          });
          const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-preview-image-generation",
            contents: prompt,
            config: {
              responseModalities: [Modality.IMAGE],
            },
          });
          if (!response.candidates) {
            return { prompt: "Not success", image: null };
          }

          for (const part of response.candidates[0].content?.parts ?? []) {
            // Based on the part type, either show the text or save the image
            if (part.text) {
              console.log("text part", part.text);
            } else if (part.inlineData) {
              const imageData = part.inlineData.data ?? "";
              const buffer = Buffer.from(imageData, "base64");
              console.log("generated image", buffer);
              return { image: buffer, prompt };
            }
          }

          // in production, save this image to blob storage and return a URL
          return { image: null, prompt };
        },
      }),
    },
  });

  const processStream = async () => {
    let fullResponse = "";
    let hasError = false;

    const wsAggregator = new ChunkAggregator({ limit: 512 });
    const dbAggregator = new ChunkAggregator({ limit: 2048 });

    const responseTypes: Record<string, number> = {};
    try {
      for await (const chunk of streamPromise.fullStream) {
        responseTypes[chunk.type] = (responseTypes[chunk.type] ?? 0) + 1;
        if (chunk.type === "text-delta") {
          const delta = chunk.textDelta;
          fullResponse += delta;

          wsAggregator.append(delta);
          dbAggregator.append(delta);

          if (wsAggregator.hasReachedLimit()) {
            const wsChunk = wsAggregator.getAggregateAndClear();
            stub.broadcast(
              JSON.stringify({
                threadId,
                id: newMessageId,
                type: "text-delta",
                delta: wsChunk,
                model,
              } satisfies WsMessage),
            );
          }

          if (dbAggregator.hasReachedLimit()) {
            const dbChunk = dbAggregator.getAggregateAndClear();
            await ctx.db.run(
              sql`update message set textContent = coalesce(textContent, '') || ${dbChunk} where id = ${newMessageId}`,
            );
          }
        }
      }

      const lastChunk = wsAggregator.getAggregateAndClear();
      if (lastChunk.length > 0) {
        stub
          .broadcast(
            JSON.stringify({
              threadId,
              id: newMessageId,
              type: "last-chunk",
              delta: lastChunk,
              model,
            } satisfies WsMessage),
          )
          .then(() => console.log("done finished"))
          .catch((e) => console.error("failed sending broadcast", e));
      } else {
        stub.broadcast(
          JSON.stringify({
            threadId,
            id: newMessageId,
            type: "last-chunk",
            delta: "",
            model,
          } satisfies WsMessage),
        );
      }
    } catch (err) {
      hasError = true;
      console.error("Error while streaming LLM response:", err);
      await ctx.db
        .update(message)
        .set({ status: "error", textContent: "An error occurred." })
        .where(eq(message.id, newMessageId));

      stub.broadcast(
        JSON.stringify({
          threadId,
          id: newMessageId,
          type: "error",
        } satisfies WsMessage),
      );
    } finally {
      if (!dbAggregator.isEmpty()) {
        const finalDbChunk = dbAggregator.flush();
        await ctx.db.run(
          sql`update message set textContent = coalesce(textContent, '') || ${finalDbChunk} where id = ${newMessageId}`,
        );
      }

      if (!hasError) {
        await ctx.db
          .update(message)
          .set({ status: "done" })
          .where(eq(message.id, newMessageId));
      }

      console.log("llm response types", responseTypes);
    }
  };

  // Start processing the stream
  ctx.cloudflare.ctx.waitUntil(processStream());

  return { newMessageId, userMessageId };
}
