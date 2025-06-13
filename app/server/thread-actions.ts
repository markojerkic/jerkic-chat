import { and, sql } from "drizzle-orm";
import type { AppLoadContext } from "react-router";
import { redirect } from "react-router";
import * as v from "valibot";

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

  await ctx.db.transaction(async (tx) => {
    const thread = await tx.query.thread.findFirst({
      where: (fields, { eq }) =>
        and(eq(fields.id, threadId), eq(fields.owner, userId)),
    });

    if (!thread) {
      throw Response.json({ message: "Thread not found" }, { status: 404 });
    }
    if (thread.owner !== userId) {
      throw Response.json(
        { message: "You are not the owner of this thread" },
        { status: 403 },
      );
    }

    await tx.run(sql`
        DELETE FROM message WHERE thread = ${threadId};
        DELETE FROM thread WHERE id = ${threadId};
`);

    if (threadId === currentViewingThreadId) {
      throw redirect("/");
    }
  });
}
