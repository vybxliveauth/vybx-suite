"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { Drawer } from "vaul";
import { MapPin, Zap, Flame, Music, Star, Ticket, Search, ArrowRight, ChevronLeft, ChevronRight, SlidersHorizontal, X, Menu } from "lucide-react";
import { VybxLogo } from "@/components/ui/VybxLogo";
import { useEvents } from "@/hooks/useEvents";
import { Event } from "@/types";
import { cn, formatPrice } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EventHighlightsCarousel } from "@/components/features/EventHighlightsCarousel";
import { EventCommandPalette } from "@/components/features/EventCommandPalette";
import { CartButton, CartDrawer } from "@/components/features/CartDrawer";
import { AuthModal } from "@/components/features/AuthModal";
import { FeaturedEventBentoCard } from "@/components/features/FeaturedEventBentoCard";
import { SafeEventImage } from "@/components/features/SafeEventImage";
import { ThemeToggle } from "@/components/features/ThemeToggle";
import { MobileNavDrawer } from "@/components/features/MobileNavDrawer";
import { SearchIllustration, EventsIllustration } from "@/components/features/EmptyStateIllustration";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useAuthStore } from "@/store/useAuthStore";

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase();
}

function formatCategoryLabel(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function categoryIconFor(value: string) {
  if (/electr|edm|house|techno/.test(value)) return Zap;
  if (/jazz/.test(value)) return Music;
  if (/indie|rock|alternative|alt/.test(value)) return Flame;
  if (/urban|reggaeton|hip hop|hip-hop|trap/.test(value)) return Ticket;
  return Star;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({
  onCartOpen,
  onAuthOpen,
  onCommandOpen,
}: {
  onCartOpen: () => void;
  onAuthOpen: () => void;
  onCommandOpen: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [menuOpen]);

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <VybxLogo size={26} textSize="1.5rem" />
      </Link>

      <div className="hidden-mobile" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "2.5rem" }}>
        <Link href="/#events" className="nav-link">Eventos</Link>
        <Link href="/#events" className="nav-link">Artistas</Link>
        <Link href="/#events" className="nav-link">Recintos</Link>
      </div>

      <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div className="hidden-mobile">
          <ThemeToggle />
        </div>

        <button
          onClick={onCommandOpen}
          className="btn-secondary nav-search-btn"
          style={{ padding: "0.45rem 0.8rem", fontSize: "0.82rem" }}
          aria-label="Abrir búsqueda rápida"
        >
          <Search size={14} />
          <span className="nav-search-label">Buscar</span>
          <span
            className="hidden-mobile"
            style={{
              fontSize: "0.68rem",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-pill)",
              padding: "0.08rem 0.4rem",
              color: "var(--text-muted)",
            }}
          >
            Ctrl K
          </span>
        </button>

        <CartButton onClick={onCartOpen} compactOnMobile />

        {user ? (
          <div ref={menuRef} style={{ position: "relative" }} className="hidden-mobile">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="nav-user-btn"
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-pill)", padding: "0.4rem 0.9rem 0.4rem 0.4rem",
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.75rem", fontWeight: 800, color: "#fff",
              }}>
                {user.firstName?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
              </div>
              <span className="hidden-mobile" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-light)" }}>
                {user.firstName || user.email.split("@")[0]}
              </span>
            </button>

            {menuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 0.5rem)", right: 0,
                background: "var(--bg-dark)", border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-xl)", padding: "0.5rem",
                minWidth: 160, boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                zIndex: 200,
              }}>
                <Link href="/profile" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "0.55rem 0.85rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", color: "var(--text-muted)", textDecoration: "none", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  Mi perfil
                </Link>
                <Link href="/my-tickets" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "0.55rem 0.85rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", color: "var(--text-muted)", textDecoration: "none", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  Mis tickets
                </Link>
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "0.55rem 0.85rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", color: "#f43f5e", background: "transparent", border: "none", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(244,63,94,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={onAuthOpen} className="btn-secondary nav-auth-btn hidden-mobile" style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem" }}>
            Ingresar
          </button>
        )}

        {/* Hamburger – mobile only */}
        <button
          onClick={() => setMobileNavOpen(true)}
          className="mobile-only"
          aria-label="Abrir menú"
          style={{
            width: 38,
            height: 38,
            borderRadius: "var(--radius-lg)",
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-light)",
          }}
        >
          <Menu size={20} />
        </button>
      </div>

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onAuthOpen={onAuthOpen}
      />
    </nav>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection({ onSearch }: { onSearch: (q: string) => void }) {
  const [search, setSearch] = useState("");

  const scrollToEvents = () =>
    document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(search);
    scrollToEvents();
  };

  return (
    <section style={{
      position: "relative",
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "6rem 5% 4rem",
      overflow: "hidden",
      textAlign: "center",
    }}>
      {/* ── Animated mesh background ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {/* Base gradient */}
        <div className="hero-bg-radial" style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.4), transparent)",
        }} />
        {/* Orbs */}
        <div className="orb" style={{ width: 700, height: 700, background: "var(--accent-secondary)", top: "-200px", left: "50%", transform: "translateX(-50%)", opacity: 0.25, animationDelay: "0s" }} />
        <div className="orb" style={{ width: 400, height: 400, background: "var(--accent-primary)", bottom: "-50px", left: "5%", opacity: 0.18, animationDelay: "-10s" }} />
        <div className="orb" style={{ width: 350, height: 350, background: "var(--accent-tertiary)", bottom: "10%", right: "5%", opacity: 0.12, animationDelay: "-5s" }} />
        {/* Bottom fade to body */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
          background: "linear-gradient(to bottom, transparent, var(--bg-dark))",
        }} />
      </div>

      {/* ── Content ── */}
      <div style={{ position: "relative", zIndex: 2, maxWidth: 820, width: "100%" }}>

        {/* Headline */}
        <h1 className="fade-in-up" style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(3.2rem, 8vw, 7rem)",
          fontWeight: 900,
          letterSpacing: "-3px",
          lineHeight: 1.02,
          marginBottom: "2.25rem",
          animationDelay: "0s",
        }}>
          Tu próxima{" "}
          <span className="gradient-text">experiencia</span>
          <br />
          empieza aquí.
        </h1>

        {/* Subtitle */}
        <p className="fade-in-up" style={{
          fontSize: "clamp(1.05rem, 2vw, 1.3rem)",
          color: "var(--text-muted)",
          lineHeight: 1.7,
          maxWidth: 560,
          margin: "0 auto 3rem",
          animationDelay: "0.1s",
        }}>
          Descubre conciertos, festivales y eventos en vivo. Compra tus tickets en segundos, sin filas, sin complicaciones.
        </p>

        {/* Search bar — centered, prominent */}
        <form
          onSubmit={handleSearch}
          className="fade-in-up search-bar"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            borderRadius: "var(--radius-pill)",
            maxWidth: 580,
            margin: "0 auto",
            animationDelay: "0.2s",
          }}
        >
          <Search size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Busca un artista, evento o lugar..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: "1rem", color: "var(--text-light)",
              fontFamily: "var(--font-body)", minWidth: 0,
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ padding: "0.65rem 1.5rem", fontSize: "0.9rem", flexShrink: 0 }}
          >
            Buscar
          </button>
        </form>

      </div>

    </section>
  );
}

