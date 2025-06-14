import type { Route } from "./+types/upload";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  console.log("form data", formData.keys());
}
