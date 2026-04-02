"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
  X,
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
  return new Intl.DateTimeFormat("es", {
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
    VALID:     { label: "Válido",    color: "#4ade80", bg: "rgba(34,197,94,0.14)",  border: "rgba(34,197,94,0.35)",  Icon: CheckCircle2 },
    USED:      { label: "Usado",     color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", Icon: Clock },
    CANCELLED: { label: "Cancelado", color: "#f43f5e", bg: "rgba(244,63,94,0.12)",  border: "rgba(244,63,94,0.35)",  Icon: XCircle },
  }[status];

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.35rem",
      padding: "0.22rem 0.7rem",
      borderRadius: "var(--radius-pill)",
      background: config.bg,
      border: `1px solid ${config.border}`,
      color: config.color,
      fontSize: "0.7rem",
      fontWeight: 700,
      letterSpacing: "0.02em",
      backdropFilter: "blur(8px)",
    }}>
      <config.Icon size={11} />
      {config.label}
    </span>
  );
}

// ─── Portal overlay base ──────────────────────────────────────────────────────

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────

function QRModal({ ticket, onClose }: { ticket: BackendTicket; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const { event } = ticket.ticketType;

  return (
    <ModalPortal>
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1.5rem",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{
          width: "100%", maxWidth: 360,
          background: "var(--card-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-2xl)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            padding: "1.25rem 1.5rem 1rem",
            borderBottom: "1px dashed var(--glass-border)",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem",
          }}>
            <div>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-primary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                Tu ticket
              </p>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 800, color: "var(--text-light)", lineHeight: 1.25 }}>
                {event.title}
              </h2>
              <span className="ticket-type-badge" style={{ marginTop: "0.4rem", display: "inline-block" }}>
                {ticket.ticketType.name}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--glass-border)",
                borderRadius: "50%",
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "var(--text-muted)", flexShrink: 0,
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* QR */}
          <div style={{
            padding: "2rem 1.5rem",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem",
          }}>
            <div style={{
              padding: "1rem",
              background: "#fff",
              borderRadius: "var(--radius-xl)",
              boxShadow: "0 0 0 6px rgba(124,58,237,0.08)",
            }}>
              <QRCodeSVG
                value={ticket.qrCode ?? ticket.id}
                size={200}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>ID del ticket</p>
              <code style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontFamily: "monospace", wordBreak: "break-all" }}>
                {ticket.id}
              </code>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            borderTop: "1px dashed var(--glass-border)",
            padding: "1rem 1.5rem",
            display: "flex", flexDirection: "column", gap: "0.4rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              <CalendarDays size={13} color="var(--accent-primary)" />
              {formatDate(event.date)}
            </div>
            {event.location && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                <MapPin size={13} color="var(--accent-primary)" />
                {event.location}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, loading]);

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
    <ModalPortal>
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
        }}
        onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      >
        <div style={{
          width: "100%", maxWidth: 420,
          background: "var(--card-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-2xl)",
          padding: "1.75rem",
          display: "flex", flexDirection: "column", gap: "1.25rem",
        }}>
          {success ? (
            <>
              <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 1rem",
                }}>
                  <CheckCircle2 size={30} color="#4ade80" />
                </div>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "0.5rem" }}>
                  ¡Ticket transferido!
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                  Tu ticket fue enviado a{" "}
                  <strong style={{ color: "var(--text-light)" }}>{recipientEmail}</strong>.
                  Recibirá un correo de confirmación.
                </p>
              </div>
              <button
                onClick={() => { onTransferred(ticket.id); onClose(); }}
                className="btn-primary"
                style={{ width: "100%", padding: "0.7rem", fontSize: "0.9rem", textAlign: "center" }}
              >
                Listo
              </button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
                <div>
                  <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.15rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "0.2rem" }}>
                    Transferir ticket
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    {ticket.ticketType.event.title} · <span className="ticket-type-badge" style={{ fontSize: "0.7rem" }}>{ticket.ticketType.name}</span>
                  </p>
                </div>
                <button
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "50%",
                    width: 30, height: 30,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "var(--text-muted)", flexShrink: 0,
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{
                padding: "0.7rem 1rem",
                background: "rgba(251,191,36,0.06)",
                border: "1px solid rgba(251,191,36,0.18)",
                borderRadius: "var(--radius-xl)",
                color: "#fbbf24",
                fontSize: "0.78rem",
                lineHeight: 1.55,
              }}>
                Esta acción es permanente — el ticket pasará al nuevo propietario y desaparecerá de tu lista.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Correo del destinatario
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
                  placeholder="ejemplo@correo.com"
                  disabled={loading}
                  autoFocus
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
                  display: "flex", alignItems: "flex-start", gap: "0.5rem",
                  padding: "0.65rem 0.9rem",
                  background: "rgba(244,63,94,0.08)",
                  border: "1px solid rgba(244,63,94,0.22)",
                  borderRadius: "var(--radius-xl)",
                  color: "#fda4af",
                  fontSize: "0.8rem",
                  lineHeight: 1.5,
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="btn-secondary"
                  style={{ flex: 1, padding: "0.65rem", fontSize: "0.875rem", textAlign: "center" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void handleSubmit()}
                  disabled={loading || !recipientEmail.trim()}
                  style={{
                    flex: 1, padding: "0.65rem",
                    background: loading || !recipientEmail.trim() ? "rgba(124,58,237,0.25)" : "var(--accent-primary)",
                    border: "none",
                    borderRadius: "var(--radius-xl)",
                    color: loading || !recipientEmail.trim() ? "rgba(255,255,255,0.4)" : "#fff",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-body)",
                    cursor: loading || !recipientEmail.trim() ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                    transition: "all 0.2s",
                  }}
                >
                  {loading
                    ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                    : <Send size={15} />}
                  {loading ? "Transfiriendo…" : "Transferir"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
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
  const [showQR, setShowQR] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const isValid = ticket.status === "VALID";
  const isUsed = ticket.status === "USED";

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
    <>
      <div className="ticket-card">
        {/* ── Image header with overlaid title ── */}
        <div style={{ position: "relative", height: 165, overflow: "hidden", flexShrink: 0 }}>
          {event.image ? (
            <SafeEventImage
              src={event.image}
              alt={event.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: "linear-gradient(135deg, rgba(124,58,237,0.45) 0%, rgba(255,42,95,0.25) 100%)",
            }} />
          )}

          {/* Gradient overlay — stronger at bottom for title readability */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(10,8,20,0.96) 0%, rgba(10,8,20,0.4) 55%, transparent 100%)",
          }} />

          {/* USED/CANCELLED stamp */}
          {!isValid && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.6rem",
                fontWeight: 900,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: isUsed ? "rgba(148,163,184,0.45)" : "rgba(244,63,94,0.45)",
                border: `3px solid ${isUsed ? "rgba(148,163,184,0.3)" : "rgba(244,63,94,0.3)"}`,
                borderRadius: 6,
                padding: "0.15rem 0.6rem",
                transform: "rotate(-18deg)",
                pointerEvents: "none",
                userSelect: "none",
              }}>
                {isUsed ? "Usado" : "Cancelado"}
              </span>
            </div>
          )}

          {/* Status badge — top right */}
          <div style={{ position: "absolute", top: "0.7rem", right: "0.7rem" }}>
            <StatusBadge status={ticket.status} />
          </div>

          {/* Title overlay — bottom of image */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 1.1rem 0.9rem" }}>
            <h3 style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.95rem",
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.25,
              marginBottom: "0.35rem",
              textShadow: "0 1px 4px rgba(0,0,0,0.6)",
            }}>
              {event.title}
            </h3>
            <span className="ticket-type-badge">{ticket.ticketType.name}</span>
          </div>

          {/* Punch holes at bottom edge */}
          <div style={{ position: "absolute", bottom: -7, left: -7, width: 14, height: 14, borderRadius: "50%", background: "var(--bg-dark)", border: "1px solid var(--glass-border)", zIndex: 1 }} />
          <div style={{ position: "absolute", bottom: -7, right: -7, width: 14, height: 14, borderRadius: "50%", background: "var(--bg-dark)", border: "1px solid var(--glass-border)", zIndex: 1 }} />
        </div>

        {/* Dashed perforation */}
        <div style={{ borderTop: "1.5px dashed rgba(255,255,255,0.08)", margin: "0 0.75rem" }} />

        {/* ── Info section ── */}
        <div style={{ padding: "1rem 1.1rem 1.1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {/* Date & location */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              <CalendarDays size={12} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              {formatDate(event.date)}
            </div>
            {event.location && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                <MapPin size={12} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                {event.location}
              </div>
            )}
          </div>

          {/* Price + actions row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <div>
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "0.1rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Precio</p>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.05rem", fontWeight: 800, color: "var(--text-light)" }}>
                {formatPrice(ticket.ticketType.price)}
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {isValid && (
                <AddToCalendarButton
                  compact
                  event={{
                    title: event.title,
                    startDate: event.date,
                    location: event.location ?? undefined,
                  }}
                />
              )}
              {ticket.qrCode && isValid && (
                <button
                  onClick={() => setShowQR(true)}
                  className="ticket-btn ticket-btn-violet"
                >
                  <QrCode size={13} />
                  Ver QR
                </button>
              )}
              {isValid && (
                <button
                  onClick={() => setShowTransfer(true)}
                  className="ticket-btn ticket-btn-violet"
                >
                  <Send size={13} />
                  Transferir
                </button>
              )}
              {isValid && (
                <button
                  onClick={() => void handleCancel()}
                  disabled={cancelling}
                  className="ticket-btn ticket-btn-danger"
                >
                  <XCircle size={13} />
                  {cancelling ? "…" : "Cancelar"}
                </button>
              )}
            </div>
          </div>

          {/* Ticket ID */}
          <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.2)", fontFamily: "monospace", letterSpacing: "0.02em" }}>
            {ticket.id.slice(0, 24)}…
          </p>
        </div>
      </div>

      {/* Modals — rendered via portal to avoid stacking context issues */}
      {showQR && ticket.qrCode && (
        <QRModal ticket={ticket} onClose={() => setShowQR(false)} />
      )}
      {showTransfer && (
        <TransferModal
          ticket={ticket}
          onClose={() => setShowTransfer(false)}
          onTransferred={(id) => {
            setShowTransfer(false);
            onTransferred(id);
          }}
        />
      )}
    </>
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
          No hay tickets en &ldquo;{labelMap[filter]}&rdquo;
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

  function handleTransferred(_: string) {
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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
                className={`chip${filter === f ? " active" : ""}`}
              >
                {{ ALL: "Todos", VALID: "Válidos", USED: "Usados", CANCELLED: "Cancelados" }[f]}
                <span style={{ opacity: 0.65, fontSize: "0.75em" }}>({counts[f]})</span>
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
          <div className="tickets-grid">
            {filtered.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} onCancelled={handleCancelled} onTransferred={handleTransferred} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
