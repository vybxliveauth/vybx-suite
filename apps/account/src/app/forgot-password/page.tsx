"use client";

import { useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail } from "lucide-react";
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

const schema = z.object({
  email: z.string().email("Email invalido"),
});

type ForgotValues = z.infer<typeof schema>;

function parseError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function ForgotPasswordSurface() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email")?.trim() ?? "";
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const backToSiteUrl = buildWebAppUrl("/");

  const form = useForm<ForgotValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: emailFromQuery },
  });

  async function onSubmit(values: ForgotValues) {
    setNotice(null);
    setError(null);

    try {
      await api.post("/auth/request-password-reset", {
        email: values.email.trim().toLowerCase(),
      });
      setNotice(
        "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contrasena.",
      );
    } catch (submitError) {
      setError(parseError(submitError, "No se pudo procesar la solicitud."));
    }
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recuperar contrasena</CardTitle>
            <CardDescription>
              Te enviaremos un enlace de recuperacion a tu correo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    placeholder="tu@email.com"
                    className="pl-9"
                    {...form.register("email")}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              {notice && <ActionFeedback status="success" message={notice} />}
              {error && <ActionFeedback status="error" message={error} />}

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Enviar enlace
              </Button>
            </form>

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

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </main>
      }
    >
      <ForgotPasswordSurface />
    </Suspense>
  );
}
