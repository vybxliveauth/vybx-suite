import { describe, it, expect } from "vitest";
import {
  resolveAdminPermissions,
  resolveAdminRequiredPermissionForPath,
  ADMIN_ALL_PERMISSIONS,
  ADMIN_DEFAULT_PERMISSIONS,
} from "../../packages/permissions/src/index";

describe("resolveAdminPermissions", () => {
  it("SUPER_ADMIN gets all permissions", () => {
    const perms = resolveAdminPermissions("SUPER_ADMIN", undefined);
    for (const p of ADMIN_ALL_PERMISSIONS) {
      expect(perms.has(p)).toBe(true);
    }
  });

  it("ADMIN gets default permissions", () => {
    const perms = resolveAdminPermissions("ADMIN", undefined);
    for (const p of ADMIN_DEFAULT_PERMISSIONS) {
      expect(perms.has(p)).toBe(true);
    }
  });

  it("ADMIN does not get users:manage by default", () => {
    const perms = resolveAdminPermissions("ADMIN", undefined);
    expect(perms.has("users:manage")).toBe(false);
  });

  it("returns empty set for unknown role", () => {
    const perms = resolveAdminPermissions("BUYER" as any, undefined);
    expect(perms.size).toBe(0);
  });

  it("returns empty set for null user", () => {
    const perms = resolveAdminPermissions(undefined, undefined);
    expect(perms.size).toBe(0);
  });

  it("respects custom permissions array when provided", () => {
    const custom: ("events:view" | "sales:view")[] = ["events:view", "sales:view"];
    const perms = resolveAdminPermissions("ADMIN", custom);
    expect(perms.has("events:view")).toBe(true);
    expect(perms.has("sales:view")).toBe(true);
    // Should NOT include permissions not in custom array
    expect(perms.has("users:manage")).toBe(false);
    expect(perms.has("security:manage")).toBe(false);
  });
});

describe("resolveAdminRequiredPermissionForPath", () => {
  it("returns dashboard:view for /dashboard", () => {
    expect(resolveAdminRequiredPermissionForPath("/dashboard")).toBe("dashboard:view");
  });

  it("returns events:view for /events", () => {
    expect(resolveAdminRequiredPermissionForPath("/events")).toBe("events:view");
  });

  it("returns events:view for /events/:id", () => {
    expect(resolveAdminRequiredPermissionForPath("/events/some-uuid")).toBe("events:view");
  });

  it("returns promoters:view for /promoters", () => {
    expect(resolveAdminRequiredPermissionForPath("/promoters")).toBe("promoters:view");
  });

  it("returns sales:view for /sales", () => {
    expect(resolveAdminRequiredPermissionForPath("/sales")).toBe("sales:view");
  });

  it("returns refunds:view for /refunds", () => {
    expect(resolveAdminRequiredPermissionForPath("/refunds")).toBe("refunds:view");
  });

  it("returns null/undefined for unknown paths", () => {
    const result = resolveAdminRequiredPermissionForPath("/unknown-page");
    expect(result == null || result === undefined).toBe(true);
  });
});