// ─── Event Card Skeleton ──────────────────────────────────────────────────────

function EventCardSkeleton() {
  return (
    <div className="glass-card" style={{ pointerEvents: "none" }}>
      <Skeleton style={{ width: "100%", height: 250, borderRadius: 0 }} />
      <div style={{ padding: "1.25rem 1.5rem 1rem" }}>
        <Skeleton style={{ width: 60, height: 22, borderRadius: "var(--radius-pill)", marginBottom: "0.65rem" }} />
        <Skeleton style={{ width: "75%", height: 22, marginBottom: "0.5rem" }} />
        <Skeleton style={{ width: "55%", height: 16 }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.5rem", borderTop: "1px solid var(--glass-border)" }}>
        <Skeleton style={{ width: 70, height: 28 }} />
        <Skeleton style={{ width: 90, height: 36, borderRadius: "var(--radius-pill)" }} />
      </div>
    </div>
  );
}

const FEATURED_BENTO_LAYOUT = [
  "md:col-span-2 md:row-span-2",
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-1",
  "md:col-span-2 md:row-span-1",
] as const;

function FeaturedEventBentoSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative min-h-[260px] overflow-hidden rounded-3xl bg-black/20 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl",
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-white/[0.07]" />
      <div className="absolute inset-0 -translate-x-full animate-[bentoShimmer_2.2s_linear_infinite] bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.2)_45%,transparent_70%)]" />
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
        <div className="mb-3 h-5 w-28 rounded-full bg-white/15" />
        <div className="mb-2 h-8 w-[78%] rounded-md bg-white/20" />
        <div className="mb-4 h-8 w-[62%] rounded-md bg-white/12" />
        <div className="flex items-center justify-between gap-3">
          <div className="h-11 w-28 rounded-md bg-white/15" />
          <div className="h-10 w-28 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string | null {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days <= 7) return `En ${days} días`;
  return null;
}

