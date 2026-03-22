import * as v from "valibot";

export const messageMappingSchema = v.object({
  from: v.pipe(v.string(), v.uuid()),
  to: v.pipe(v.string(), v.uuid()),
});

export const branchRequestSchema = v.object({
  fromThreadId: v.pipe(v.string(), v.uuid()),
  newThreadId: v.pipe(v.string(), v.uuid()),
  mappings: v.array(messageMappingSchema),
});

export type BranchRequest = v.InferInput<typeof branchRequestSchema>;
