import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { selectModel } from "./model-picker.server";

export const canSelectModel = createServerFn()
  .inputValidator(
    v.object({
      model: v.string(),
    }),
  )
  .handler(async ({ data }) => {
    selectModel(data.model);
    return true;
  });
