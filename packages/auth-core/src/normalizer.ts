import type { SessionUserBase } from "./types";

/**
 * Returns a function that safely validates and normalizes a raw unknown value
 * into a typed SessionUserBase, or null if validation fails.
 * Works in any JS environment (browser, React Native, Node).
 */
export function createSessionUserNormalizer<TRole extends string>(
  validRoles: readonly TRole[],
) {
  const roleSet = new Set<TRole>(validRoles);

  return (input: unknown): SessionUserBase<TRole> | null => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return null;
    }

    const raw = input as Partial<SessionUserBase<TRole>> & { id?: unknown };
    const userId =
      typeof raw.userId === "string"
        ? raw.userId
        : typeof raw.id === "string"
          ? raw.id
          : null;
    const email = typeof raw.email === "string" ? raw.email : null;
    const role = typeof raw.role === "string" ? raw.role : null;

    if (!userId || !email || !role || !roleSet.has(role as TRole)) {
      return null;
    }

    return {
      userId,
      email,
      role: role as TRole,
      firstName:
        typeof raw.firstName === "string" ? raw.firstName : undefined,
      lastName:
        typeof raw.lastName === "string" ? raw.lastName : undefined,
      profileImageUrl:
        typeof raw.profileImageUrl === "string"
          ? raw.profileImageUrl
          : undefined,
    };
  };
}
