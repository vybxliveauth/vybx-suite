"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthModal } from "@/components/features/AuthModal";
import { normalizeNextPath } from "@/lib/auth-routing";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hydrated, rehydrate } = useAuthStore();
  const mode = searchParams.get("mode") === "register" ? "register" : "login";
  const nextPath = useMemo(
    () => normalizeNextPath(searchParams.get("next")),
    [searchParams],
  );

  useEffect(() => {
    void rehydrate();
  }, [rehydrate]);

  useEffect(() => {
    if (!hydrated || !user) return;
    router.replace(nextPath);
  }, [hydrated, nextPath, router, user]);

  const handleClose = useCallback(() => {
    router.replace(nextPath);
  }, [nextPath, router]);

  if (!hydrated) {
    return (
      <main
        id="main-content"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <p
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-body)",
            fontSize: "0.95rem",
          }}
        >
          Preparando autenticación...
        </p>
      </main>
    );
  }

  if (user) return null;

  return (
    <main id="main-content" style={{ minHeight: "100vh" }}>
      <AuthModal open onClose={handleClose} defaultTab={mode} />
    </main>
  );
}

