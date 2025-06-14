import * as v from "valibot";
import type { Route } from "./+types/upload";

const fileSchema = v.object({
  fileId: v.pipe(v.string(), v.uuid()),
  messageId: v.pipe(v.string(), v.uuid()),
  file: v.file(),
});

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const file = v.parse(fileSchema, Object.fromEntries(formData.entries()));
  console.log("form data", file);
}
