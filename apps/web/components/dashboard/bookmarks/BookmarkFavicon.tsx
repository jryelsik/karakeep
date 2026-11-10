import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

import { getFallbackFaviconUrl } from "@karakeep/shared/utils/bookmarkUtils";

export default function BookmarkFavicon({
  src,
  pageUrl,
  domain,
  className,
}: {
  src?: string | null;
  pageUrl?: string;
  // Its first letter stands in for a favicon that's missing
  domain?: string;
  className?: string;
}) {
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  useEffect(() => {
    setPrimaryFailed(false);
    setFallbackFailed(false);
  }, [src, pageUrl]);

  const primary = src?.trim() || null;
  const fallback = pageUrl ? getFallbackFaviconUrl(pageUrl) : null;

  let resolvedSrc: string | null = null;
  let onError: (() => void) | undefined;

  if (primary && !primaryFailed) {
    resolvedSrc = primary;
    onError = () => setPrimaryFailed(true);
  } else if (fallback && fallback !== primary && !fallbackFailed) {
    resolvedSrc = fallback;
    onError = () => setFallbackFailed(true);
  }

  if (!resolvedSrc) {
    if (domain) {
      return (
        <span
          aria-hidden
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-sm bg-muted text-[11px] font-medium uppercase leading-none text-muted-foreground ring-1 ring-border",
            className,
          )}
        >
          {domain.charAt(0)}
        </span>
      );
    }
    return (
      <Globe
        aria-hidden
        className={cn("size-4 shrink-0 text-muted-foreground", className)}
      />
    );
  }
  return (
    <Image
      src={resolvedSrc}
      alt=""
      width={16}
      height={16}
      unoptimized
      // A mid-tone chip, which neither a white nor a black icon can vanish on, in
      // either theme. The ring grows it without moving anything.
      className={cn(
        "size-4 shrink-0 rounded-sm bg-muted-foreground/40 ring-1 ring-border",
        className,
      )}
      onError={onError}
      // A 1x1 pixel is how some sites and proxies say they have no icon
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth <= 1) {
          onError?.();
        }
      }}
    />
  );
}