function EventCard({ event, index = 0 }: { event: Event; index?: number }) {
  const href = `/events/${event.slug}`;
  const date = new Date(event.startDate);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const minPrice = event.tiers.length > 0 ? Math.min(...event.tiers.map((t) => t.price)) : null;
  const totalStock = event.tiers.reduce((acc, t) => acc + t.stock, 0);
  const isLowStock = totalStock > 0 && totalStock <= 50;
  const isSoldOut = totalStock === 0;
  const isHighDemand = event.tiers.some((t) => t.stock < 100 && t.stock > 0);
  const relDate = formatRelativeDate(event.startDate);

  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <div className="glass-card reveal" style={{ cursor: "pointer", position: "relative", transitionDelay: `${index * 0.06}s` }}>
        <div className="image-wrapper">
          <SafeEventImage
            src={event.imageUrl}
            alt={event.title}
            className="card-image"
          />
          {isSoldOut && (
            <div
              aria-label="Evento agotado"
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 3,
              }}>
              <span style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.1rem",
                fontWeight: 800,
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "2px",
                background: "rgba(244,63,94,0.85)",
                padding: "0.5rem 1.5rem",
                borderRadius: "var(--radius-pill)",
              }}>
                Agotado
              </span>
            </div>
          )}
          <div className="date-badge">
            <span className="day">{day}</span>
            <span className="month">{month}</span>
          </div>
          {isHighDemand && !isSoldOut && (
            <div className="badge-demand" style={{ position: "absolute", bottom: "0.75rem", left: "0.75rem", fontSize: "0.65rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Flame size={10} /> Alta demanda
            </div>
          )}
          {isLowStock && !isSoldOut && (
            <div style={{
              position: "absolute",
              bottom: "0.75rem",
              right: "0.75rem",
              fontSize: "0.62rem",
              fontWeight: 700,
              padding: "0.25rem 0.6rem",
              borderRadius: "var(--radius-pill)",
              background: "rgba(251,146,60,0.9)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              zIndex: 3,
            }}>
              <Ticket size={10} />
              ¡Últimos {totalStock}!
            </div>
          )}
          {event.isFeatured && (
            <div className="badge-featured" style={{ position: "absolute", top: "0.75rem", right: "0.75rem", fontSize: "0.65rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Star size={10} /> Destacado
            </div>
          )}
        </div>

        <div style={{ padding: "1.25rem 1.5rem 1rem", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.65rem" }}>
            <span className="badge-tag">
              {event.tags[0] ?? "Event"}
            </span>
            {relDate && (
              <span style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: relDate === "Hoy" || relDate === "Mañana" ? "var(--accent-primary)" : "var(--accent-tertiary)",
              }}>
                {relDate}
              </span>
            )}
          </div>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.15rem", fontWeight: 800, marginBottom: "0.5rem", lineHeight: 1.2, color: "var(--text-light)" }}>
            {event.title}
          </h3>
          <p style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            <MapPin size={13} color="var(--accent-primary)" />
            {event.venue.name}{event.venue.city ? `, ${event.venue.city}` : ""}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.5rem", borderTop: "1px solid var(--glass-border)", position: "relative", zIndex: 2 }}>
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "0.1rem" }}>Desde</p>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", fontWeight: 800, color: "var(--text-light)" }}>
              {minPrice != null ? formatPrice(minPrice, event.tiers[0].currency) : "—"}
            </p>
          </div>
          <button className="btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}>
            {isSoldOut ? "Ver detalles" : "Comprar"} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </Link>
  );
}

