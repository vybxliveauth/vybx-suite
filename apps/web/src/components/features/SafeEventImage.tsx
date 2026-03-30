"use client";

import NextImage, { ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { EVENT_IMAGE_FALLBACK, normalizeEventImageUrl } from "@/lib/images";

type SafeEventImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: string | null | undefined;
  alt: string;
  fallbackSrc?: string;
  retryOnError?: boolean;
};

function buildRetryUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("__img_retry", String(Date.now()));
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Tiny inline SVG base64 placeholder (8x8 gradient) used as blurDataURL.
 * Creates a branded purple-to-dark gradient blur while the real image loads.
 */
const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64," +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">' +
      '<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#1e1e28"/>' +
      '<stop offset="100%" stop-color="#2d1b4e"/>' +
      "</linearGradient></defs>" +
      '<rect width="8" height="8" fill="url(#g)"/>' +
      "</svg>",
  );

export function SafeEventImage({
  src,
  alt,
  fallbackSrc = EVENT_IMAGE_FALLBACK,
  retryOnError = true,
  ...props
}: SafeEventImageProps) {
  const normalizedSource = normalizeEventImageUrl(src);
  const [resolvedSrc, setResolvedSrc] = useState(() => normalizedSource);
  const [retried, setRetried] = useState(false);
  const normalizedFallback = normalizeEventImageUrl(fallbackSrc);

  useEffect(() => {
    setResolvedSrc(normalizedSource);
    setRetried(false);
  }, [normalizedSource]);

  // Data URIs can't go through next/Image optimization — use native img
  if (resolvedSrc.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} src={resolvedSrc} alt={alt} />
    );
  }

  return (
    <NextImage
      {...props}
      src={resolvedSrc}
      alt={alt}
      placeholder="blur"
      blurDataURL={BLUR_PLACEHOLDER}
      onError={() => {
        if (
          retryOnError &&
          !retried &&
          resolvedSrc !== normalizedFallback &&
          normalizedSource !== normalizedFallback
        ) {
          setRetried(true);
          setResolvedSrc(buildRetryUrl(normalizedSource));
          return;
        }

        if (resolvedSrc !== normalizedFallback) {
          setResolvedSrc(normalizedFallback);
        }
      }}
    />
  );
}
