import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";

export const hasFileInR2 = createServerFn()
  .inputValidator(
    v.object({
      fileId: v.pipe(v.string(), v.uuid()),
    }),
  )
  .handler(async ({ data }) => {
    const { getFileFromR2 } = await import("./files.server");

    try {
      await getFileFromR2(data.fileId);
      return true;
    } catch {
      return false;
    }
  });
