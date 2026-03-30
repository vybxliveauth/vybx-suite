"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarPlus } from "lucide-react";

interface CalendarEvent {
  title: string;
  startDate: string; // ISO 8601
  endDate?: string;  // ISO 8601
  location?: string;
  description?: string;
}

function toICSDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildGoogleUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${toICSDate(ev.startDate)}/${toICSDate(ev.endDate ?? ev.startDate)}`,
    ...(ev.location ? { location: ev.location } : {}),
    ...(ev.description ? { details: ev.description } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function buildOutlookUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: ev.title,
    startdt: ev.startDate,
    enddt: ev.endDate ?? ev.startDate,
    ...(ev.location ? { location: ev.location } : {}),
    ...(ev.description ? { body: ev.description } : {}),
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params}`;
}

function buildICSFile(ev: CalendarEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vybx//Tickets//ES",
    "BEGIN:VEVENT",
    `DTSTART:${toICSDate(ev.startDate)}`,
    `DTEND:${toICSDate(ev.endDate ?? ev.startDate)}`,
    `SUMMARY:${ev.title}`,
    ...(ev.location ? [`LOCATION:${ev.location}`] : []),
    ...(ev.description ? [`DESCRIPTION:${ev.description.slice(0, 200)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

function downloadICS(ev: CalendarEvent) {
  const blob = new Blob([buildICSFile(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ev.title.replace(/[^a-zA-Z0-9]/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AddToCalendarButton({ event, compact }: { event: CalendarEvent; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const options = [
    {
      label: "Google Calendar",
      onClick: () => window.open(buildGoogleUrl(event), "_blank"),
    },
    {
      label: "Outlook",
      onClick: () => window.open(buildOutlookUrl(event), "_blank"),
    },
    {
      label: "Apple / iCal (.ics)",
      onClick: () => downloadICS(event),
    },
  ];

  return (
    <div ref={menuRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: compact ? "0.45rem 0.9rem" : "0.55rem 1rem",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-pill)",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: compact ? "0.78rem" : "0.84rem",
          fontWeight: 600,
          fontFamily: "var(--font-body)",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(124,58,237,0.12)";
          e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)";
          e.currentTarget.style.color = "#c4b5fd";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          e.currentTarget.style.borderColor = "var(--glass-border)";
          e.currentTarget.style.color = "var(--text-muted)";
        }}
      >
        <CalendarPlus size={compact ? 14 : 16} />
        {!compact && "Añadir al calendario"}
        {compact && "Calendario"}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 0.5rem)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--bg-dark)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-xl)",
          padding: "0.35rem",
          minWidth: 185,
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          zIndex: 200,
        }}>
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => { opt.onClick(); setOpen(false); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "0.55rem 0.85rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--glass-bg)";
                e.currentTarget.style.color = "var(--text-light)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
