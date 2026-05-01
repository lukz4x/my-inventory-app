import Link from "next/link";
import { ItemPhoto } from "@/components/item/item-photo";
import type { LocalItem } from "@/lib/dexie";

export function ItemRow({ item }: { item: LocalItem }) {
  return (
    <Link
      href={`/items/${item.id}`}
      className="flex items-center gap-3 rounded-2xl bg-white/60 p-3 ring-1 ring-zinc-950/10 transition-all duration-200 hover:bg-white"
    >
      <ItemPhoto blob={item.primaryPhotoBlob} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-950">
          {item.name || "Untitled item"}
        </p>
        <p className="truncate text-sm text-zinc-600">
          {item.lastUsedAt
            ? `Last used ${new Date(item.lastUsedAt).toLocaleDateString()}`
            : item.notes || "Saved locally"}
        </p>
      </div>
    </Link>
  );
}
