import { createEdgeAuthMiddleware } from "@vybx/edge-auth";

export const middleware = createEdgeAuthMiddleware({
  publicPaths: ["/login"],
  // Any authenticated user can access the staff app — canScan is enforced
  // per-event by the backend (/event-staff/my-events filters by assignment)
  allowedRoles: ["USER", "PROMOTER", "ADMIN", "SUPER_ADMIN"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
