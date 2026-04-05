import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSessionUserNormalizer, formatDisplayName } from "./index";

// ─── createSessionUserNormalizer ────────────────────────────────────────────

const VALID_ROLES = ["USER", "PROMOTER", "ADMIN", "SUPER_ADMIN"] as const;
const normalize = createSessionUserNormalizer(VALID_ROLES);

describe("createSessionUserNormalizer", () => {
  it("normalizes a valid user object with userId", () => {
    const result = normalize({
      userId: "u1",
      email: "test@example.com",
      role: "USER",
      firstName: "John",
      lastName: "Doe",
    });
    expect(result).toEqual({
      userId: "u1",
      email: "test@example.com",
      role: "USER",
      firstName: "John",
      lastName: "Doe",
      profileImageUrl: undefined,
    });
  });

  it("falls back to id field when userId is missing", () => {
    const result = normalize({
      id: "u2",
      email: "test@example.com",
      role: "ADMIN",
    });
    expect(result?.userId).toBe("u2");
  });

  it("returns null for missing required fields", () => {
    expect(normalize(null)).toBeNull();
    expect(normalize(undefined)).toBeNull();
    expect(normalize([])).toBeNull();
    expect(normalize("string")).toBeNull();
    expect(normalize(42)).toBeNull();
    expect(normalize({})).toBeNull();
    expect(normalize({ userId: "u1" })).toBeNull(); // missing email, role
    expect(normalize({ userId: "u1", email: "a@b.c" })).toBeNull(); // missing role
  });

  it("returns null for invalid role", () => {
    const result = normalize({
      userId: "u1",
      email: "test@example.com",
      role: "HACKER",
    });
    expect(result).toBeNull();
  });

  it("strips non-string optional fields", () => {
    const result = normalize({
      userId: "u1",
      email: "test@example.com",
      role: "USER",
      firstName: 42,
      lastName: null,
      profileImageUrl: false,
    });
    expect(result?.firstName).toBeUndefined();
    expect(result?.lastName).toBeUndefined();
    expect(result?.profileImageUrl).toBeUndefined();
  });
});

// ─── formatDisplayName ──────────────────────────────────────────────────────

describe("formatDisplayName", () => {
  it("returns full name when both names exist", () => {
    expect(
      formatDisplayName(
        { firstName: "John", lastName: "Doe", email: "john@test.com" },
        "Unknown",
      ),
    ).toBe("John Doe");
  });

  it("returns first name only when lastName is missing", () => {
    expect(
      formatDisplayName(
        { firstName: "John", email: "john@test.com" },
        "Unknown",
      ),
    ).toBe("John");
  });

  it("falls back to email prefix when no names", () => {
    expect(
      formatDisplayName({ email: "john.doe@test.com" }, "Unknown"),
    ).toBe("john.doe");
  });

  it("returns fallback for null/undefined user", () => {
    expect(formatDisplayName(null, "Fallback")).toBe("Fallback");
    expect(formatDisplayName(undefined, "Fallback")).toBe("Fallback");
  });
});
