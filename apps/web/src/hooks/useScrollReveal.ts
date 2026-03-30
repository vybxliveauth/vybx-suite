"use client";

import { useEffect } from "react";

/**
 * Activates `.reveal` elements when they enter the viewport.
 * Uses IntersectionObserver with a small rootMargin so elements
 * animate just before they become visible.
 */
export function useScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            observer.unobserve(entry.target);
          }
        }
      },
      {
        rootMargin: "0px 0px -60px 0px",
        threshold: 0.1,
      },
    );

    const elements = document.querySelectorAll(".reveal:not(.active)");
    elements.forEach((el) => {
      if (prefersReduced) {
        el.classList.add("active");
      } else {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  });
}
