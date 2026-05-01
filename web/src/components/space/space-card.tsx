import Link from "next/link";
import { Home, Inbox } from "lucide-react";
import type { Location } from "@/types/database";

const tintClasses = [
  "from-[#7BA886]/35",
  "from-[#6B7B8C]/35",
  "from-[#B8866D]/35",
  "from-[#9A8AB8]/35",
  "from-[#C4A875]/35",
  "from-[#7B9AA8]/35",
];

export function SpaceCard({
  space,
  index = 0,
}: {
  space: Pick<Location, "id" | "name" | "icon" | "color_tint">;
  index?: number;
}) {
  const Icon = space.icon === "tray" ? Inbox : Home;

  return (
    <Link
      href={`/spaces/${space.id}`}
      className={`group flex min-h-36 flex-col justify-between rounded-2xl bg-gradient-to-br ${tintClasses[index % tintClasses.length]} to-white/65 p-4 text-left shadow-sm ring-1 ring-white/60 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-white/75 text-zinc-800 ring-1 ring-zinc-900/10">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="text-xs font-medium text-zinc-600">Space</span>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-zinc-950">{space.name}</h2>
        <p className="mt-1 text-sm text-zinc-600">Ready for items</p>
      </div>
    </Link>
  );
}
