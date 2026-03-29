"use client";

import { ImgHTMLAttributes, useEffect, useState } from "react";
import { EVENT_IMAGE_FALLBACK, normalizeEventImageUrl } from "@/lib/images";

type SafeEventImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
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

export function SafeEventImage({
  src,
  alt,
  fallbackSrc = EVENT_IMAGE_FALLBACK,
  retryOnError = true,
  loading = "lazy",
  decoding = "async",
  referrerPolicy = "no-referrer",
  onError,
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
        if (
          retryOnError &&
          !retried &&
          resolvedSrc !== normalizedFallback &&
          normalizedSource !== normalizedFallback &&
          !normalizedSource.startsWith("data:")
        ) {
          setRetried(true);
          setResolvedSrc(buildRetryUrl(normalizedSource));
          onError?.(event);
          return;
        }

        if (resolvedSrc !== normalizedFallback) {
          setResolvedSrc(normalizedFallback);
        }
        onError?.(event);
      }}
    />
  );
}
