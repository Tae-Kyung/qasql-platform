import { z } from "zod";

export const queryRequestSchema = z.object({
  question: z.string().min(1, "질문을 입력하세요").max(2000),
  hint: z.string().max(1000).optional(),
  execute: z.boolean().default(false),
  options: z
    .object({
      relevance_threshold: z.number().min(0).max(1).optional(),
      query_timeout: z.number().int().min(1).max(120).optional(),
    })
    .optional(),
});

export type QueryRequestInput = z.infer<typeof queryRequestSchema>;
