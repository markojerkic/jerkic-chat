import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import * as v from "valibot";

const chatSchema = v.object({
  q: v.pipe(v.string(), v.minLength(1)),
});

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.GEMINI_API_KEY,
});

export async function getGeminiRespose(formData: FormData) {
  const { q } = v.parse(chatSchema, Object.fromEntries(formData.entries()));

  const { text } = await generateText({
    model: google("gemini-2.0-flash-lite"),
    prompt: q,
  });

  return text;
}
