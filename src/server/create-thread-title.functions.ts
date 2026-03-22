import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";

export const createThreadTitle = createServerFn()
  .inputValidator(
    v.object({
      prompt: v.string(),
    }),
  )
  .handler(async ({ data }) => {
    const { createThreadTitle: createThreadTitleImpl } =
      await import("./create-thread-title.server");
    return createThreadTitleImpl(data.prompt);
  });
