import { Camera, PackagePlus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";

export default async function SpaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="px-4 py-5">
      <div className="mx-auto grid w-full max-w-4xl gap-5">
        <section className="rounded-3xl bg-[linear-gradient(145deg,rgba(123,154,168,0.36),rgba(255,255,255,0.72))] p-5 shadow-sm ring-1 ring-white/60">
          <p className="text-sm font-semibold text-zinc-700">Space</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {id === "unsorted" ? "Unsorted" : "Space detail"}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-zinc-700">
            Item lists, sub-spaces, favorites, and camera capture attach here as
            the next build steps land.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/home?capture=1">
              <Camera className="size-4" aria-hidden="true" />
              Capture item
            </ButtonLink>
            <ButtonLink href="/home" variant="secondary">
              Back home
            </ButtonLink>
          </div>
        </section>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-white/75 ring-1 ring-zinc-950/10">
              <PackagePlus className="size-5 text-zinc-700" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold">No items yet</h2>
              <p className="text-sm text-zinc-600">
                Add Item flow is build step 7.
              </p>
            </div>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
