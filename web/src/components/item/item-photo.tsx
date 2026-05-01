"use client";

import { Package } from "lucide-react";
import { useEffect, useMemo } from "react";

export function ItemPhoto({
  blob,
  className = "size-12",
}: {
  blob?: Blob | null;
  className?: string;
}) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  if (!url) {
    return (
      <span
        className={`${className} inline-flex shrink-0 items-center justify-center rounded-2xl bg-white/70 text-zinc-500 ring-1 ring-zinc-950/10`}
      >
        <Package className="size-5" aria-hidden="true" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={`${className} shrink-0 rounded-2xl object-cover ring-1 ring-zinc-950/10`}
    />
  );
}
