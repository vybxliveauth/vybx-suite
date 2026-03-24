"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  ChevronLeft,
  Ticket,
  CalendarDays,
  MapPin,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004";

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus = "VALID" | "USED" | "CANCELLED";

interface BackendTicket {
  id: string;
  status: TicketStatus;
  qrCode: string | null;
  createdAt: string;
  ticketType: {
    id: string;
    name: string;
    price: string;
    event: {
      id: string;
      title: string;
      image: string | null;
      date: string;
      location: string | null;
      tags: string[];
    };
  };
}

interface TicketsResponse {
  items: BackendTicket[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-DO", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function formatPrice(price: string) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 0 })
    .format(Number(price));
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketStatus }) {
  const config = {
    VALID:     { label: "Válido",    color: "#4ade80", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)",  Icon: CheckCircle2 },
    USED:      { label: "Usado",     color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)", Icon: Clock },
    CANCELLED: { label: "Cancelado", color: "#f43f5e", bg: "rgba(244,63,94,0.1)",  border: "rgba(244,63,94,0.3)",  Icon: XCircle },
  }[status];

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.35rem",
      padding: "0.25rem 0.75rem",
      borderRadius: "var(--radius-pill)",
      background: config.bg,
      border: `1px solid ${config.border}`,
      color: config.color,
      fontSize: "0.75rem",
      fontWeight: 700,
    }}>
      <config.Icon size={12} />
      {config.label}
    </span>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket }: { ticket: BackendTicket }) {
  const { event } = ticket.ticketType;
  const [qrExpanded, setQrExpanded] = useState(false);

  return (
    <div style={{
      background: "var(--card-bg)",
      border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-2xl)",
      overflow: "hidden",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      position: "relative",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 40px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Event image strip */}
      <div style={{ position: "relative", height: 130, overflow: "hidden" }}>
        {event.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image}
            alt={event.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(255,42,95,0.2))" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--bg-dark) 0%, transparent 60%)" }} />

        {/* Status badge */}
        <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem" }}>
          <StatusBadge status={ticket.status} />
        </div>

        {/* Punch holes */}
        <div style={{ position: "absolute", bottom: -8, left: -8, width: 16, height: 16, borderRadius: "50%", background: "var(--bg-dark)", border: "1px solid var(--glass-border)" }} />
        <div style={{ position: "absolute", bottom: -8, right: -8, width: 16, height: 16, borderRadius: "50%", background: "var(--bg-dark)", border: "1px solid var(--glass-border)" }} />
      </div>

      {/* Dashed divider */}
      <div style={{ borderTop: "1px dashed var(--glass-border)", margin: "0 1.25rem" }} />

      {/* Content */}
      <div style={{ padding: "1.1rem 1.25rem 1.25rem" }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "0.25rem", lineHeight: 1.2 }}>
            {event.title}
          </h3>
          <span style={{
            fontSize: "0.72rem",
            background: "rgba(124,58,237,0.15)",
            border: "1px solid rgba(124,58,237,0.3)",
            color: "#c4b5fd",
            borderRadius: "var(--radius-pill)",
            padding: "0.12rem 0.55rem",
            fontWeight: 600,
          }}>
            {ticket.ticketType.name}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <CalendarDays size={13} color="var(--accent-primary)" />
            {formatDate(event.date)}
          </div>
          {event.location && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              <MapPin size={13} color="var(--accent-primary)" />
              {event.location}
            </div>
          )}
        </div>

        {/* Footer row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.1rem" }}>Precio</p>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 800, color: "var(--text-light)" }}>
              {formatPrice(ticket.ticketType.price)}
            </p>
          </div>

          {ticket.qrCode && ticket.status === "VALID" && (
            <button
              onClick={() => setQrExpanded(!qrExpanded)}
              style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                padding: "0.45rem 0.9rem",
                background: qrExpanded ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${qrExpanded ? "rgba(124,58,237,0.5)" : "var(--glass-border)"}`,
                borderRadius: "var(--radius-pill)",
                cursor: "pointer",
                color: qrExpanded ? "#c4b5fd" : "var(--text-muted)",
                fontSize: "0.78rem",
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                transition: "all 0.2s",
              }}
            >
              <QrCode size={14} />
              {qrExpanded ? "Ocultar" : "Ver QR"}
            </button>
          )}
        </div>

        {/* QR code expanded */}
        {qrExpanded && ticket.qrCode && (
          <div style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "#fff",
            borderRadius: "var(--radius-xl)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            <QRCodeSVG
              value={ticket.qrCode}
              size={140}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="M"
              style={{ borderRadius: 4 }}
            />
            <p style={{ fontSize: "0.65rem", color: "#64748b", fontFamily: "monospace", wordBreak: "break-all", textAlign: "center", maxWidth: 160 }}>
              {ticket.qrCode.slice(0, 24)}…
            </p>
          </div>
        )}

        {/* Ticket ID */}
        <p style={{ marginTop: "0.75rem", fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
          ID: {ticket.id.slice(0, 18)}…
        </p>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: "1.25rem", textAlign: "center" }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--glass-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Ticket size={32} color="var(--text-muted)" />
      </div>
      <div>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "0.4rem" }}>
          Sin tickets aún
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Cuando compres tickets aparecerán aquí.
        </p>
      </div>
      <Link href="/" className="btn-primary" style={{ textDecoration: "none" }}>
        Explorar eventos
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<BackendTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TicketStatus | "ALL">("ALL");

  useEffect(() => {
    fetch(`${API}/tickets/my-tickets`, { credentials: "include" })
      .then(async (r) => {
        if (r.status === 401) { router.replace("/"); return; }
        if (!r.ok) throw new Error("Error cargando tickets");
        const data: TicketsResponse = await r.json();
        setTickets(data.items);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = filter === "ALL" ? tickets : tickets.filter((t) => t.status === filter);

  const counts = {
    ALL: tickets.length,
    VALID: tickets.filter((t) => t.status === "VALID").length,
    USED: tickets.filter((t) => t.status === "USED").length,
    CANCELLED: tickets.filter((t) => t.status === "CANCELLED").length,
  };

  return (
    <>
      {/* Navbar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 5%",
        background: "rgba(10,10,18,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <Zap size={20} color="var(--accent-primary)" />
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", fontWeight: 900, color: "var(--text-light)" }}>vybx</span>
        </Link>
        <Link href="/" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 1rem", fontSize: "0.85rem", textDecoration: "none" }}>
          <ChevronLeft size={14} /> Volver
        </Link>
      </nav>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "3rem 5% 6rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 900, letterSpacing: "-1px", color: "var(--text-light)", marginBottom: "0.5rem" }}>
            Mis tickets
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            {loading ? "Cargando..." : `${counts.ALL} ticket${counts.ALL !== 1 ? "s" : ""} en total`}
          </p>
        </div>

        {/* Filter tabs */}
        {!loading && !error && tickets.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
            {(["ALL", "VALID", "USED", "CANCELLED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid",
                  borderColor: filter === f ? "rgba(124,58,237,0.5)" : "var(--glass-border)",
                  background: filter === f ? "rgba(124,58,237,0.15)" : "transparent",
                  color: filter === f ? "#c4b5fd" : "var(--text-muted)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  transition: "all 0.2s",
                }}
              >
                {{ ALL: "Todos", VALID: "Válidos", USED: "Usados", CANCELLED: "Cancelados" }[f]}
                {" "}
                <span style={{ opacity: 0.7 }}>({counts[f]})</span>
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: "0.75rem", color: "var(--text-muted)" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
            Cargando tickets...
          </div>
        ) : error ? (
          <div style={{ padding: "1rem 1.25rem", borderRadius: "var(--radius-xl)", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "#fda4af", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <AlertCircle size={16} /> {error}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {filtered.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
