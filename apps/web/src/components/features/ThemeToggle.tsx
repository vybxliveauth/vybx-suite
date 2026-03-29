"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ width: 40, height: 40 }} />;

  const current = theme === "dark" || theme === "light" || theme === "system" ? theme : "system";
  const nextTheme = current === "system" ? "dark" : current === "dark" ? "light" : "system";
  const title =
    current === "system"
      ? "Tema: sistema (clic para oscuro)"
      : current === "dark"
        ? "Tema: oscuro (clic para claro)"
        : "Tema: claro (clic para sistema)";

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      title={title}
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "1px solid var(--glass-border)",
        background: "var(--glass-bg)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--text-muted)",
        transition: "var(--transition-smooth)",
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-light)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--glass-border)";
      }}
    >
      {current === "dark" ? <Sun size={16} /> : current === "light" ? <Moon size={16} /> : <Monitor size={16} />}
    </button>
  );
}
