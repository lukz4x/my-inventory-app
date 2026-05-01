"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Hand, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ItemPhoto } from "@/components/item/item-photo";
import { useLocalItem } from "@/hooks/use-local-items";
import { db } from "@/lib/dexie";

export function ItemDetailClient({ itemId }: { itemId: string }) {
  const { item, isLoading } = useLocalItem(itemId);
  const [saved, setSaved] = useState(false);

  if (isLoading) {
    return <main className="px-4 py-5 text-sm text-zinc-600">Loading item...</main>;
  }

  if (!item) {
    return (
      <main className="px-4 py-5">
        <GlassPanel className="p-4">
          <p className="font-semibold">Item not found</p>
          <Link href="/home" className="mt-2 inline-block text-sm text-zinc-600">
            Back home
          </Link>
        </GlassPanel>
      </main>
    );
  }

  const currentItem = item;

  async function updateItem(field: "name" | "notes" | "quantity", value: string) {
    const nextValue = field === "quantity" ? Math.max(1, Number(value) || 1) : value;
    await db.items.update(itemId, {
      [field]: nextValue,
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  async function markUsed() {
    await db.items.update(itemId, {
      useCount: (currentItem.useCount ?? 0) + 1,
      lastUsedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  async function deleteItem() {
    await db.items.delete(itemId);
    window.location.href = "/home";
  }

  return (
    <main className="px-4 py-5">
      <div className="mx-auto grid w-full max-w-md gap-4">
      <ItemPhoto blob={currentItem.primaryPhotoBlob} className="aspect-square w-full" />

        <GlassPanel className="grid gap-4 p-4">
          {saved ? (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              <Check className="size-4" aria-hidden="true" />
              Saved locally
            </div>
          ) : null}

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Name</span>
            <input
              defaultValue={currentItem.name}
              onBlur={(event) => updateItem("name", event.target.value)}
              className="h-12 rounded-2xl border border-zinc-950/10 bg-white/75 px-4 outline-none focus:border-zinc-950/30"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Quantity</span>
            <input
              type="number"
              min={1}
              defaultValue={currentItem.quantity}
              onBlur={(event) => updateItem("quantity", event.target.value)}
              className="h-12 rounded-2xl border border-zinc-950/10 bg-white/75 px-4 outline-none focus:border-zinc-950/30"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Notes</span>
            <textarea
              defaultValue={currentItem.notes ?? ""}
              onBlur={(event) => updateItem("notes", event.target.value)}
              className="min-h-28 rounded-2xl border border-zinc-950/10 bg-white/75 px-4 py-3 outline-none focus:border-zinc-950/30"
            />
          </label>

          <Button onClick={markUsed}>
            <Hand className="size-4" aria-hidden="true" />
            I&apos;m using this
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => setSaved(true)}>
              <Save className="size-4" aria-hidden="true" />
              Saved
            </Button>
            <Button variant="ghost" onClick={deleteItem}>
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
