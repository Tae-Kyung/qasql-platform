import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { User } from "@supabase/supabase-js";

type AuthedHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  user: User
) => Promise<NextResponse>;

export function withAuth(handler: AuthedHandler) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
    const cookieStore = await cookies();

    // Authorization: Bearer <token> 우선 처리 (API 클라이언트용)
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
        global: bearerToken
          ? { headers: { Authorization: `Bearer ${bearerToken}` } }
          : undefined,
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser(bearerToken ?? undefined);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    return handler(req, context, user);
  };
}
