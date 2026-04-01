"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VybxLogo } from "@/components/ui/VybxLogo";
import {
  ChevronLeft,
  CalendarDays,
  MapPin,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Send,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { SafeEventImage } from "@/components/features/SafeEventImage";
import { AddToCalendarButton } from "@/components/features/AddToCalendarButton";
import { TicketsIllustration } from "@/components/features/EmptyStateIllustration";
import { api } from "@/lib/api";

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
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function formatPrice(price: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
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

// ─── Transfer Modal ───────────────────────────────────────────────────────────

function TransferModal({
  ticket,
  onClose,
  onTransferred,
}: {
  ticket: BackendTicket;
  onClose: () => void;
  onTransferred: (id: string) => void;
}) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    const email = recipientEmail.trim().toLowerCase();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await api.post(`/tickets/${ticket.id}/transfer`, { recipientEmail: email });
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/no active account|not found/i.test(msg)) {
        setError("No encontramos una cuenta activa con ese correo.");
      } else if (/yourself|ti mismo/i.test(msg)) {
        setError("No puedes transferirte un ticket a ti mismo.");
      } else if (/cutoff|occurred|cierra/i.test(msg)) {
        setError("Ya no es posible transferir este ticket (el evento está próximo o ya ocurrió).");
      } else {
        setError("No se pudo completar la transferencia. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 420,
        background: "var(--card-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-2xl)",
        padding: "2rem",
        display: "flex", flexDirection: "column", gap: "1.25rem",
      }}>
        {success ? (
          <>
            <div style={{ textAlign: "center" }}>
              <CheckCircle2 size={48} color="#4ade80" style={{ margin: "0 auto 1rem" }} />
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "0.5rem" }}>
                ¡Ticket transferido!
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                Tu ticket ha sido transferido a <strong style={{ color: "var(--text-light)" }}>{recipientEmail}</strong>.
                El destinatario recibirá un correo de confirmación.
              </p>
            </div>
            <button
              onClick={() => { onTransferred(ticket.id); onClose(); }}
              className="btn-primary"
              style={{ width: "100%", padding: "0.7rem", fontSize: "0.9rem", textAlign: "center" }}
            >
              Cerrar
            </button>
          </>
        ) : (
          <>
            <div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "0.25rem" }}>
                Transferir ticket
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                {ticket.ticketType.event.title} — {ticket.ticketType.name}
              </p>
            </div>

            <div style={{
              padding: "0.75rem 1rem",
              background: "rgba(251,191,36,0.06)",
              border: "1px solid rgba(251,191,36,0.2)",
              borderRadius: "var(--radius-xl)",
              color: "#fbbf24",
              fontSize: "0.8rem",
              lineHeight: 1.5,
            }}>
              Esta acción es permanente. Una vez transferido, el ticket pasará al nuevo propietario y desaparecerá de tu lista.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
                Correo del destinatario
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
                placeholder="ejemplo@correo.com"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.9rem",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-xl)",
                  color: "var(--text-light)",
                  fontSize: "0.9rem",
                  fontFamily: "var(--font-body)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.6rem 0.9rem",
                background: "rgba(244,63,94,0.08)",
                border: "1px solid rgba(244,63,94,0.25)",
                borderRadius: "var(--radius-xl)",
                color: "#fda4af",
                fontSize: "0.82rem",
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={onClose}
                disabled={loading}
                className="btn-secondary"
                style={{ flex: 1, padding: "0.65rem", fontSize: "0.88rem", textAlign: "center" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={loading || !recipientEmail.trim()}
                style={{
                  flex: 1, padding: "0.65rem",
                  background: loading || !recipientEmail.trim() ? "rgba(124,58,237,0.3)" : "var(--accent-primary)",
                  border: "none",
                  borderRadius: "var(--radius-xl)",
                  color: "#fff",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-body)",
                  cursor: loading || !recipientEmail.trim() ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                  transition: "all 0.2s",
                }}
              >
                {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={15} />}
                {loading ? "Transfiriendo…" : "Transferir"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({
  ticket,
  onCancelled,
  onTransferred,
}: {
  ticket: BackendTicket;
  onCancelled: (id: string) => void;
  onTransferred: (id: string) => void;
}) {
  const { event } = ticket.ticketType;
  const [qrExpanded, setQrExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  async function handleCancel() {
    if (!confirm("¿Solicitar cancelación de este ticket?")) return;
    setCancelling(true);
    try {
      await api.post(`/tickets/${ticket.id}/cancel-request`, {});
      onCancelled(ticket.id);
    } catch { /* ignore */ }
    finally { setCancelling(false); }
  }

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
          <SafeEventImage
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

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {ticket.status === "VALID" && (
              <AddToCalendarButton
                compact
                event={{
                  title: event.title,
                  startDate: event.date,
                  location: event.location ?? undefined,
                }}
              />
            )}
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
            {ticket.status === "VALID" && (
              <button
                onClick={() => setShowTransferModal(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.45rem 0.9rem",
                  background: "rgba(124,58,237,0.08)",
                  border: "1px solid rgba(124,58,237,0.25)",
                  borderRadius: "var(--radius-pill)",
                  cursor: "pointer",
                  color: "#c4b5fd",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  transition: "all 0.2s",
                }}
              >
                <Send size={14} />
                Transferir
              </button>
            )}
            {ticket.status === "VALID" && (
              <button
                onClick={() => void handleCancel()}
                disabled={cancelling}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.45rem 0.9rem",
                  background: "rgba(244,63,94,0.08)",
                  border: "1px solid rgba(244,63,94,0.25)",
                  borderRadius: "var(--radius-pill)",
                  cursor: cancelling ? "not-allowed" : "pointer",
                  color: "#fda4af",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  opacity: cancelling ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                <XCircle size={14} />
                {cancelling ? "…" : "Cancelar"}
              </button>
            )}
          </div>
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

      {showTransferModal && (
        <TransferModal
          ticket={ticket}
          onClose={() => setShowTransferModal(false)}
          onTransferred={(id) => {
            setShowTransferModal(false);
            onTransferred(id);
          }}
        />
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 360, gap: "1.5rem", textAlign: "center", padding: "2rem 1rem" }}>
      <TicketsIllustration size={130} />
      <div>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "0.5rem" }}>
          Sin tickets aún
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", maxWidth: "32ch", margin: "0 auto", lineHeight: 1.5 }}>
          Tu próxima experiencia te espera. Explora los eventos disponibles y asegura tu entrada.
        </p>
      </div>
      <Link href="/" className="btn-primary" style={{ textDecoration: "none", padding: "0.7rem 1.5rem", fontSize: "0.92rem" }}>
        Explorar eventos
      </Link>
    </div>
  );
}

