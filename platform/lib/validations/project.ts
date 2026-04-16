import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "프로젝트 이름을 입력하세요")
    .max(100, "이름은 100자 이하여야 합니다"),
  description: z
    .string()
    .max(500, "설명은 500자 이하여야 합니다")
    .optional(),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, "프로젝트 이름을 입력하세요")
    .max(100, "이름은 100자 이하여야 합니다")
    .optional(),
  description: z
    .string()
    .max(500, "설명은 500자 이하여야 합니다")
    .optional(),
  status: z.enum(["draft", "active", "error"]).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
