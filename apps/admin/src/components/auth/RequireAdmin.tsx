"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/api";
import type { Profile } from "@/lib/types";

interface Props { children: (profile: Profile) => React.ReactNode }

export function RequireAdmin({ children }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    auth.profile()
      .then((p) => {
        if (!["ADMIN", "SUPER_ADMIN"].includes(p.role)) {
          router.replace("/login");
        } else {
          setProfile(p as Profile);
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setChecking(false));
  }, [router]);

  if (checking || !profile) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-white/30 gap-2">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Verificando acceso…</span>
      </div>
    );
  }

  return <>{children(profile)}</>;
}
