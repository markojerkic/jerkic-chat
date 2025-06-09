import type { AppLoadContext } from "react-router";
import { uuidv7 } from "uuidv7";
import { thread } from "~/database/schema";

export async function createThread(ctx: AppLoadContext) {
  const id = uuidv7();

  await ctx.db.insert(thread).values({
    id,
  });

  return id;
}
