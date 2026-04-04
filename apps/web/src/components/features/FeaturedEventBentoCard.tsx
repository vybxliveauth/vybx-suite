"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { Flame, Star } from "lucide-react";
import { SafeEventImage } from "@/components/features/SafeEventImage";
import { cn } from "@/lib/utils";
import type { Event } from "@/types";

type FeaturedEventBentoCardProps = {
  event: Event;
  priority?: "high" | "normal";
  highlight?: "featured" | "trending";
  className?: string;
};

export function FeaturedEventBentoCard({
  event,
  priority = "normal",
  highlight,
  className,
}: FeaturedEventBentoCardProps) {
  const reduceMotion = useReducedMotion();
  const mouseX = useMotionValue(-500);
  const mouseY = useMotionValue(-500);
  const springX = useSpring(mouseX, { stiffness: 320, damping: 28, mass: 0.35 });
  const springY = useSpring(mouseY, { stiffness: 320, damping: 28, mass: 0.35 });
  const spotlightBg = useMotionTemplate`radial-gradient(360px circle at ${springX}px ${springY}px, rgba(255,255,255,0.2), rgba(255,255,255,0) 45%)`;

  const startDate = new Date(event.startDate);
  const badgeType = highlight ?? (event.isFeatured ? "featured" : "trending");
  const isTrending = badgeType === "trending" || (event.trendingScore ?? 0) > 0;
  const day = startDate.getDate().toString().padStart(2, "0");
  const month = startDate.toLocaleString("es-DO", { month: "short" }).toUpperCase();

  function handleMouseMove(ev: MouseEvent<HTMLAnchorElement>) {
    const rect = ev.currentTarget.getBoundingClientRect();
    mouseX.set(ev.clientX - rect.left);
    mouseY.set(ev.clientY - rect.top);
  }

  function handleMouseLeave() {
    mouseX.set(-500);
    mouseY.set(-500);
  }

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 26, filter: "blur(8px)" }}
      animate={reduceMotion ? {} : { opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative h-full overflow-hidden rounded-3xl bg-transparent text-white shadow-none",
        className
      )}
    >
      <Link
        href={`/events/${event.slug}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative block h-full overflow-hidden rounded-[inherit]"
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: spotlightBg, opacity: 0 }}
        />

        <div className="relative h-full min-h-[260px] w-full overflow-hidden rounded-[inherit] bg-transparent md:min-h-full">
          <SafeEventImage
            src={event.imageUrl}
            alt={event.title}
            loading={priority === "high" ? "eager" : "lazy"}
            className="block h-full w-full rounded-[inherit] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] [backface-visibility:hidden] [transform:translateZ(0)]"
          />

          <div
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              zIndex: 30,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.64rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0.28rem 0.64rem",
              fontWeight: 800,
              color: "#fff",
              background: isTrending
                ? "linear-gradient(120deg, rgba(249,115,22,0.93), rgba(244,63,94,0.88))"
                : "linear-gradient(120deg, rgba(255,42,95,0.96), rgba(124,58,237,0.9))",
              border: isTrending
                ? "1px solid rgba(253,186,116,0.56)"
                : "1px solid rgba(255,141,179,0.62)",
              boxShadow: isTrending
                ? "0 8px 20px rgba(249,115,22,0.28)"
                : "0 8px 20px rgba(255,42,95,0.34)",
              whiteSpace: "nowrap",
            }}
          >
            {isTrending ? (
              <>
                <Flame size={10} />
                Top ventas
              </>
            ) : (
              <>
                <Star size={10} fill="currentColor" />
                Destacado
              </>
            )}
          </div>

          <div className="date-badge">
            <span className="day">{day}</span>
            <span className="month">{month}</span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-30 md:bottom-5 md:left-5 md:right-5">
            <h3 className="line-clamp-2 text-lg leading-tight font-black tracking-[-0.02em] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.78)] md:text-xl">
              {event.title}
            </h3>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
