import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";

export const canSelectModel = createServerFn()
  .inputValidator(
    v.object({
      model: v.string(),
    }),
  )
  .handler(async ({ data }) => {
    const { selectModel } = await import("./model-picker.server");
    selectModel(data.model);
    return true;
  });
