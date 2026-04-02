"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function Segment({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}>
      <span style={{
        fontFamily: "var(--font-heading)",
        fontSize: "1.6rem",
        fontWeight: 800,
        color: "var(--text-light)",
        lineHeight: 1,
        minWidth: "2.4rem",
        textAlign: "center",
      }}>
        {String(value).padStart(2, "0")}
      </span>
      <span style={{
        fontSize: "0.62rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "1px",
        color: "var(--text-muted)",
      }}>
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <span style={{
      fontFamily: "var(--font-heading)",
      fontSize: "1.4rem",
      fontWeight: 800,
      color: "var(--accent-primary)",
      lineHeight: 1,
      paddingBottom: "0.9rem",
    }}>
      :
    </span>
  );
}

export function EventCountdown({ startDate }: { startDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => calcTimeLeft(new Date(startDate)));

  useEffect(() => {
    const target = new Date(startDate);
    const id = setInterval(() => {
      const tl = calcTimeLeft(target);
      setTimeLeft(tl);
      if (!tl) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [startDate]);

  if (!timeLeft) return null;

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-2xl)",
      padding: "1.1rem 1.5rem",
      marginBottom: "2rem",
    }}>
      <p style={{
        fontSize: "0.72rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "1px",
        color: "var(--accent-primary)",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        marginBottom: "0.75rem",
      }}>
        <Clock size={13} />
        El evento comienza en
      </p>

      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: "0.6rem",
      }}>
        <Segment value={timeLeft.days} label="Días" />
        <Separator />
        <Segment value={timeLeft.hours} label="Hrs" />
        <Separator />
        <Segment value={timeLeft.minutes} label="Min" />
        <Separator />
        <Segment value={timeLeft.seconds} label="Seg" />
      </div>
    </div>
  );
}
