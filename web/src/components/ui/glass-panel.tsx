import type { ReactNode } from "react";
import { clsx } from "clsx";

export function GlassPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-white/35 bg-white/55 shadow-sm shadow-zinc-900/5 backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </section>
  );
}
