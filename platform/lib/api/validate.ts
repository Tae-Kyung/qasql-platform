import { NextResponse } from "next/server";
import { ZodSchema } from "zod";

export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown
): { data: T; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const messages = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
    return {
      data: null,
      error: NextResponse.json(
        { success: false, error: "BAD_REQUEST", message: messages.join(", ") },
        { status: 400 }
      ),
    };
  }
  return { data: result.data, error: null };
}
