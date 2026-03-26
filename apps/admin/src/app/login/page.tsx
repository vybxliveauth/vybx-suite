"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button, Input, Label } from "@vybx/ui";
import { auth } from "@/lib/api";

const schema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(1, "Requerido"),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router  = useRouter();
  const params  = useSearchParams();
  const next    = params.get("next") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: Form) {
    setError(null);
    try {
      const res = await auth.login(values.email, values.password);
      if (!["ADMIN", "SUPER_ADMIN"].includes(res.user.role)) {
        setError("No tienes permisos para acceder al panel de administración.");
        return;
      }
      router.push(next);
    } catch {
      setError("Credenciales incorrectas o sin permisos de acceso.");
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(30,60,100,0.12), transparent)",
        }}
      />

      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6"
        style={{
          background: "rgba(13,13,26,0.8)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex size-14 items-center justify-center rounded-2xl text-white font-bold text-lg"
            style={{
              background: "linear-gradient(135deg, #1b3659, #2f5588)",
              boxShadow: "0 0 24px rgba(30,80,160,0.4)",
            }}
          >
            VT
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-white">VybxLive Admin</h1>
            <p className="text-xs text-white/40 mt-0.5">Acceso restringido para personal autorizado</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-white/70 text-xs">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="admin@vybx.live"
              className="bg-white/4 border-white/8 text-white placeholder:text-white/20 focus:border-primary/50"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-white/70 text-xs">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="bg-white/4 border-white/8 text-white placeholder:text-white/20 focus:border-primary/50"
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            style={{ background: "linear-gradient(135deg, #1b3659, #2f5588)" }}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isSubmitting ? "Verificando…" : "Entrar al Backoffice"}
          </Button>
        </form>
      </div>
    </div>
  );
}
