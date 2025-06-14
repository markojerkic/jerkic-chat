import { redirect } from "react-router";
import * as v from "valibot";
import { validateSession } from "~/server/auth/lucia";
import type { Route } from "./+types/upload";

const fileSchema = v.object({
  fileId: v.pipe(v.string(), v.uuid()),
  messageId: v.pipe(v.string(), v.uuid()),
  file: v.file(),
});

export async function action({ request, context }: Route.ActionArgs) {
  const session = await validateSession(context, request);
  if (!session || !session.user) {
    throw redirect("/auth/login");
  }

  const formData = await request.formData();
  const file = v.parse(fileSchema, Object.fromEntries(formData.entries()));

  const response = await context.cloudflare.env.upload_files.put(
    file.fileId,
    file.file,
  );
  console.log("response", response);

  return response;
}
