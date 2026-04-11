"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldCheck } from "lucide-react";
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
import {
  exchangeSessionForMobileAuth,
  login,
  loginForMobile,
  register,
  verifyLoginTwoFactor,
  verifyLoginTwoFactorForMobile,
  type MobileAuthTokens,
} from "@/lib/api";
import { hydrateUserFromSession, setUser, useAuthUser } from "@/lib/auth";
import { buildWebAppUrl, normalizeNextPath } from "@/lib/routing";
import { getClientTurnstileToken } from "@/lib/turnstile";
import { TurnstileWidget } from "@/components/features/TurnstileWidget";

const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(1, "Ingresa tu contrasena"),
});

const registerSchema = z
  .object({
    firstName: z.string().min(2, "Minimo 2 caracteres"),
    lastName: z.string().min(2, "Minimo 2 caracteres"),
    email: z.string().email("Email invalido"),
    password: z
      .string()
      .min(12, "Minimo 12 caracteres")
      .regex(/[A-Z]/, "Debe tener mayuscula")
      .regex(/\d/, "Debe tener un numero")
      .regex(/[^A-Za-z\d]/, "Debe tener un simbolo"),
    confirmPassword: z.string(),
    country: z.string().max(80, "Maximo 80 caracteres").optional().or(z.literal("")),
    city: z.string().max(120, "Maximo 120 caracteres").optional().or(z.literal("")),
    acceptTerms: z.boolean(),
  })
  .refine((data) => data.acceptTerms === true, {
    message: "Debes aceptar los terminos",
    path: ["acceptTerms"],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type Mode = "login" | "register";
type PkceMethod = "S256";
const IS_DEV = process.env.NODE_ENV !== "production";
const IS_PROD = process.env.NODE_ENV === "production";

function parseError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function normalizeMobileCallback(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const protocol = parsed.protocol.toLowerCase();
    const normalizedPath =
      parsed.pathname
        .replace(/\/--\//g, "/")
        .replace(/^\/--/, "/")
        .replace(/\/{2,}/g, "/")
        .replace(/\/+$/, "") || "/";
    const isAuthCallbackPath = normalizedPath.endsWith("/auth/callback");
    if (!isAuthCallbackPath) return null;

    const isExpoScheme =
      protocol === "exp:" ||
      protocol === "exps:" ||
      protocol.startsWith("exp+") ||
      protocol.startsWith("exps+");
    const isAppScheme =
      protocol === "vybetickets:" ||
      protocol === "vybx:" ||
      protocol === "com.vybxlive.tickets:";

    if (isAppScheme) return parsed.toString();
    if (isExpoScheme) {
      if (!IS_PROD) return parsed.toString();
      return parsed.hostname.toLowerCase() === "u.expo.dev" ? parsed.toString() : null;
    }
    if (
      IS_DEV &&
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "auth.expo.io"
      )
    ) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function normalizePkceCodeChallenge(raw: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(value)) return null;
  return value;
}

function normalizePkceMethod(raw: string | null): PkceMethod | null {
  if (raw === "S256") return "S256";
  return null;
}

function buildMobileCallbackUrl(
  callbackUrl: string,
  payload:
    | {
        status: "success";
        authCode: string;
        state?: string;
      }
    | { status: "error"; message: string; state?: string },
): string {
  const redirect = new URL(callbackUrl);
  const params = new URLSearchParams(redirect.search);
  params.set("status", payload.status);
  if (payload.state) params.set("state", payload.state);
  if (payload.status === "success") {
    params.set("auth_code", payload.authCode);
    params.delete("access_token");
    params.delete("refresh_token");
  } else {
    params.set("message", payload.message);
  }
  redirect.search = params.toString();
  redirect.hash = "";
  return redirect.toString();
}

function AuthSurface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthUser();

  const mode: Mode = searchParams.get("mode") === "register" ? "register" : "login";
  const nextPath = useMemo(() => normalizeNextPath(searchParams.get("next")), [searchParams]);
  const returnToWeb = useMemo(() => buildWebAppUrl(nextPath), [nextPath]);
  const backToSiteUrl = useMemo(() => buildWebAppUrl("/"), []);
  const rawMobileCallback = searchParams.get("callback");
  const mobileCallback = useMemo(
    () => normalizeMobileCallback(rawMobileCallback),
    [rawMobileCallback],
  );
  const mobileCodeChallenge = useMemo(
    () => normalizePkceCodeChallenge(searchParams.get("code_challenge")),
    [searchParams],
  );
  const mobileCodeChallengeMethod = useMemo(
    () => normalizePkceMethod(searchParams.get("code_challenge_method")),
    [searchParams],
  );
  const mobileState = searchParams.get("state")?.trim() ?? "";
  const mobileRequested = searchParams.get("mobile") === "1";
  const mobileMode = mobileRequested && !!mobileCallback;
  const mobilePkceMode =
    mobileMode &&
    mobileState.length >= 8 &&
    !!mobileCodeChallenge &&
    mobileCodeChallengeMethod === "S256";

  const [authChecked, setAuthChecked] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverNotice, setServerNotice] = useState<string | null>(null);
  const [exchangingMobileSession, setExchangingMobileSession] = useState(false);
  const [mobileSessionExchangeTried, setMobileSessionExchangeTried] = useState(false);
  const [mobileReturnUrl, setMobileReturnUrl] = useState<string | null>(null);
  const mobilePkceErrorRedirected = useRef(false);

  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [verifyingTwoFactor, setVerifyingTwoFactor] = useState(false);

  const [registerEmail, setRegisterEmail] = useState(searchParams.get("email")?.trim() ?? "");

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: registerEmail, password: "" },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: registerEmail,
      password: "",
      confirmPassword: "",
      country: "",
      city: "",
      acceptTerms: false,
    },
  });

  const redirectToMobileApp = useCallback((url: string) => {
    setMobileReturnUrl(url);
    window.location.assign(url);
    window.setTimeout(() => {
      window.location.assign(url);
    }, 450);
  }, []);

  const createMobileAuthCode = useCallback(
    async (tokens: MobileAuthTokens): Promise<string> => {
      if (!mobilePkceMode || !mobileCodeChallenge || !mobileCodeChallengeMethod) {
        throw new Error("No pudimos validar PKCE para continuar con la app.");
      }

      const response = await fetch("/api/mobile-auth/create-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          state: mobileState,
          code_challenge: mobileCodeChallenge,
          code_challenge_method: mobileCodeChallengeMethod,
        }),
      });

      if (!response.ok) {
        let message = "No pudimos preparar el acceso seguro móvil.";
        try {
          const payload = (await response.json()) as { message?: unknown };
          if (typeof payload.message === "string" && payload.message.trim().length > 0) {
            message = payload.message;
          }
        } catch {
          // ignore parse failures
        }
        throw new Error(message);
      }

      const payload = (await response.json()) as { auth_code?: string };
      if (typeof payload.auth_code !== "string" || payload.auth_code.trim().length === 0) {
        throw new Error("No recibimos un código de acceso seguro para la app.");
      }
      return payload.auth_code;
    },
    [mobileCodeChallenge, mobileCodeChallengeMethod, mobilePkceMode, mobileState],
  );

  const completeMobileAuth = useCallback(
    async (tokens: MobileAuthTokens) => {
      if (!mobileMode || !mobileCallback) return;
      const authCode = await createMobileAuthCode(tokens);
      const callbackUrl = buildMobileCallbackUrl(mobileCallback, {
        status: "success",
        authCode,
        state: mobileState,
      });
      redirectToMobileApp(callbackUrl);
    },
    [createMobileAuthCode, mobileCallback, mobileMode, mobileState, redirectToMobileApp],
  );

  useEffect(() => {
    let mounted = true;
    void hydrateUserFromSession().finally(() => {
      if (mounted) setAuthChecked(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (mobileRequested && !mobileCallback) {
      setServerError(
        "No pudimos validar el callback de la app móvil. Abre de nuevo el flujo desde la app.",
      );
      return;
    }
    if (mobileRequested && mobileCallback && !mobilePkceMode) {
      if (!mobilePkceErrorRedirected.current) {
        mobilePkceErrorRedirected.current = true;
        const callbackUrl = buildMobileCallbackUrl(mobileCallback, {
          status: "error",
          message:
            "Flujo móvil desactualizado. Actualiza la app y vuelve a intentar iniciar sesión.",
          state: mobileState || undefined,
        });
        redirectToMobileApp(callbackUrl);
      }
      setServerError(
        "No pudimos validar el inicio seguro móvil (PKCE). Actualiza la app y vuelve a iniciar el flujo.",
      );
      return;
    }
    if (!mobileRequested) return;
    setServerError((previous) => {
      if (
        previous ===
          "No pudimos validar el callback de la app móvil. Abre de nuevo el flujo desde la app." ||
        previous ===
          "No pudimos validar el inicio seguro móvil (PKCE). Actualiza la app y vuelve a iniciar el flujo."
      ) {
        return null;
      }
      return previous;
    });
  }, [mobileCallback, mobilePkceMode, mobileRequested, mobileState, redirectToMobileApp]);

  useEffect(() => {
    if (mobileMode) return;
    if (!authChecked || user === null) return;
    window.location.assign(returnToWeb);
  }, [authChecked, mobileMode, returnToWeb, user]);

  useEffect(() => {
    if (!mobileMode || !mobileCallback || !mobilePkceMode) return;
    if (!authChecked || user === null) return;
    if (mobileSessionExchangeTried) return;

    let mounted = true;
    setMobileSessionExchangeTried(true);
    setExchangingMobileSession(true);
    setMobileReturnUrl(null);
    setServerError(null);
    setServerNotice("Sesion web detectada. Conectando con la app...");

    const userEmail = user.email ?? "";

    void (async () => {
      const tokens = await Promise.race([
        exchangeSessionForMobileAuth(),
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 7000);
        }),
      ]);
      if (!mounted) return;
      if (!tokens) {
        // Pre-fill the email so the user only needs to enter their password.
        if (userEmail) {
          loginForm.setValue("email", userEmail);
        }
        setServerNotice(
          "Sesion detectada, pero no pudimos transferirla automaticamente. Ingresa tu contrasena para continuar en la app.",
        );
        return;
      }
      await completeMobileAuth(tokens);
    })()
      .catch(() => {
        if (!mounted) return;
        if (userEmail) {
          loginForm.setValue("email", userEmail);
        }
        setServerNotice(
          "Sesion detectada, pero no pudimos transferirla automaticamente. Ingresa tu contrasena para continuar en la app.",
        );
      })
      .finally(() => {
        if (mounted) setExchangingMobileSession(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    authChecked,
    mobileCallback,
    completeMobileAuth,
    loginForm,
    mobileMode,
    mobilePkceMode,
    mobileSessionExchangeTried,
    user,
  ]);

  useEffect(() => {
    const emailFromQuery = searchParams.get("email")?.trim() ?? "";
    if (!emailFromQuery) return;
    setRegisterEmail(emailFromQuery);
    loginForm.setValue("email", emailFromQuery);
    registerForm.setValue("email", emailFromQuery);
  }, [loginForm, registerForm, searchParams]);

  function setMode(nextMode: Mode, emailHint?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", nextMode);
    if (nextPath !== "/") {
      params.set("next", nextPath);
    } else {
      params.delete("next");
    }

    const normalizedHint = emailHint?.trim();
    if (normalizedHint) {
      params.set("email", normalizedHint);
    } else if (registerEmail.trim()) {
      params.set("email", registerEmail.trim());
    } else {
      params.delete("email");
    }

    if (mobileMode && mobileCallback) {
      params.set("mobile", "1");
      params.set("callback", mobileCallback);
      if (mobileState) {
        params.set("state", mobileState);
      } else {
        params.delete("state");
      }
      if (mobileCodeChallenge) {
        params.set("code_challenge", mobileCodeChallenge);
      } else {
        params.delete("code_challenge");
      }
      if (mobileCodeChallengeMethod) {
        params.set("code_challenge_method", mobileCodeChallengeMethod);
      } else {
        params.delete("code_challenge_method");
      }
    } else {
      params.delete("mobile");
      params.delete("callback");
      params.delete("state");
      params.delete("code_challenge");
      params.delete("code_challenge_method");
    }

    router.replace(`/auth?${params.toString()}`);
  }

  async function handleLogin(values: LoginValues) {
    setServerError(null);
    setServerNotice(null);
    setTwoFactorChallengeId(null);
    setTwoFactorCode("");

    try {
      if (mobileMode) {
        if (!mobilePkceMode) {
          throw new Error(
            "No pudimos validar el inicio seguro móvil (PKCE). Abre de nuevo el flujo desde la app.",
          );
        }
        const mobileResponse = await loginForMobile({
          email: values.email.trim().toLowerCase(),
          password: values.password,
        });

        if (!mobileResponse.success && mobileResponse.requiresTwoFactor) {
          setTwoFactorChallengeId(mobileResponse.challengeId);
          setServerNotice(
            mobileResponse.message ??
              `Codigo 2FA enviado. Expira en ${Math.max(
                1,
                Math.ceil(mobileResponse.expiresInSeconds / 60),
              )} min.`,
          );
          return;
        }

        if (mobileResponse.success) {
          await completeMobileAuth(mobileResponse.auth);
          return;
        }
      }

      const response = await login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      if (response.success) {
        setUser(response.user);
        window.location.assign(returnToWeb);
        return;
      }

      if (response.requiresTwoFactor) {
        setTwoFactorChallengeId(response.challengeId);
        setServerNotice(
          response.message ??
            `Codigo 2FA enviado. Expira en ${Math.max(1, Math.ceil(response.expiresInSeconds / 60))} min.`,
        );
        return;
      }
    } catch (error) {
      setServerError(parseError(error, "No se pudo iniciar sesion."));
    }
  }

  async function handleVerifyTwoFactor() {
    if (!twoFactorChallengeId) return;

    setVerifyingTwoFactor(true);
    setServerError(null);
    try {
      if (mobileMode) {
        if (!mobilePkceMode) {
          throw new Error(
            "No pudimos validar el inicio seguro móvil (PKCE). Abre de nuevo el flujo desde la app.",
          );
        }
        const tokens = await verifyLoginTwoFactorForMobile({
          challengeId: twoFactorChallengeId,
          code: twoFactorCode.trim(),
        });
        await completeMobileAuth(tokens);
        return;
      }

      const userFrom2fa = await verifyLoginTwoFactor({
        challengeId: twoFactorChallengeId,
        code: twoFactorCode.trim(),
      });
      setUser(userFrom2fa);
      window.location.assign(returnToWeb);
    } catch (error) {
      setServerError(parseError(error, "Codigo 2FA invalido."));
    } finally {
      setVerifyingTwoFactor(false);
    }
  }

  async function handleRegister(values: RegisterValues) {
    setServerError(null);
    setServerNotice(null);

    const normalizedEmail = values.email.trim().toLowerCase();

    try {
      const turnstileToken = getClientTurnstileToken("register");
      await register({
        email: normalizedEmail,
        password: values.password,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        country: values.country?.trim() || undefined,
        city: values.city?.trim() || undefined,
        turnstileToken,
      });

      setRegisterEmail(normalizedEmail);
      setServerNotice("Cuenta creada. Revisa tu correo para verificarla antes de iniciar sesion.");
      setMode("login", normalizedEmail);
    } catch (error) {
      const message = parseError(error, "No se pudo crear la cuenta.");
      const normalizedMessage = message.toLowerCase();
      if (normalizedMessage.includes("ya existe") || normalizedMessage.includes("already exists")) {
        setRegisterEmail(normalizedEmail);
        setServerNotice("Ese correo ya tiene cuenta. Inicia sesion.");
        loginForm.setValue("email", normalizedEmail);
        setMode("login", normalizedEmail);
        return;
      }
      setServerError(message);
    }
  }

  async function handleForgotPassword(emailValue?: string) {
    const normalized = emailValue?.trim() ?? "";
    const params = new URLSearchParams();
    if (normalized) params.set("email", normalized);
    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    router.push(`/forgot-password${suffix}`);
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Vybx Account</p>
          <h1 className="mt-2 text-2xl font-bold">
            {mobileMode ? "Acceso desde app" : "Acceso de usuarios"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mobileMode
              ? "Inicia sesion para volver a la app de forma segura."
              : "Superficie dedicada para login y registro."}
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-4 pb-2">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary p-1">
              <Button
                type="button"
                variant={mode === "login" ? "default" : "ghost"}
                onClick={() => setMode("login")}
                className="w-full"
              >
                Iniciar sesion
              </Button>
              <Button
                type="button"
                variant={mode === "register" ? "default" : "ghost"}
                onClick={() => setMode("register")}
                className="w-full"
              >
                Crear cuenta
              </Button>
            </div>
            <div>
              <CardTitle>{mode === "login" ? "Iniciar sesion" : "Crear cuenta"}</CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Usa tu correo y contrasena para continuar."
                  : "Completa tus datos para crear tu cuenta de usuario."}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {mode === "login" ? (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    autoCapitalize="none"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Contrasena</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                {twoFactorChallengeId && (
                  <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
                    <Label htmlFor="twoFactorCode">Codigo 2FA</Label>
                    <Input
                      id="twoFactorCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      placeholder="123456"
                      value={twoFactorCode}
                      onChange={(event) =>
                        setTwoFactorCode(event.target.value.replace(/\D/g, ""))
                      }
                    />
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

                {serverNotice && <ActionFeedback status="success" message={serverNotice} />}
                {serverError && <ActionFeedback status="error" message={serverError} />}

                <div className="space-y-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginForm.formState.isSubmitting || exchangingMobileSession}
                  >
                    {(loginForm.formState.isSubmitting || exchangingMobileSession) && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    {twoFactorChallengeId ? "Reintentar" : "Entrar"}
                  </Button>
                  {mobileReturnUrl && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => window.location.assign(mobileReturnUrl)}
                    >
                      Volver a la app
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => void handleForgotPassword(loginForm.getValues("email"))}
                  >
                    Olvide mi contrasena
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input id="firstName" autoComplete="given-name" {...registerForm.register("firstName")} />
                    {registerForm.formState.errors.firstName && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input id="lastName" autoComplete="family-name" {...registerForm.register("lastName")} />
                    {registerForm.formState.errors.lastName && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="registerEmail">Email</Label>
                  <Input
                    id="registerEmail"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    autoCapitalize="none"
                    {...registerForm.register("email")}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="registerPassword">Contrasena</Label>
                  <Input
                    id="registerPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimo 12 caracteres"
                    {...registerForm.register("password")}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmar contrasena</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    {...registerForm.register("confirmPassword")}
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="country">Pais (opcional)</Label>
                    <Input id="country" autoComplete="country-name" {...registerForm.register("country")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Ciudad (opcional)</Label>
                    <Input id="city" autoComplete="address-level2" {...registerForm.register("city")} />
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-border/60 p-3">
                  <TurnstileWidget action="register" />
                </div>

                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" className="mt-1" {...registerForm.register("acceptTerms")} />
                  <span>
                    Acepto los terminos y la politica de privacidad de Vybx.
                  </span>
                </label>
                {registerForm.formState.errors.acceptTerms && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.acceptTerms.message}</p>
                )}

                {serverNotice && <ActionFeedback status="success" message={serverNotice} />}
                {serverError && <ActionFeedback status="error" message={serverError} />}

                <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
                  {registerForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  <ShieldCheck className="size-4" />
                  Crear cuenta
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          <Link href={backToSiteUrl} className="underline underline-offset-4">
            Volver a Vybx
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </main>
      }
    >
      <AuthSurface />
    </Suspense>
  );
}
