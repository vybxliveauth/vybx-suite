"use client";

import { useMemo } from "react";
import { getUser } from "./auth";
import { resolvePermissions, type Permission } from "./permissions";

export function usePermissions() {
  const user = getUser();

  const permissions = useMemo(() => resolvePermissions(user), [user]);

  const can = (p: Permission): boolean => permissions.has(p);

  return { can, permissions, user };
}
