import { z } from "zod";
import { emailSchema, nameSchema, phoneSchema } from "./common";

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Register ─────────────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    firstName: nameSchema("First name"),
    lastName: nameSchema("Last name"),
    email: emailSchema,
    phone: phoneSchema,
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^a-zA-Z0-9]/,
        "Password must contain at least one special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Password Reset ───────────────────────────────────────────────────────────

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^a-zA-Z0-9]/, "Must contain at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─── Passkeys / WebAuthn ─────────────────────────────────────────────────────

export const passkeyRegistrationOptionsRequestSchema = z.object({
  email: emailSchema,
});

export const passkeyRegistrationVerifySchema = z.object({
  email: emailSchema,
  credential: z.object({
    id: z.string().min(1),
    rawId: z.string().min(1),
    type: z.literal("public-key"),
    response: z.object({
      attestationObject: z.string().min(1),
      clientDataJSON: z.string().min(1),
    }),
  }),
});

export const passkeyAuthenticationVerifySchema = z.object({
  credential: z.object({
    id: z.string().min(1),
    rawId: z.string().min(1),
    type: z.literal("public-key"),
    response: z.object({
      authenticatorData: z.string().min(1),
      clientDataJSON: z.string().min(1),
      signature: z.string().min(1),
      userHandle: z.string().optional(),
    }),
  }),
});

export type PasskeyRegistrationOptionsRequest = z.infer<typeof passkeyRegistrationOptionsRequestSchema>;
export type PasskeyRegistrationVerify = z.infer<typeof passkeyRegistrationVerifySchema>;
export type PasskeyAuthenticationVerify = z.infer<typeof passkeyAuthenticationVerifySchema>;
