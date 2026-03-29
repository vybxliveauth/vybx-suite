import { createEdgeAuthMiddleware } from "@vybx/edge-auth";

export const middleware = createEdgeAuthMiddleware({
  publicPaths: ["/login"],
  allowedRoles: ["PROMOTER", "ADMIN", "SUPER_ADMIN"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
