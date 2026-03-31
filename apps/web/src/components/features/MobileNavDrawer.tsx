"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, Ticket, User, LogOut, Moon, Sun, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/useAuthStore";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  onAuthOpen: () => void;
}

const NAV_LINKS = [
  { href: "/#events", label: "Eventos" },
  { href: "/#events", label: "Artistas" },
  { href: "/#events", label: "Recintos" },
];

export function MobileNavDrawer({ open, onClose, onAuthOpen }: MobileNavDrawerProps) {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 1600,
            }}
          />

          {/* Drawer panel */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(320px, 85vw)",
              background: "var(--bg-dark)",
              borderLeft: "1px solid var(--glass-border)",
              zIndex: 1601,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1.1rem 1.25rem",
              borderBottom: "1px solid var(--glass-border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Zap size={20} color="var(--accent-primary)" />
                <span style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.3rem",
                  fontWeight: 900,
                  letterSpacing: "-0.5px",
                  color: "var(--text-light)",
                }}>
                  vybx
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar menú"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* User section */}
            {user && (
              <div style={{
                padding: "1.25rem",
                borderBottom: "1px solid var(--glass-border)",
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
              }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  fontWeight: 800,
                  color: "#fff",
                  flexShrink: 0,
                }}>
                  {user.firstName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "var(--text-light)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {user.firstName} {user.lastName}
                  </p>
                  <p style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {user.email}
                  </p>
                </div>
              </div>
            )}

            {/* Nav links */}
            <div style={{ padding: "0.75rem 0.75rem", flex: 1 }}>
              <p style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1.2px",
                color: "var(--text-muted)",
                padding: "0 0.5rem",
                marginBottom: "0.5rem",
              }}>
                Explorar
              </p>

              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={onClose}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.7rem",
                    padding: "0.75rem 0.75rem",
                    borderRadius: "var(--radius-lg)",
                    color: "var(--text-light)",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {link.label}
                </Link>
              ))}

              {user && (
                <>
                  <div style={{
                    height: 1,
                    background: "var(--glass-border)",
                    margin: "0.75rem 0.5rem",
                  }} />
                  <p style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1.2px",
                    color: "var(--text-muted)",
                    padding: "0 0.5rem",
                    marginBottom: "0.5rem",
                  }}>
                    Mi cuenta
                  </p>

                  <Link
                    href="/profile"
                    onClick={onClose}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.7rem",
                      padding: "0.75rem 0.75rem",
                      borderRadius: "var(--radius-lg)",
                      color: "var(--text-light)",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-bg)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <User size={18} color="var(--text-muted)" />
                    Mi perfil
                  </Link>

                  <Link
                    href="/my-tickets"
                    onClick={onClose}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.7rem",
                      padding: "0.75rem 0.75rem",
                      borderRadius: "var(--radius-lg)",
                      color: "var(--text-light)",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-bg)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <Ticket size={18} color="var(--text-muted)" />
                    Mis tickets
                  </Link>
                </>
              )}
            </div>

            {/* Footer actions */}
            <div style={{
              padding: "1rem 1.25rem",
              paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
              borderTop: "1px solid var(--glass-border)",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}>
              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.7rem",
                  padding: "0.75rem",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-light)",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                  transition: "background 0.15s",
                }}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                {theme === "dark" ? "Modo claro" : "Modo oscuro"}
              </button>

              {user ? (
                <button
                  onClick={() => { logout(); onClose(); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.7rem",
                    padding: "0.75rem",
                    borderRadius: "var(--radius-lg)",
                    background: "rgba(244, 63, 94, 0.08)",
                    border: "1px solid rgba(244, 63, 94, 0.2)",
                    color: "#f43f5e",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  <LogOut size={18} />
                  Cerrar sesión
                </button>
              ) : (
                <button
                  onClick={() => { onAuthOpen(); onClose(); }}
                  className="btn-primary"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    padding: "0.85rem",
                    fontSize: "0.95rem",
                  }}
                >
                  Ingresar
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