function FilterEmptyState({
  filter,
  onReset,
}: {
  filter: TicketStatus | "ALL";
  onReset: () => void;
}) {
  const labelMap: Record<TicketStatus | "ALL", string> = {
    ALL: "Todos",
    VALID: "Válidos",
    USED: "Usados",
    CANCELLED: "Cancelados",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 240, gap: "1rem", textAlign: "center" }}>
      <div>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.05rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "0.4rem" }}>
          No hay tickets en “{labelMap[filter]}”
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
          Cambia de filtro para ver el resto de tus compras.
        </p>
      </div>
      <button onClick={onReset} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.82rem" }}>
        Ver todos
      </button>
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

  function handleCancelled(id: string) {
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: "CANCELLED" as TicketStatus } : t));
  }

  function handleTransferred(_id: string) {
    void loadTickets();
  }

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<TicketsResponse>("/tickets/my-tickets");
      setTickets(data.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/unauthorized|forbidden|401|403/i.test(message)) {
        router.replace("/");
        return;
      }
      setError("No pudimos cargar tus tickets. Verifica conexión e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

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
        background: "var(--nav-bg)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <VybxLogo size={24} textSize="1.4rem" />
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
            {loading ? "Cargando tus compras..." : `${counts.ALL} ticket${counts.ALL !== 1 ? "s" : ""} en total`}
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
          <div style={{ padding: "1rem 1.25rem", borderRadius: "var(--radius-xl)", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "#fda4af", display: "flex", gap: "0.75rem", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
              <AlertCircle size={16} /> {error}
            </span>
            <button
              onClick={() => void loadTickets()}
              className="btn-secondary"
              style={{ padding: "0.35rem 0.9rem", fontSize: "0.8rem" }}
            >
              Reintentar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          counts.ALL === 0
            ? <EmptyState />
            : <FilterEmptyState filter={filter} onReset={() => setFilter("ALL")} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {filtered.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} onCancelled={handleCancelled} onTransferred={handleTransferred} />
            ))}
          </div>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
