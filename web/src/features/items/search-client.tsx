"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ItemRow } from "@/components/item/item-row";
import { LocationChip } from "@/components/shared/location-chip";
import { useLocalItems } from "@/hooks/use-local-items";

export function SearchClient() {
  const [query, setQuery] = useState("");
  const { items } = useLocalItems();

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items.slice(0, 10);
    }

    return items.filter((item) =>
      [item.name, item.notes ?? ""].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [items, query]);

  return (
    <main className="px-4 py-5">
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Local item search is active. Supabase full-text ranking comes later.
          </p>
        </div>
        <GlassPanel className="p-4">
          <label className="flex h-12 items-center gap-3 rounded-full bg-white/80 px-4 ring-1 ring-zinc-950/10">
            <Search className="size-5 text-zinc-500" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-base outline-none placeholder:text-zinc-400"
              placeholder="Hammer, passport, charger..."
            />
          </label>
          <div className="mt-4 grid gap-2">
            {results.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
            {results.length === 0 ? (
              <div className="rounded-2xl bg-white/55 p-4">
                <p className="font-medium text-zinc-950">
                  No local items match {query ? `"${query}"` : "yet"}
                </p>
                <div className="mt-2">
                  <LocationChip label="Unsorted" />
                </div>
              </div>
            ) : null}
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
