"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Zap, Loader2 } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@vybx/ui";
import { api } from "@/lib/api";
import { setUser } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorNotice, setTwoFactorNotice] = useState<string | null>(null);
  const [verifyingTwoFactor, setVerifyingTwoFactor] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setVerificationNotice(null);
    setVerificationEmail(null);
    setTwoFactorNotice(null);
    try {
      const res = await api.post<
        | { user: AuthUser; success: boolean }
        | {
            success: false;
            requiresTwoFactor: true;
            challengeId: string;
            expiresInSeconds: number;
            message?: string;
          }
      >("/auth/login", values);

      if ("requiresTwoFactor" in res && res.requiresTwoFactor) {
        setTwoFactorChallengeId(res.challengeId);
        setTwoFactorCode("");
        setTwoFactorNotice(
          res.message ||
            `Código 2FA enviado. Expira en ${Math.max(1, Math.ceil(res.expiresInSeconds / 60))} min.`,
        );
        return;
      }

      if (!("user" in res)) {
        setServerError("No se pudo completar el inicio de sesión.");
        return;
      }

      if (res.user.role !== "PROMOTER" && res.user.role !== "ADMIN" && res.user.role !== "SUPER_ADMIN") {
        setServerError("Esta cuenta no tiene acceso al panel de promotor.");
        return;
      }

      setUser(res.user);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión";
      setServerError(message);
      if (message.toLowerCase().includes("verific")) {
        setVerificationEmail(values.email.trim().toLowerCase());
      }
    }
  }

  async function handleVerifyTwoFactor() {
    if (!twoFactorChallengeId) return;
    setServerError(null);
    setVerifyingTwoFactor(true);
    try {
      const res = await api.post<{ user: AuthUser; success: boolean }>("/auth/login/2fa", {
        challengeId: twoFactorChallengeId,
        code: twoFactorCode.trim(),
      });

      if (res.user.role !== "PROMOTER" && res.user.role !== "ADMIN" && res.user.role !== "SUPER_ADMIN") {
        setServerError("Esta cuenta no tiene acceso al panel de promotor.");
        return;
      }

      setUser(res.user);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Código 2FA inválido");
    } finally {
      setVerifyingTwoFactor(false);
    }
  }

  async function handleResendVerification() {
    if (!verificationEmail) return;
    setResendingVerification(true);
    setVerificationNotice(null);
    try {
      const response = await api.post<{ message?: string; success?: boolean }>("/auth/resend-verification", {
        email: verificationEmail,
      });
      setVerificationNotice(
        response?.message || "Te enviamos un nuevo correo de verificación."
      );
    } catch (err: unknown) {
      setVerificationNotice(
        err instanceof Error ? err.message : "No se pudo reenviar el correo de verificación."
      );
    } finally {
      setResendingVerification(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Zap className="size-6 text-primary fill-primary" />
          </div>
          <h1 className="text-xl font-bold">VybeTickets</h1>
          <p className="text-sm text-muted-foreground">Panel de promotor</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Iniciar sesión</CardTitle>
            <CardDescription>Accede con tu cuenta de promotor</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {serverError && (
                <p className="text-sm text-destructive rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  {serverError}
                </p>
              )}

              {verificationEmail && (
                <div className="space-y-2 rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                  <p className="text-xs text-amber-100">
                    Correo pendiente de verificación: <span className="font-medium">{verificationEmail}</span>
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={resendingVerification}
                    onClick={() => void handleResendVerification()}
                  >
                    {resendingVerification && <Loader2 className="size-4 animate-spin" />}
                    Reenviar verificación
                  </Button>
                  {verificationNotice && (
                    <p className="text-xs text-amber-100/90">{verificationNotice}</p>
                  )}
                </div>
              )}

              {twoFactorChallengeId && (
                <div className="space-y-2 rounded-md border border-sky-400/30 bg-sky-500/10 px-3 py-2">
                  <Label htmlFor="twoFactorCode">Código 2FA</Label>
                  <Input
                    id="twoFactorCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="123456"
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, ""))}
                  />
                  {twoFactorNotice && (
                    <p className="text-xs text-sky-100/90">{twoFactorNotice}</p>
                  )}
                  <Button
                    type="button"
                    className="w-full"
                    disabled={verifyingTwoFactor || twoFactorCode.trim().length < 4}
                    onClick={() => void handleVerifyTwoFactor()}
                  >
                    {verifyingTwoFactor && <Loader2 className="size-4 animate-spin" />}
                    Verificar 2FA
                  </Button>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {twoFactorChallengeId ? "Reintentar login" : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
