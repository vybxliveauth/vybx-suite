import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type EdgeAuthMiddlewareOptions = {
  publicPaths?: readonly string[];
  allowedRoles?: readonly string[];
  accessTokenCookieName?: string;
  allowMissingAccessToken?: boolean;
  loginPath?: string;
  nextParamName?: string;
};

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

type JwtClaims = { role?: unknown; exp?: unknown };

function parseAccessToken(token: string): JwtClaims | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    return JSON.parse(decodeBase64Url(payloadPart)) as JwtClaims;
  } catch {
    return null;
  }
}

function isTokenExpired(claims: JwtClaims): boolean {
  if (typeof claims.exp !== "number") return false;
  // 30-second leeway to account for clock skew
  return claims.exp < Math.floor(Date.now() / 1000) - 30;
}

function getRoleFromAccessToken(token: string): string | null {
  const claims = parseAccessToken(token);
  if (!claims) return null;
  return typeof claims.role === "string" ? claims.role : null;
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
  const allowMissingAccessToken = options.allowMissingAccessToken ?? false;
  const loginPath = options.loginPath ?? "/login";
  const nextParamName = options.nextParamName ?? "next";

  return function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (isPublicPath(pathname, publicPaths) || isStaticPath(pathname)) {
      return NextResponse.next();
    }

    const accessToken = request.cookies.get(accessTokenCookieName)?.value;
    if (!accessToken) {
      if (allowMissingAccessToken) {
        return NextResponse.next();
      }
      return buildLoginRedirect(request, pathname, loginPath, nextParamName);
    }

    const claims = parseAccessToken(accessToken);
    if (!claims || isTokenExpired(claims)) {
      return buildLoginRedirect(request, pathname, loginPath, nextParamName);
    }

    if (allowedRoles.size > 0) {
      const role = typeof claims.role === "string" ? claims.role : null;
      if (!role || !allowedRoles.has(role)) {
        return buildLoginRedirect(request, pathname, loginPath, nextParamName);
      }
    }

    return NextResponse.next();
  };
}

export { parseAccessToken, isTokenExpired };
