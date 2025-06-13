import { and, eq, sql } from "drizzle-orm";
import type { AppLoadContext } from "react-router";
import { redirect } from "react-router";
import * as v from "valibot";
import { message, thread } from "~/database/schema";

export const deleteThreadSchema = v.object({
  threadId: v.pipe(v.string(), v.uuid()),
  currentViewingThreadId: v.pipe(v.string(), v.uuid()),
});
export type DeleteThreadSchema = v.InferOutput<typeof deleteThreadSchema>;

const deleteRequestSchema = v.pipeAsync(
  v.promise(),
  v.awaitAsync(),
  deleteThreadSchema,
);

export async function createThreadIfNotExists(
  ctx: AppLoadContext,
  threadId: string,
  userId: string,
  title: string,
) {
  return ctx.db.run(sql`INSERT INTO
        thread (id, title, owner)
        VALUES (${threadId}, ${title}, ${userId})
        ON CONFLICT DO NOTHING
    `);
}

export async function deleteThread(
  ctx: AppLoadContext,
  request: Request,
  userId: string,
) {
  const { threadId, currentViewingThreadId } = await v.parseAsync(
    deleteRequestSchema,
    request.formData().then((fd) => Object.fromEntries(fd.entries())),
  );

  const foundThread = await ctx.db.query.thread.findFirst({
    where: (fields, { eq }) =>
      and(eq(fields.id, threadId), eq(fields.owner, userId)),
  });

  if (!foundThread) {
    throw Response.json({ message: "Thread not found" }, { status: 404 });
  }
  if (foundThread.owner !== userId) {
    throw Response.json(
      { message: "You are not the owner of this thread" },
      { status: 403 },
    );
  }

  await ctx.db.delete(message).where(eq(message.thread, threadId));
  await ctx.db.delete(thread).where(eq(thread.id, threadId));

  if (threadId === currentViewingThreadId) {
    throw redirect("/");
  }
}
