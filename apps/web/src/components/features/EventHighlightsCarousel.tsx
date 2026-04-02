"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { SafeEventImage } from "@/components/features/SafeEventImage";
import { Event } from "@/types";

function formatEventDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
  });
}

function pickSlides(events: Event[]) {
  if (events.length === 0) return [];
  const featured = events.filter((event) => event.isFeatured);
  const trending = events
    .filter((event) => !event.isFeatured)
    .sort((a, b) => {
      const scoreDiff = (b.trendingScore ?? 0) - (a.trendingScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  return [...featured, ...trending].slice(0, 10);
}

export function EventHighlightsCarousel({ events }: { events: Event[] }) {
  const slides = useMemo(() => pickSlides(events), [events]);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: slides.length > 3,
    dragFree: false,
    slidesToScroll: 1,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateState = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setScrollSnaps(emblaApi.scrollSnapList());
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
    updateState();
    emblaApi.on("select", updateState);
    emblaApi.on("reInit", updateState);
    return () => {
      emblaApi.off("select", updateState);
      emblaApi.off("reInit", updateState);
    };
  }, [emblaApi, slides.length, updateState]);

  useEffect(() => {
    if (!emblaApi || slides.length < 2) return;
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      if (!isHovered) emblaApi.scrollNext();
    }, 4500);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [emblaApi, slides.length, isHovered]);

  if (slides.length === 0) return null;

  return (
    <section
      style={{
        padding: "0 var(--page-inline) 0.35rem",
        marginTop: "-1.15rem",
        borderTop: "none",
        borderBottom: "none",
        background: "transparent",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="section-shell" style={{ position: "relative", overflow: "clip" }}>
      {/* Carousel viewport */}
      <div ref={emblaRef} style={{ overflow: "hidden" }}>
        <div className="event-carousel-track">
          {slides.map((event) => (
            <div key={event.id} className="event-carousel-slide">
              <Link
                href={`/events/${event.slug}`}
                style={{ display: "block", textDecoration: "none" }}
              >
                <article className="event-carousel-card">
                  {/* Background image */}
                  <SafeEventImage
                    src={event.imageUrl}
                    alt={event.title}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />

                  {/* Gradient overlays */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.78) 75%, rgba(0,0,0,0.92) 100%)",
                    }}
                  />

                  {/* Top row: featured badge + date */}
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      left: 14,
                      right: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    {event.isFeatured ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          borderRadius: "var(--radius-pill)",
                          fontSize: "0.68rem",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          padding: "0.25rem 0.6rem",
                          fontWeight: 700,
                          color: "#fff",
                          background: "var(--accent-primary)",
                          boxShadow: "0 0 14px rgba(255,42,95,0.5)",
                        }}
                      >
                        <Star size={9} fill="currentColor" />
                        Destacado
                      </span>
                    ) : (
                      <span />
                    )}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: "var(--radius-pill)",
                        fontSize: "0.7rem",
                        letterSpacing: "0.02em",
                        padding: "0.25rem 0.6rem",
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.95)",
                        background: "rgba(8,8,12,0.65)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                      }}
                    >
                      {formatEventDate(event.startDate)}
                    </span>
                  </div>

                  {/* Bottom content */}
                  <div
                    style={{
                      position: "absolute",
                      inset: "auto 0 0",
                      padding: "1.25rem 1.1rem 1.1rem",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontWeight: 800,
                        fontSize: "clamp(0.98rem, 1.3vw, 1.12rem)",
                        lineHeight: 1.22,
                        color: "#fff",
                        marginBottom: event.venue ? "0.35rem" : 0,
                        textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {event.title}
                    </p>
                    {event.venue && (
                      <p
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 500,
                          color: "rgba(255,255,255,0.65)",
                          margin: 0,
                          letterSpacing: "0.01em",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {event.venue.name}
                        {event.venue.city ? ` · ${event.venue.city}` : ""}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Nav arrows — desktop only */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            aria-label="Anterior"
            style={{
              position: "absolute",
              top: "50%",
              left: 6,
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(12,12,20,0.76)",
              border: "1px solid rgba(255,255,255,0.16)",
              color: canPrev ? "#fff" : "rgba(255,255,255,0.25)",
              cursor: canPrev ? "pointer" : "default",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.34)",
              transition: "opacity 0.2s, background 0.2s",
              opacity: canPrev ? 1 : 0.4,
              zIndex: 10,
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            aria-label="Siguiente"
            style={{
              position: "absolute",
              top: "50%",
              right: 6,
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(12,12,20,0.76)",
              border: "1px solid rgba(255,255,255,0.16)",
              color: canNext ? "#fff" : "rgba(255,255,255,0.25)",
              cursor: canNext ? "pointer" : "default",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.34)",
              transition: "opacity 0.2s, background 0.2s",
              opacity: canNext ? 1 : 0.4,
              zIndex: 10,
            }}
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {scrollSnaps.length > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.4rem",
            marginTop: "1rem",
          }}
        >
          {scrollSnaps.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Ir al slide ${i + 1}`}
              style={{
                width: i === selectedIndex ? 20 : 6,
                height: 6,
                borderRadius: "var(--radius-pill)",
                background:
                  i === selectedIndex
                    ? "var(--accent-primary)"
                    : "rgba(255,255,255,0.22)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "width 0.3s cubic-bezier(0.2,0.8,0.2,1), background 0.3s",
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
