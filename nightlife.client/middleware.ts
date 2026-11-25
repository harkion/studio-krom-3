import { NextResponse } from "next/server";
import { statusResponse } from "./lib/status-response";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Show a maintenance page for public pages while keeping admin access available.
  if (
    process.env.NIGHT_LIGHT_MAINTENANCE === "true" &&
    !request.nextUrl.pathname.startsWith("/Admin") &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    return statusResponse(503);
  }

  // 1. Check if the user is trying to access the /Admin dashboard
  const isAdminRoute = request.nextUrl.pathname.startsWith("/Admin");
  const isLoginPage = request.nextUrl.pathname === "/Admin/login";

  if (isAdminRoute && !isLoginPage) {
    // 2. Look for the Supabase authentication cookie
    const hasAuthCookie = request.cookies
      .getAll()
      .some(
        (cookie) =>
          cookie.name.includes("sb-") && cookie.name.includes("-auth-token"),
      );

    // 3. If they don't have the cookie, kick them back to the login page
    if (!hasAuthCookie) {
      const loginUrl = new URL("/Admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. If everything is fine, let them proceed normally
  return NextResponse.next();
}

// 5. Tell Next.js which routes this middleware should run on
export const config = {
  matcher: [
    "/Admin/:path*",
    "/",
    "/street-view",
    "/ShareStory",
    "/map",
    "/stories",
  ],
};
