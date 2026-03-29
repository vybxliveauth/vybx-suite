"use client";

import { ImgHTMLAttributes, useEffect, useState } from "react";
import { EVENT_IMAGE_FALLBACK, normalizeEventImageUrl } from "@/lib/images";

type SafeEventImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src: string | null | undefined;
  alt: string;
  fallbackSrc?: string;
};

export function SafeEventImage({
  src,
  alt,
  fallbackSrc = EVENT_IMAGE_FALLBACK,
  loading = "lazy",
  decoding = "async",
  referrerPolicy = "no-referrer",
  onError,
  ...props
}: SafeEventImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(() => normalizeEventImageUrl(src));
  const normalizedFallback = normalizeEventImageUrl(fallbackSrc);

  useEffect(() => {
    setResolvedSrc(normalizeEventImageUrl(src));
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={resolvedSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      referrerPolicy={referrerPolicy}
      onError={(event) => {
        if (resolvedSrc !== normalizedFallback) {
          setResolvedSrc(normalizedFallback);
        }
        onError?.(event);
      }}
    />
  );
}
