import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { asc, isNotNull } from "drizzle-orm";
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

    prompt = `${context}Question: ${q}`;
  }

  console.log("generated prompt", prompt);

  const { text } = await generateText({
    model: google("gemini-2.0-flash-lite"),
    prompt,
  });

  const response = await ctx.db
    .insert(message)
    .values({
      id: uuidv7(),
      sender: "llm",
      textContent: text,
      thread: threadId,
    })
    .returning({ id: message.id });

  return response[0].id;
}
