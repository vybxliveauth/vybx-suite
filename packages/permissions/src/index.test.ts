import { describe, it, expect } from "vitest";
import {
  resolveAdminPermissions,
  resolveAdminRequiredPermissionForPath,
  normalizeAdminPermissionClaims,
  resolvePromoterPermissions,
  normalizePromoterPermissionClaims,
  resolvePromoterRequiredPermissionForPath,
  ADMIN_ALL_PERMISSIONS,
  ADMIN_DEFAULT_PERMISSIONS,
  PROMOTER_ALL_PERMISSIONS,
} from "./index";

// ─── Admin Permissions ──────────────────────────────────────────────────────

describe("resolveAdminPermissions", () => {
  it("grants all permissions to SUPER_ADMIN", () => {
    const perms = resolveAdminPermissions("SUPER_ADMIN");
    for (const p of ADMIN_ALL_PERMISSIONS) {
      expect(perms.has(p)).toBe(true);
    }
  });

  it("grants default (non-manage) permissions to ADMIN", () => {
    const perms = resolveAdminPermissions("ADMIN");
    for (const p of ADMIN_DEFAULT_PERMISSIONS) {
      expect(perms.has(p)).toBe(true);
    }
    // ADMIN should NOT have users:manage or security:manage
    expect(perms.has("users:manage")).toBe(false);
    expect(perms.has("security:manage")).toBe(false);
  });

  it("grants nothing to USER role", () => {
    const perms = resolveAdminPermissions("USER");
    expect(perms.size).toBe(0);
  });

  it("grants nothing to PROMOTER role", () => {
    const perms = resolveAdminPermissions("PROMOTER");
    expect(perms.size).toBe(0);
  });

  it("returns empty set for null/undefined role", () => {
    expect(resolveAdminPermissions(null).size).toBe(0);
    expect(resolveAdminPermissions(undefined).size).toBe(0);
  });

  it("uses grantedPermissions when provided, ignoring role-based defaults", () => {
    const perms = resolveAdminPermissions("USER", ["dashboard:view", "events:view"]);
    expect(perms.size).toBe(2);
    expect(perms.has("dashboard:view")).toBe(true);
    expect(perms.has("events:view")).toBe(true);
  });

  it("filters out invalid permission strings in grantedPermissions", () => {
    const perms = resolveAdminPermissions("USER", [
      "dashboard:view",
      "not:a:real:permission",
      123 as unknown as string,
      null as unknown as string,
    ]);
    expect(perms.size).toBe(1);
    expect(perms.has("dashboard:view")).toBe(true);
  });
});

describe("normalizeAdminPermissionClaims", () => {
  it("returns empty array for non-array input", () => {
    expect(normalizeAdminPermissionClaims(null)).toEqual([]);
    expect(normalizeAdminPermissionClaims("dashboard:view")).toEqual([]);
    expect(normalizeAdminPermissionClaims(42)).toEqual([]);
    expect(normalizeAdminPermissionClaims({})).toEqual([]);
  });

  it("filters valid permissions from mixed array", () => {
    const result = normalizeAdminPermissionClaims([
      "dashboard:view",
      "garbage",
      "events:view",
      "",
      undefined,
    ]);
    expect(result).toEqual(["dashboard:view", "events:view"]);
  });
});

// ─── Path Routing ───────────────────────────────────────────────────────────

describe("resolveAdminRequiredPermissionForPath", () => {
  it("maps root to dashboard:view", () => {
    expect(resolveAdminRequiredPermissionForPath("/")).toBe("dashboard:view");
  });

  it("maps /login to null (public)", () => {
    expect(resolveAdminRequiredPermissionForPath("/login")).toBeNull();
    expect(resolveAdminRequiredPermissionForPath("/login/callback")).toBeNull();
  });

  it("maps known paths to correct permissions", () => {
    const cases: [string, string][] = [
      ["/dashboard", "dashboard:view"],
      ["/events", "events:view"],
      ["/events/new", "events:create"],
      ["/events/abc123/edit", "events:edit"],
      ["/events/abc123", "events:view"],
      ["/promoters", "promoters:view"],
      ["/payouts", "payouts:view"],
      ["/sales", "sales:view"],
      ["/revenue-ops", "sales:view"],
      ["/refunds", "refunds:view"],
      ["/users", "users:view"],
      ["/security", "security:view"],
      ["/audit", "audit:view"],
      ["/staff", "staff:view"],
      ["/settings", "settings:view"],
      ["/categories", "settings:view"],
    ];
    for (const [path, expected] of cases) {
      expect(resolveAdminRequiredPermissionForPath(path)).toBe(expected);
    }
  });

  it("returns null for unknown paths", () => {
    expect(resolveAdminRequiredPermissionForPath("/unknown")).toBeNull();
    expect(resolveAdminRequiredPermissionForPath("/api/health")).toBeNull();
  });
});

// ─── Promoter Permissions ───────────────────────────────────────────────────

describe("resolvePromoterPermissions", () => {
  it("grants all promoter permissions to PROMOTER role", () => {
    const perms = resolvePromoterPermissions("PROMOTER");
    for (const p of PROMOTER_ALL_PERMISSIONS) {
      expect(perms.has(p)).toBe(true);
    }
  });

  it("also grants full permissions to ADMIN and SUPER_ADMIN", () => {
    const admin = resolvePromoterPermissions("ADMIN");
    const superAdmin = resolvePromoterPermissions("SUPER_ADMIN");
    expect(admin.size).toBe(PROMOTER_ALL_PERMISSIONS.length);
    expect(superAdmin.size).toBe(PROMOTER_ALL_PERMISSIONS.length);
  });

  it("grants nothing to USER role", () => {
    expect(resolvePromoterPermissions("USER").size).toBe(0);
  });

  it("uses grantedPermissions when provided", () => {
    const perms = resolvePromoterPermissions("USER", ["dashboard:view"]);
    expect(perms.size).toBe(1);
  });
});

describe("normalizePromoterPermissionClaims", () => {
  it("filters valid promoter permissions", () => {
    const result = normalizePromoterPermissionClaims([
      "dashboard:view",
      "users:manage", // admin-only, not in promoter set
      "events:create",
    ]);
    expect(result).toEqual(["dashboard:view", "events:create"]);
  });
});

describe("resolvePromoterRequiredPermissionForPath", () => {
  it("maps root/login correctly", () => {
    expect(resolvePromoterRequiredPermissionForPath("/")).toBe("dashboard:view");
    expect(resolvePromoterRequiredPermissionForPath("/login")).toBeNull();
    expect(resolvePromoterRequiredPermissionForPath("/login/callback")).toBeNull();
  });

  it("maps promoter routes to expected permissions", () => {
    const cases: [string, string][] = [
      ["/dashboard", "dashboard:view"],
      ["/events", "events:view"],
      ["/events/new", "events:create"],
      ["/events/abc/edit", "events:edit"],
      ["/events/abc", "events:view"],
      ["/sales", "sales:view"],
      ["/refunds", "refunds:view"],
      ["/staff", "staff:view"],
      ["/scan/evt-1", "staff:view"],
      ["/settings", "settings:view"],
    ];
    for (const [path, expected] of cases) {
      expect(resolvePromoterRequiredPermissionForPath(path)).toBe(expected);
    }
  });

  it("returns null for unknown paths", () => {
    expect(resolvePromoterRequiredPermissionForPath("/unknown")).toBeNull();
    expect(resolvePromoterRequiredPermissionForPath("/api/health")).toBeNull();
  });
});
