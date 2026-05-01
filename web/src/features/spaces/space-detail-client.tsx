"use client";

import { Camera, PackagePlus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ItemRow } from "@/components/item/item-row";
import { useLocalItems } from "@/hooks/use-local-items";

export function SpaceDetailClient({ locationId }: { locationId: string }) {
  const { items } = useLocalItems(locationId);

  return (
    <main className="px-4 py-5">
      <div className="mx-auto grid w-full max-w-4xl gap-5">
        <section className="rounded-3xl bg-[linear-gradient(145deg,rgba(123,154,168,0.36),rgba(255,255,255,0.72))] p-5 shadow-sm ring-1 ring-white/60">
          <p className="text-sm font-semibold text-zinc-700">Space</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {locationId === "unsorted" ? "Unsorted" : "Space detail"}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-zinc-700">
            Local-first item list is active. Supabase-backed spaces attach once
            environment keys are filled in.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/capture">
              <Camera className="size-4" aria-hidden="true" />
              Capture item
            </ButtonLink>
            <ButtonLink href="/home" variant="secondary">
              Back home
            </ButtonLink>
          </div>
        </section>

        <GlassPanel className="grid gap-2 p-4">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
          {items.length === 0 ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-white/75 ring-1 ring-zinc-950/10">
                <PackagePlus className="size-5 text-zinc-700" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold">No items yet</h2>
                <p className="text-sm text-zinc-600">Capture one to start.</p>
              </div>
            </div>
          ) : null}
        </GlassPanel>
      </div>
    </main>
  );
}
