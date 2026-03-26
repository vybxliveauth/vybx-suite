"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "./auth";
import type { Permission } from "./permissions";
import { resolvePermissions } from "./permissions";

const ALLOWED_ROLES = new Set(["PROMOTER", "ADMIN", "SUPER_ADMIN"]);

/**
 * Redirects to /login if:
 *  - user is not authenticated
 *  - user role is not PROMOTER / ADMIN / SUPER_ADMIN
 *
 * Optionally pass a `permission` to also redirect if the user
 * lacks that specific permission (useful for page-level guards).
 */
export function useAuthGuard(permission?: Permission) {
  const router = useRouter();

  useEffect(() => {
    const user = getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!ALLOWED_ROLES.has(user.role)) {
      router.replace("/login");
      return;
    }

    if (permission && !resolvePermissions(user).has(permission)) {
      router.replace("/dashboard");
    }
  }, [router, permission]);
}
