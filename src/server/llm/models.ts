import * as v from "valibot";

export const modelsSchema = v.array(
  v.object({
    name: v.string(),
    short_name: v.string(),
    slug: v.string(),
    author: v.string(),
  }),
);

export type Model = v.InferOutput<typeof modelsSchema>[number];
