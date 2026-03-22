import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { getFileFromR2 } from "./files.server";

export const hasFileInR2 = createServerFn()
  .inputValidator(
    v.object({
      fileId: v.pipe(v.string(), v.uuid()),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await getFileFromR2(data.fileId);
      return true;
    } catch {
      return false;
    }
  });
