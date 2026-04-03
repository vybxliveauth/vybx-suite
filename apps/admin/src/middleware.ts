import { createEdgeAuthMiddleware } from "@vybx/edge-auth";

export const middleware = createEdgeAuthMiddleware({
  publicPaths: ["/login"],
  allowedRoles: ["ADMIN", "SUPER_ADMIN"],
  // Access token is short-lived; allow client-side refresh hydration on hard reloads.
  allowMissingAccessToken: true,
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
