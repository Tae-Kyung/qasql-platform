import { z } from "zod";

const ollamaSchema = z.object({
  llm_provider: z.literal("ollama"),
  llm_model: z.string().min(1, "모델명을 입력하세요"),
  llm_base_url: z
    .string()
    .url("올바른 URL을 입력하세요")
    .default("http://localhost:11434"),
  llm_api_key: z.string().optional(),
});

const anthropicSchema = z.object({
  llm_provider: z.literal("anthropic"),
  llm_model: z.string().min(1, "모델명을 입력하세요"),
  llm_api_key: z.string().optional(),
  llm_base_url: z.string().optional(),
});

const openaiSchema = z.object({
  llm_provider: z.literal("openai"),
  llm_model: z.string().min(1, "모델명을 입력하세요"),
  llm_api_key: z.string().optional(),
  llm_base_url: z.string().optional(),
});

export const llmConfigSchema = z.discriminatedUnion("llm_provider", [
  ollamaSchema,
  anthropicSchema,
  openaiSchema,
]);

export type LlmConfigInput = z.infer<typeof llmConfigSchema>;
