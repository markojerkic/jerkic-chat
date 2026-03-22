import { createServerFn } from "@tanstack/react-start";
import { requireCurrentUser } from "~/server/.server/auth/utils";

export const getCurrentUser = createServerFn().handler(async ({ context }) => {
  return requireCurrentUser(context);
});
