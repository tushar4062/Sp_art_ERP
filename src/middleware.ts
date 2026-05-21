import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/admin-session";
import { SENIOR_TEACHER_SESSION_COOKIE } from "@/lib/auth/portal-session";
import { adminBatchPathFromSeniorPath } from "@/lib/batch/routes";

function hasAdminSession(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return Boolean(token && token.includes("."));
}

function hasSeniorSession(request: NextRequest): boolean {
  const id = request.cookies.get(SENIOR_TEACHER_SESSION_COOKIE)?.value;
  return Boolean(id && /^[a-f\d]{24}$/i.test(id));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/senior-teacher/batches") &&
    hasAdminSession(request) &&
    !hasSeniorSession(request)
  ) {
    const adminPath = adminBatchPathFromSeniorPath(pathname);
    if (adminPath) {
      const url = request.nextUrl.clone();
      url.pathname = adminPath;
      console.log("[middleware] admin session on senior batch URL → redirect", pathname, "→", adminPath);
      return NextResponse.redirect(url);
    }
  }

  if (
    pathname.startsWith("/senior-teacher") &&
    !pathname.startsWith("/senior-teacher/batches") &&
    hasAdminSession(request) &&
    !hasSeniorSession(request)
  ) {
    console.log("[middleware] admin-only session on senior-teacher route → /admin", pathname);
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/senior-teacher/batches/:path*", "/senior-teacher/:path*"],
};
