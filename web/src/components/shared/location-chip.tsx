import { MapPin } from "lucide-react";

export function LocationChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-900/10 backdrop-blur-xl">
      <MapPin className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
