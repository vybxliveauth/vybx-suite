"use client";

import { useMemo } from "react";

interface Rule {
  label: string;
  test: (v: string) => boolean;
}

const RULES: Rule[] = [
  { label: "12+ caracteres", test: (v) => v.length >= 12 },
  { label: "Una mayúscula", test: (v) => /[A-Z]/.test(v) },
  { label: "Un número", test: (v) => /\d/.test(v) },
  { label: "Un símbolo", test: (v) => /[^A-Za-z\d]/.test(v) },
];

const STRENGTH_LABELS = ["Débil", "Regular", "Buena", "Fuerte"] as const;
const STRENGTH_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

export function PasswordStrengthMeter({ value }: { value: string }) {
  const passed = useMemo(
    () => RULES.filter((r) => r.test(value)).length,
    [value],
  );

  if (!value) return null;

  const strengthIndex = Math.max(0, passed - 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      {/* Bar */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          height: 4,
          borderRadius: 2,
          overflow: "hidden",
        }}
        role="progressbar"
        aria-valuenow={passed}
        aria-valuemin={0}
        aria-valuemax={RULES.length}
        aria-label={`Seguridad de contraseña: ${STRENGTH_LABELS[strengthIndex]}`}
      >
        {RULES.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              borderRadius: 2,
              background:
                i < passed
                  ? STRENGTH_COLORS[strengthIndex]
                  : "rgba(255,255,255,0.08)",
              transition: "background 0.25s ease",
            }}
          />
        ))}
      </div>

      {/* Label + checklist */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            color: STRENGTH_COLORS[strengthIndex],
            transition: "color 0.25s ease",
          }}
        >
          {STRENGTH_LABELS[strengthIndex]}
        </span>
        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
          {passed}/{RULES.length}
        </span>
      </div>

      {/* Rules checklist */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.25rem 0.75rem",
        }}
      >
        {RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <span
              key={rule.label}
              style={{
                fontSize: "0.68rem",
                color: ok ? "#22c55e" : "var(--text-muted)",
                transition: "color 0.2s ease",
              }}
            >
              {ok ? "\u2713" : "\u2022"} {rule.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
