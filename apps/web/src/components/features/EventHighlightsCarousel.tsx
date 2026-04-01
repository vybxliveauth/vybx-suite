"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { SafeEventImage } from "@/components/features/SafeEventImage";
import { Event } from "@/types";

function formatEventDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
  return [...featured, ...trending].slice(0, 8);
}

export function EventHighlightsCarousel({ events }: { events: Event[] }) {
  const slides = useMemo(() => pickSlides(events), [events]);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: slides.length > 4,
    dragFree: false,
  });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
  }, [emblaApi, slides.length]);

  useEffect(() => {
    if (!emblaApi || slides.length < 2) return;
    const timerId = setInterval(() => {
      if (!isHovered) emblaApi.scrollNext();
    }, 4200);
    return () => clearInterval(timerId);
  }, [emblaApi, slides.length, isHovered]);

  if (slides.length === 0) return null;

  return (
    <section
      style={{
        position: "relative",
        marginTop: "-0.5rem",
        padding: "0 clamp(2px, 0.5vw, 6px) 0.2rem",
        borderTop: "none",
        borderBottom: "none",
        background: "transparent",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div>
        <div
          style={{
            position: "relative",
            marginTop: 0,
            paddingLeft: 0,
            paddingRight: 0,
          }}
        >
          <div ref={emblaRef} style={{ overflow: "hidden" }}>
            <div className="event-carousel-track">
              {slides.map((event) => {
                return (
                  <div
                    key={event.id}
                    className="event-carousel-slide"
                  >
                    <Link
                      href={`/events/${event.slug}`}
                      style={{ display: "block", textDecoration: "none" }}
                    >
                      <article className="event-carousel-card">
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
                        <div
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              borderRadius: "var(--radius-pill)",
                              fontSize: "0.72rem",
                              letterSpacing: "0.02em",
                              padding: "0.28rem 0.62rem",
                              fontWeight: 800,
                              color: "rgba(255,255,255,0.98)",
                              background: "rgba(8,8,12,0.7)",
                              border: "1px solid rgba(255,255,255,0.34)",
                              boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
                            }}
                          >
                            {formatEventDate(event.startDate)}
                          </span>
                        </div>

                        <div
                          style={{
                            position: "absolute",
                            inset: "auto 0 0",
                            padding: "1.05rem 1rem 1rem",
                          }}
                        >
                          <p
                            style={{
                              fontFamily: "var(--font-heading)",
                              fontWeight: 800,
                              fontSize: "clamp(1.02rem, 1.4vw, 1.15rem)",
                              lineHeight: 1.2,
                              color: "#fff",
                              marginBottom: 0,
                              textShadow: "0 2px 14px rgba(0,0,0,0.75)",
                            }}
                          >
                            {event.title}
                          </p>
                        </div>
                      </article>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
