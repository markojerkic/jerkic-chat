import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
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
  formData: FormData
) {
  const { q } = v.parse(chatSchema, Object.fromEntries(formData.entries()));
  const apiKey = ctx.cloudflare.env.GEMINI_API_KEY;
  const google = createGoogleGenerativeAI({
    apiKey,
  });

  ctx.db.insert(message).values({
    id: uuidv7(),
    sender: "user",
    thread: threadId,
    textContent: q,
  });

  const { text } = await generateText({
    model: google("gemini-2.0-flash-lite"),
    prompt: q,
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
