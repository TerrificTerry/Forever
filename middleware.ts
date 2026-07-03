import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/setup", "/robots.txt"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }
  if (!request.cookies.get("spirit_session")) {
    const url = new URL("/login", request.url);
    if (!pathname.startsWith("/api/")) url.searchParams.set("next", pathname);
    return pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
