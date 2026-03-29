"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

function toCountdownString(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function FlipCountdown({
  seconds,
  urgent = false,
  compact = false,
}: {
  seconds: number;
  urgent?: boolean;
  compact?: boolean;
}) {
  const countdown = toCountdownString(seconds);
  const reduceMotion = useReducedMotion();

  return (
    <span
      className={`flip-countdown${compact ? " compact" : ""}${urgent ? " urgent" : ""}`}
      aria-label={`Tiempo restante ${countdown}`}
    >
      {countdown.split("").map((char, index) => {
        if (char === ":") {
          return (
            <span key={`sep-${index}`} className="flip-countdown-colon" aria-hidden>
              :
            </span>
          );
        }

        return (
          <span key={`slot-${index}`} className="flip-countdown-slot" aria-hidden>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${index}-${char}`}
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { y: "30%", opacity: 0, rotateX: -28 }
                }
                animate={
                  reduceMotion
                    ? { opacity: 1 }
                    : { y: "0%", opacity: 1, rotateX: 0 }
                }
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { y: "-30%", opacity: 0, rotateX: 28 }
                }
                transition={{
                  duration: reduceMotion ? 0.12 : 0.19,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backfaceVisibility: "hidden",
                }}
              >
                {char}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}

