import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type EdgeAuthMiddlewareOptions = {
  publicPaths?: readonly string[];
  allowedRoles?: readonly string[];
  accessTokenCookieName?: string;
  loginPath?: string;
  nextParamName?: string;
};

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

function getRoleFromAccessToken(token: string): string | null {
  try {
    const parts = token.split(".");
    const payloadPart = parts[1];
    if (!payloadPart) return null;
    const payload = JSON.parse(decodeBase64Url(payloadPart)) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function isStaticPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

function isPublicPath(pathname: string, publicPaths: readonly string[]): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function buildLoginRedirect(
  request: NextRequest,
  pathname: string,
  loginPath: string,
  nextParamName: string,
) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = loginPath;
  loginUrl.searchParams.set(nextParamName, pathname);
  return NextResponse.redirect(loginUrl);
}

export function createEdgeAuthMiddleware(options: EdgeAuthMiddlewareOptions = {}) {
  const publicPaths = options.publicPaths ?? ["/login"];
  const allowedRoles = new Set(options.allowedRoles ?? []);
  const accessTokenCookieName = options.accessTokenCookieName ?? "access_token";
  const loginPath = options.loginPath ?? "/login";
  const nextParamName = options.nextParamName ?? "next";

  return function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (isPublicPath(pathname, publicPaths) || isStaticPath(pathname)) {
      return NextResponse.next();
    }

    const accessToken = request.cookies.get(accessTokenCookieName)?.value;
    if (!accessToken) {
      return buildLoginRedirect(request, pathname, loginPath, nextParamName);
    }

    if (allowedRoles.size > 0) {
      const role = getRoleFromAccessToken(accessToken);
      if (!role || !allowedRoles.has(role)) {
        return buildLoginRedirect(request, pathname, loginPath, nextParamName);
      }
    }

    return NextResponse.next();
  };
}
