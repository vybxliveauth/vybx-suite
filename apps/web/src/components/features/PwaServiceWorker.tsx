"use client";

import { useEffect } from "react";

export function PwaServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none", // always re-fetch sw.js to check for updates
        });

        // Check for updates every time the page regains focus
        const checkUpdate = () => reg.update().catch(() => undefined);
        window.addEventListener("focus", checkUpdate);
        return () => window.removeEventListener("focus", checkUpdate);
      } catch {
        // SW registration is a progressive enhancement — silent failure is fine
      }
    };

    // Defer registration until after page is interactive
    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", () => void register(), { once: true });
    }
  }, []);

  return null;
}
