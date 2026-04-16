import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/reset-password",
  "/update-password",
];

const API_V1_PATH = "/api/v1/";

function addCorsHeaders(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 외부 공개 API — CORS 헤더 추가 후 통과 (Bearer 검증은 Route 내부)
  if (pathname.startsWith(API_V1_PATH)) {
    if (request.method === "OPTIONS") {
      return addCorsHeaders(new NextResponse(null, { status: 204 }));
    }
    return addCorsHeaders(NextResponse.next());
  }

  const { supabaseResponse, user } = await updateSession(request);

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublicPath && !pathname.startsWith("/api/")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
