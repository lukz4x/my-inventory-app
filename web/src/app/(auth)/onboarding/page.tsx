import { Camera, ChefHat, Hammer, Shirt } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";

const starterSpaces = [
  { name: "Garage", icon: Hammer },
  { name: "Kitchen", icon: ChefHat },
  { name: "Closet", icon: Shirt },
];

export default function OnboardingPage() {
  return (
    <main className="min-h-dvh bg-[linear-gradient(140deg,#f7f5ef,#e9f0eb_48%,#eef4f6)] px-4 py-6 text-zinc-950">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col justify-between gap-8">
        <section className="pt-10">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-zinc-950 text-white shadow-sm">
            <Camera className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            Where do you want to start?
          </h1>
          <p className="mt-3 text-base leading-7 text-zinc-700">
            Pick a first space. You can rename it, add sub-spaces, and move
            items later.
          </p>
        </section>

        <div className="grid gap-3">
          {starterSpaces.map((space) => (
            <GlassPanel key={space.name} className="p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-white/75 ring-1 ring-zinc-950/10">
                  <space.icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">{space.name}</h2>
                  <p className="text-sm text-zinc-600">Create this first space</p>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>

        <div className="grid gap-3 pb-4">
          <ButtonLink href="/home">Continue to app shell</ButtonLink>
          <ButtonLink href="/home" variant="secondary">
            Name my own later
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
