"use client";

import { AlertCircle, Plus, Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpaceCard } from "@/components/space/space-card";
import { useSpaces } from "@/hooks/use-spaces";
import { hasSupabaseBrowserEnv } from "@/lib/env";

const fallbackSpaces = [
  {
    id: "unsorted",
    household_id: "local",
    parent_location_id: null,
    name: "Unsorted",
    icon: "tray",
    background_photo_url: null,
    color_tint: "#7B9AA8",
    sort_order: 0,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
];

export function HomeClient() {
  const { spaces, isLoading, error } = useSpaces();
  const visibleSpaces = spaces.length > 0 ? spaces : fallbackSpaces;
  const needsSupabase = !hasSupabaseBrowserEnv();

  return (
    <main className="px-4 py-5">
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <section className="rounded-3xl bg-[linear-gradient(145deg,rgba(123,168,134,0.34),rgba(255,255,255,0.72)),url('/window.svg')] bg-cover bg-center p-5 shadow-sm ring-1 ring-white/60">
          <div className="max-w-xl py-8">
            <p className="text-sm font-semibold text-zinc-700">Home</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Your physical stuff, mapped.
            </h1>
            <p className="mt-3 max-w-md text-base leading-7 text-zinc-700">
              Spaces, items, photos, and search will grow from here. Capture is
              always one tap away.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/search" variant="secondary">
                <Search className="size-4" aria-hidden="true" />
                Search
              </ButtonLink>
              <ButtonLink href="/onboarding">
                <Plus className="size-4" aria-hidden="true" />
                Add space
              </ButtonLink>
            </div>
          </div>
        </section>

        {needsSupabase ? (
          <GlassPanel className="p-4">
            <div className="flex gap-3 text-sm text-zinc-700">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-zinc-500" />
              <div>
                <p className="font-semibold text-zinc-950">
                  Running in bootstrap mode
                </p>
                <p className="mt-1 leading-6">
                  Real spaces will appear after Supabase keys are added to
                  `.env.local`. The UI is wired to the deployed schema.
                </p>
              </div>
            </div>
          </GlassPanel>
        ) : null}

        {error ? (
          <GlassPanel className="p-4 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-950">Unable to load spaces</p>
            <p className="mt-1">{error}</p>
          </GlassPanel>
        ) : null}

        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold">Spaces</h2>
              <p className="text-sm text-zinc-600">
                {isLoading ? "Loading..." : `${visibleSpaces.length} ready`}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleSpaces.map((space, index) => (
              <SpaceCard key={space.id} space={space} index={index} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
