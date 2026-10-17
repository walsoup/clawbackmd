import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Default: demo mode — no auth. Avoid importing next/headers here.
  if ((process.env.DEMO_MODE ?? "true").toLowerCase() === "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Lazy-load only when magic-link auth is enabled
  const { createMiddlewareClient } = await import("@/lib/auth");
  const { supabase, getResponse } = createMiddlewareClient(request);
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return getResponse();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
