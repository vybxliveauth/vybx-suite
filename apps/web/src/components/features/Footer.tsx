"use client";

import Link from "next/link";
import { VybxLogo } from "@/components/ui/VybxLogo";

function FooterLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  if (external) {
    return (
      <a href={href} className="footer-link" target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className="footer-link">
      {label}
    </Link>
  );
}

const SOCIAL_ICONS = [
  {
    label: "Instagram",
    href: "#",
    d: "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3Z",
  },
  {
    label: "TikTok",
    href: "#",
    d: "M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64c0 3.33 2.76 5.7 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z",
  },
];

export function Footer({ showCta = false }: { showCta?: boolean }) {
  const showBottomBar = !showCta;

  return (
    <footer className={`footer-shell${showCta ? " footer-shell-with-cta" : ""}`}>
      {/* Main grid */}
      <div
        className="section-shell"
        style={{
          padding: showCta
            ? "2.15rem var(--page-inline) 2.35rem"
            : "3.5rem var(--page-inline) 3rem",
        }}
      >
        {showCta && (
          <div className="footer-cta surface-panel-soft">
            <div>
              <p className="footer-cta-title">Listo para tu próxima experiencia en vivo</p>
              <p className="footer-cta-copy">Explora eventos, compra en segundos y gestiona todo desde tu cuenta.</p>
            </div>
            <Link href="/#events" className="btn-primary" style={{ textDecoration: "none", padding: "0.56rem 1.15rem", fontSize: "0.84rem", whiteSpace: "nowrap" }}>
              Ver eventos
            </Link>
          </div>
        )}

        <div className="footer-grid" style={{ display: "grid", gap: "2.5rem" }}>
        {/* Brand */}
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <VybxLogo size={26} textSize="1.5rem" />
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, maxWidth: "28ch" }}>
            Tu plataforma para descubrir y comprar tickets para los mejores eventos en vivo.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            {SOCIAL_ICONS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="footer-social-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d={s.d} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* Plataforma */}
        <div>
          <p className="footer-col-heading">Plataforma</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <FooterLink href="/#events" label="Explorar eventos" />
            <FooterLink href="/my-tickets" label="Mis tickets" />
            <FooterLink href="/profile" label="Mi cuenta" />
          </div>
        </div>

        {/* Legal */}
        <div>
          <p className="footer-col-heading">Legal</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <FooterLink href="/privacidad" label="Política de privacidad" />
            <FooterLink href="/terminos" label="Términos de servicio" />
          </div>
        </div>

        {/* Soporte */}
        <div>
          <p className="footer-col-heading">Soporte</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <FooterLink href="mailto:support@vybxlive.com" label="support@vybxlive.com" external />
          </div>
        </div>
        </div>
      </div>

      {/* Bottom bar */}
      {showBottomBar && (
        <div
          className="footer-bottom-bar"
          style={{
            padding: "1.25rem var(--page-inline)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>
            © {new Date().getFullYear()} Vybx. Todos los derechos reservados.
          </p>
        </div>
      )}
    </footer>
  );
}
