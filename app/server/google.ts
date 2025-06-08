import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, smoothStream, streamText } from "ai";
import { asc, eq, isNotNull } from "drizzle-orm";
import type { AppLoadContext } from "react-router";
import { uuidv7 } from "uuidv7";
import * as v from "valibot";
import { message } from "~/database/schema";

const chatSchema = v.object({
  q: v.pipe(v.string(), v.minLength(1)),
});

export async function getGeminiRespose(
  ctx: AppLoadContext,
  threadId: string,
  formData: FormData,
  shouldFetchContext = true
) {
  const { q } = v.parse(chatSchema, Object.fromEntries(formData.entries()));
  const apiKey = ctx.cloudflare.env.GEMINI_API_KEY;
  const google = createGoogleGenerativeAI({
    apiKey,
  });

  ctx.cloudflare.ctx.waitUntil(
    ctx.db.insert(message).values({
      id: uuidv7(),
      sender: "user",
      thread: threadId,
      textContent: q,
    })
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
      .where((m) => isNotNull(m.message))
      .orderBy((m) => asc(m.id))
      .then((messages) =>
        messages.map(
          (m) =>
            `${m.sender === "user" ? "Question" : "Answer"}: ${m.message}\n`
        )
      );

    prompt = `${context}Question: ${q}


Please answer the last question with the context in mind. no need to prefix with Question:
`;
  }

  const newMessageId = uuidv7();
  const response = await ctx.db
    .insert(message)
    .values({
      id: newMessageId,
      sender: "llm",
      thread: threadId,
    })
    .returning({ id: message.id });
  console.log("created stub", response[0].id);
  const id = ctx.cloudflare.env.WEBSOCKET_SERVER.idFromName("default");
  const stub = ctx.cloudflare.env.WEBSOCKET_SERVER.get(id);

  let llmResponse = "";
  const streamPromise = streamText({
    model: google("gemini-2.0-flash-lite"),
    prompt,
    experimental_transform: smoothStream(),
    onError(err) {
      console.error("failed generating", err);
    },
    onChunk(chunk) {
      console.log("chunk", chunk);
    },
    onFinish(finishResult) {
      console.log("finished", finishResult);
      llmResponse = finishResult.text;
    },
  });

  for await (const chunk of streamPromise.fullStream) {
    console.log("chunk iz await", chunk);
    stub.broadcast(JSON.stringify({ chunk: chunk }));
  }
  ctx.db
    .update(message)
    .set({ textContent: llmResponse })
    .where(eq(message.id, newMessageId));

  return newMessageId;
}