// ─── Events Section ───────────────────────────────────────────────────────────

const PAGE_SIZE = 9;

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;

  // Build page numbers: always show first, last, current ±1, and ellipsis gaps
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <nav className="pagination" aria-label="Paginación de eventos">
      <button
        className="pagination-btn"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} style={{ color: "var(--text-muted)", padding: "0 0.2rem", fontSize: "0.88rem" }}>
            …
          </span>
        ) : (
          <button
            key={p}
            className={`pagination-btn${p === page ? " active" : ""}`}
            onClick={() => onPage(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        className="pagination-btn"
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        aria-label="Página siguiente"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}

function EventsSection({ allEvents, isLoading, isError, search, onSearch }: {
  allEvents: Event[];
  isLoading: boolean;
  isError: boolean;
  search: string;
  onSearch: (q: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const sectionRef = useRef<HTMLDivElement>(null);
  useScrollReveal();
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    allEvents.forEach((event) => {
      event.tags.forEach((tag) => {
        const key = normalizeCategory(tag);
        if (!key || map.has(key)) return;
        map.set(key, formatCategoryLabel(tag));
      });
    });
    const dynamic = Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([key, label]) => ({
        key,
        label,
        icon: categoryIconFor(key),
      }));

    return [{ key: "all", label: "Todos", icon: Star }, ...dynamic];
  }, [allEvents]);

  useEffect(() => {
    if (!categoryOptions.some((category) => category.key === activeCategory)) {
      setActiveCategory("all");
    }
  }, [categoryOptions, activeCategory]);

  const q = search.trim().toLowerCase();
  const filtered = allEvents
    .filter((event) => {
      if (activeCategory === "all") return true;
      return event.tags.some((tag) => normalizeCategory(tag) === activeCategory);
    })
    .filter((e) =>
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.venue.name.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
    );

  const showcaseEvents = useMemo(() => {
    if (filtered.length === 0) return [];
    const featured = filtered
      .filter((event) => event.isFeatured)
      .map((event) => ({ event, highlight: "featured" as const }));

    const trending = filtered
      .filter((event) => !event.isFeatured)
      .sort((a, b) => {
        const scoreDiff = (b.trendingScore ?? 0) - (a.trendingScore ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      })
      .map((event) => ({ event, highlight: "trending" as const }));

    return [...featured, ...trending].slice(0, 4);
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const paginatedIds = useMemo(
    () => paginated.map((event) => event.id).join("|"),
    [paginated]
  );

  // Reset to page 1 whenever the filtered set changes
  useEffect(() => { setPage(1); }, [search, activeCategory]);

  const scrollToSection = useCallback(() => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handlePage = useCallback((p: number) => {
    setPage(p);
    scrollToSection();
  }, [scrollToSection]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("active"); }),
      { threshold: 0.1 }
    );
    const cards = sectionRef.current?.querySelectorAll(".reveal");
    cards?.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [paginatedIds]);

  return (
    <section id="events" style={{ padding: "4.6rem var(--page-inline)" }} ref={sectionRef}>
      <div className="section-shell">
      <div className="events-section-header" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 800, letterSpacing: "-1px" }}>
            Próximos Eventos
          </h2>
          {!isLoading && filtered.length > 0 && (
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>
              {filtered.length} {filtered.length === 1 ? "evento" : "eventos"}
            </span>
          )}
        </div>
        <button
          className="events-filter-mobile-btn"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal size={15} />
          Filtros
        </button>
      </div>

      <div className="events-filter-desktop-row" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2.5rem" }}>
        {categoryOptions.map(({ key, label, icon: Icon }) => (
          <button key={key} className={`chip ${activeCategory === key ? "active" : ""}`} onClick={() => setActiveCategory(key)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {isError && (
        <div style={{ padding: "1rem 1.25rem", borderRadius: "var(--radius-xl)", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          Sin conexión al backend. Intenta de nuevo en unos segundos.
        </div>
      )}

      {(isLoading || showcaseEvents.length > 0) && (
        <div className="showcase-shell" style={{ marginBottom: "2.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "1rem" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.2rem, 2vw, 1.45rem)", fontWeight: 800, letterSpacing: "-0.5px" }}>
              Destacados y Tendencias
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[240px] lg:auto-rows-[250px]">
            {isLoading
              ? FEATURED_BENTO_LAYOUT.map((layout, index) => (
                  <FeaturedEventBentoSkeleton key={`featured-skeleton-${index}`} className={layout} />
                ))
              : showcaseEvents.map(({ event, highlight }, index) => (
                  <FeaturedEventBentoCard
                    key={`featured-${event.id}`}
                    event={event}
                    highlight={highlight}
                    priority={index === 0 ? "high" : "normal"}
                    className={FEATURED_BENTO_LAYOUT[index] ?? "md:col-span-1 md:row-span-1"}
                  />
                ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {isLoading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <EventCardSkeleton key={i} />)
          : paginated.length === 0
            ? (
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "3.5rem 1rem", gap: "1.25rem" }}>
                {search ? <SearchIllustration size={110} /> : <EventsIllustration size={110} />}
                <div>
                  <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", fontWeight: 800, color: "var(--text-light)", marginBottom: "0.4rem" }}>
                    {search ? `Sin resultados para "${search}"` : "No hay eventos publicados todavía"}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", maxWidth: "34ch", margin: "0 auto", lineHeight: 1.5 }}>
                    {search
                      ? "Intenta con otro término o explora todas las categorías."
                      : "Estamos preparando experiencias increíbles. Vuelve pronto."}
                  </p>
                </div>
                {search && (
                  <button onClick={() => onSearch("")} className="btn-secondary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}>
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            )
            : paginated.map((event, i) => <EventCard key={event.id} event={event} index={i} />)
        }
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={handlePage} />
      </div>

      <Drawer.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Drawer.Portal>
          <Drawer.Overlay
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(3px)",
              zIndex: 1500,
            }}
          />
          <Drawer.Content
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1501,
              background: "var(--bg-dark)",
              borderTop: "1px solid var(--glass-border)",
              borderTopLeftRadius: "1.2rem",
              borderTopRightRadius: "1.2rem",
              maxHeight: "82vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.2)", margin: "0.55rem auto 0.3rem" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.8rem 1rem 0.85rem", borderBottom: "1px solid var(--glass-border)" }}>
              <Drawer.Title style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 800, color: "var(--text-light)" }}>
                Filtrar eventos
              </Drawer.Title>
              <Drawer.Close asChild>
                <button
                  aria-label="Cerrar filtros"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    border: "1px solid var(--glass-border)",
                    background: "var(--glass-bg)",
                    color: "var(--text-muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              </Drawer.Close>
            </div>

            <div style={{ overflowY: "auto", padding: "1rem", display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
              {categoryOptions.map(({ key, label, icon: Icon }) => (
                <button
                  key={`mobile-filter-${key}`}
                  className={`chip ${activeCategory === key ? "active" : ""}`}
                  onClick={() => {
                    setActiveCategory(key);
                    setFiltersOpen(false);
                  }}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function FooterLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  const style: React.CSSProperties = {
    fontSize: "0.84rem",
    color: "var(--text-muted)",
    textDecoration: "none",
    transition: "color 0.2s",
    display: "block",
    padding: "0.2rem 0",
  };

  if (external) {
    return (
      <a
        href={href}
        style={style}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text-light)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        {label}
      </a>
    );
  }

  return (
    <Link
      href={href}
      style={style}
      onMouseEnter={e => (e.currentTarget.style.color = "var(--text-light)")}
      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
    >
      {label}
    </Link>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--glass-border)", marginTop: "auto" }}>
      {/* Main footer grid */}
      <div className="footer-grid" style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
        gap: "2.5rem",
        padding: "3.5rem var(--page-inline) 3rem",
        maxWidth: "var(--content-max)",
        margin: "0 auto",
      }}>
        {/* Brand column */}
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <VybxLogo size={26} textSize="1.5rem" />
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, maxWidth: "28ch" }}>
            Tu plataforma para descubrir y comprar tickets de los mejores eventos en vivo.
          </p>
          {/* Social icons */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            {[
              { label: "Instagram", d: "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3Z" },
              { label: "TikTok", d: "M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64c0 3.33 2.76 5.7 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" },
            ].map((social) => (
              <a
                key={social.label}
                href="#"
                aria-label={social.label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = "var(--accent-primary)";
                  e.currentTarget.style.borderColor = "var(--accent-primary)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.borderColor = "var(--glass-border)";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={social.d} /></svg>
              </a>
            ))}
          </div>
        </div>

        {/* Plataforma column */}
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--text-light)", marginBottom: "0.85rem" }}>
            Plataforma
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <FooterLink href="/#events" label="Explorar eventos" />
            <FooterLink href="/my-tickets" label="Mis tickets" />
            <FooterLink href="/profile" label="Mi cuenta" />
          </div>
        </div>

        {/* Legal column */}
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--text-light)", marginBottom: "0.85rem" }}>
            Legal
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <FooterLink href="/privacidad" label="Privacidad" />
            <FooterLink href="/terminos" label="Términos de uso" />
          </div>
        </div>

        {/* Contacto column */}
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--text-light)", marginBottom: "0.85rem" }}>
            Contacto
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <FooterLink href="mailto:soporte@vybxlive.com" label="soporte@vybxlive.com" external />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: "1px solid var(--glass-border)",
        padding: "1.25rem var(--page-inline)",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0.5rem",
      }}>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>
          © {new Date().getFullYear()} Vybx. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { rehydrate } = useAuthStore();

  useEffect(() => { rehydrate(); }, [rehydrate]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError } = useEvents(1, 100, debouncedSearch || undefined);
  const events = data?.data ?? [];

  return (
    <>
      <Navbar
        onCartOpen={() => setCartOpen(true)}
        onAuthOpen={() => setAuthOpen(true)}
        onCommandOpen={() => setCommandOpen(true)}
      />
      <main id="main-content" style={{ paddingTop: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
          <HeroSection onSearch={setSearch} />
          <EventHighlightsCarousel events={events} />
        </div>
        <EventsSection allEvents={events} isLoading={isLoading} isError={isError} search={search} onSearch={setSearch} />
      </main>
      <Footer />
      <EventCommandPalette
        events={events}
        open={commandOpen}
        onOpenChange={setCommandOpen}
      />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
