"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ScanLine, Loader2 } from "lucide-react";
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
  password: z.string().min(1, "Requerido"),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const [serverError, setServerError] = useState<string | null>(null);
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorNotice, setTwoFactorNotice] = useState<string | null>(null);
  const [verifyingTwoFactor, setVerifyingTwoFactor] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setTwoFactorNotice(null);
    try {
      const res = await api.post<
        | { user: AuthUser; success: boolean }
        | { success: false; requiresTwoFactor: true; challengeId: string; expiresInSeconds: number; message?: string }
      >("/auth/login", values);

      if ("requiresTwoFactor" in res && res.requiresTwoFactor) {
        setTwoFactorChallengeId(res.challengeId);
        setTwoFactorCode("");
        setTwoFactorNotice(
          res.message ?? `Código 2FA enviado. Expira en ${Math.max(1, Math.ceil(res.expiresInSeconds / 60))} min.`,
        );
        return;
      }

      if (!("user" in res)) {
        setServerError("No se pudo completar el inicio de sesión.");
        return;
      }

      setUser(res.user);
      router.replace(next);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Error al iniciar sesión.");
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
      setUser(res.user);
      router.replace(next);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Código 2FA inválido.");
    } finally {
      setVerifyingTwoFactor(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <ScanLine className="size-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Vybx Personal</h1>
          <p className="text-sm text-muted-foreground">Acceso del equipo de escaneo</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Iniciar sesión</CardTitle>
            <CardDescription>Usa las credenciales que te asignó el promotor</CardDescription>
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
                  autoCapitalize="none"
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
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
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
                {twoFactorChallengeId ? "Reintentar" : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
