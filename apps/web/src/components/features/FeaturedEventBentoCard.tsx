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
  const dateShort = startDate.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
  });
  const dateYear = startDate.getFullYear();

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

          <div className="absolute inset-x-4 top-4 z-30 flex items-start gap-2.5">
            <div
              className={cn(
                "inline-flex max-w-[64%] items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.72rem] font-extrabold tracking-[0.09em] uppercase text-white shadow-[0_8px_18px_rgba(0,0,0,0.35)] backdrop-blur-md",
                isTrending
                  ? "border-orange-300/55 bg-[linear-gradient(135deg,rgba(249,115,22,0.92),rgba(244,63,94,0.86))]"
                  : "border-rose-300/55 bg-[linear-gradient(135deg,rgba(255,42,95,0.95),rgba(124,58,237,0.88))]",
              )}
            >
              {isTrending ? (
                <>
                  <Flame className="size-3.5" />
                  Tendencia
                </>
              ) : (
                <>
                  <Star className="size-3.5 fill-current" />
                  Destacado
                </>
              )}
            </div>

            <div className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/32 bg-[linear-gradient(180deg,rgba(7,9,18,0.78),rgba(7,9,18,0.62))] px-3 py-1.5 text-white shadow-[0_8px_20px_rgba(0,0,0,0.45)] backdrop-blur-md">
              <span className="text-[0.7rem] font-extrabold tracking-[0.08em] uppercase leading-none">
                {dateShort}
              </span>
              <span className="text-[0.64rem] font-bold text-white/72 leading-none">
                {dateYear}
              </span>
            </div>
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
