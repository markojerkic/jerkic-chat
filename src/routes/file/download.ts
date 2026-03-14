import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { message, thread } from "~/database/schema";
import { validateSession } from "~/server/auth/lucia";
import type { Route } from "./+types/download";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const session = await validateSession(context, request);
  if (!session || !session.user) {
    throw redirect("/auth/login");
  }

  const storedMessage = await context.db
    .select({
      attachments: message.messageAttachemts,
      threadOwner: thread.owner,
    })
    .from(message)
    .innerJoin(thread, eq(message.thread, thread.id))
    .where(eq(message.id, params.messageId))
    .limit(1)
    .then((m) => m?.[0]);

  if (storedMessage?.threadOwner !== session.user.id) {
    throw Response.json(
      { message: "You are not the owner of this thread" },
      { status: 403 },
    );
  }

  const attachment = storedMessage?.attachments?.find(
    (a) => a.id === params.fileId,
  );
  if (!attachment) {
    throw Response.json({ message: "File not found" }, { status: 404 });
  }

  const object = await context.cloudflare.env.upload_files.get(params.fileId);
  if (!object) {
    throw Response.json({ message: "File not found" }, { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set(
    "content-disposition",
    `attachment; filename=${attachment.fileName}`,
  );

  return new Response(object.body, {
    headers,
  });
}
