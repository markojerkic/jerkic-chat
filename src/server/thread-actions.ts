import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/router-core";
import { and, eq, sql } from "drizzle-orm";
import * as v from "valibot";
import type { AppContext } from "~/app";
import { message, thread } from "~/database/schema";
import { authMiddleware } from "./auth/utils";

export const deleteThreadSchema = v.object({
  threadId: v.pipe(v.string(), v.uuid()),
  currentViewingThreadId: v.string(),
});
export type DeleteThreadSchema = v.InferOutput<typeof deleteThreadSchema>;

const deleteRequestSchema = v.pipeAsync(
  v.promise(),
  v.awaitAsync(),
  deleteThreadSchema,
);

export async function createThreadIfNotExists(
  ctx: AppContext,
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
  ctx: AppContext,
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
    throw redirect({ to: "/" });
  }
}

export const getUserThreads = createServerFn()
  .inputValidator(
    v.object({
      page: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
      size: v.optional(v.pipe(v.number(), v.minValue(30)), 30),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    return await context.db.query.thread.findMany({
      limit: data.size,
      offset: data.size * data.page,
    });
  });
