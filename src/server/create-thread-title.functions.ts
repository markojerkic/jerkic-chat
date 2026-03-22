import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { createThreadTitle as createThreadTitleImpl } from "./create-thread-title.server";

export const createThreadTitle = createServerFn()
  .inputValidator(
    v.object({
      prompt: v.string(),
    }),
  )
  .handler(async ({ data }) => createThreadTitleImpl(data.prompt));
