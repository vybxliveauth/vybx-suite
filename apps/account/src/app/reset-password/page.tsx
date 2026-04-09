"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  ActionFeedback,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@vybx/ui";
import { api } from "@/lib/api";
import { buildWebAppUrl } from "@/lib/routing";

const schema = z
  .object({
    password: z
      .string()
      .min(12, "Minimo 12 caracteres")
      .regex(/[A-Z]/, "Debe tener mayuscula")
      .regex(/\d/, "Debe tener un numero")
      .regex(/[^A-Za-z\d]/, "Debe tener un simbolo"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Las contrasenas no coinciden",
    path: ["confirm"],
  });

type ResetValues = z.infer<typeof schema>;

function getTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const hashToken = hashParams.get("token");
  if (hashToken) return hashToken;

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("token");
}

function parseError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const backToSiteUrl = buildWebAppUrl("/");

  const form = useForm<ResetValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
      confirm: "",
    },
  });

  useEffect(() => {
    const parsed = getTokenFromUrl();
    setToken(parsed?.trim() || null);
  }, []);

  async function onSubmit(values: ResetValues) {
    setNotice(null);
    setError(null);

    if (!token) {
      setError("Token invalido o expirado.");
      return;
    }

    try {
      await api.post("/auth/reset-password", {
        token,
        password: values.password,
      });
      setNotice("Tu contrasena fue actualizada correctamente.");
    } catch (submitError) {
      setError(parseError(submitError, "No se pudo actualizar la contrasena."));
    }
  }

  if (!token) {
    return (
      <main className="min-h-dvh bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-md rounded-xl border border-border/60 bg-card p-6 text-center">
          <AlertCircle className="mx-auto size-8 text-destructive" />
          <h1 className="mt-3 text-lg font-semibold">Enlace invalido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este enlace no es valido o ya expiro. Solicita uno nuevo.
          </p>
          <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground">
            <Link href="/forgot-password" className="underline underline-offset-4">
              Solicitar nuevo enlace
            </Link>
            <Link href={backToSiteUrl} className="underline underline-offset-4">
              Volver a Vybx
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Nueva contrasena</CardTitle>
            <CardDescription>
              Define una contrasena segura para tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notice ? (
              <div className="space-y-3 text-center">
                <CheckCircle2 className="mx-auto size-8 text-emerald-400" />
                <p className="text-sm text-muted-foreground">{notice}</p>
                <Link href="/auth?mode=login" className="text-sm text-primary underline underline-offset-4">
                  Ir a iniciar sesion
                </Link>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Nueva contrasena</Label>
                  <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirmar contrasena</Label>
                  <Input id="confirm" type="password" autoComplete="new-password" {...form.register("confirm")} />
                  {form.formState.errors.confirm && (
                    <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p>
                  )}
                </div>

                {error && <ActionFeedback status="error" message={error} />}

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Actualizar contrasena
                </Button>
              </form>
            )}

            <div className="mt-4 flex flex-col items-center gap-2 text-xs text-muted-foreground">
              <Link href="/auth?mode=login" className="underline underline-offset-4">
                Volver a iniciar sesion
              </Link>
              <Link href={backToSiteUrl} className="underline underline-offset-4">
                Volver a Vybx
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
