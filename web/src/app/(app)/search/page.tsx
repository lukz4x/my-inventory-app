import { Search } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { LocationChip } from "@/components/shared/location-chip";

export default function SearchPage() {
  return (
    <main className="px-4 py-5">
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Full-text item and location search lands in build step 9.
          </p>
        </div>
        <GlassPanel className="p-4">
          <label className="flex h-12 items-center gap-3 rounded-full bg-white/80 px-4 ring-1 ring-zinc-950/10">
            <Search className="size-5 text-zinc-500" aria-hidden="true" />
            <input
              className="w-full bg-transparent text-base outline-none placeholder:text-zinc-400"
              placeholder="Hammer, passport, charger..."
              disabled
            />
          </label>
          <div className="mt-4 rounded-2xl bg-white/55 p-4">
            <p className="font-medium text-zinc-950">Recent items will appear here</p>
            <div className="mt-2">
              <LocationChip label="Unsorted" />
            </div>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
