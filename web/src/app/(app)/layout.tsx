import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Camera, Home, Search } from "lucide-react";
import { AccountButton } from "@/features/auth/account-button";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-[#f5f2ed] text-zinc-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
        <header className="sticky top-0 z-20 border-b border-white/55 bg-white/70 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <Link href="/home" className="flex items-center gap-2 font-semibold">
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-zinc-950 text-white">
                <Home className="size-4" aria-hidden="true" />
              </span>
              MyInventoryApp
            </Link>
            <AccountButton />
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <nav className="sticky bottom-0 z-20 border-t border-white/55 bg-white/75 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
            <Link
              href="/home"
              className="inline-flex h-12 items-center justify-center rounded-full text-zinc-700 hover:bg-white"
              aria-label="Home"
            >
              <Home className="size-5" aria-hidden="true" />
            </Link>
            <Link
              href="/capture"
              className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 text-white shadow-sm"
              aria-label="Capture item"
            >
              <Camera className="size-5" aria-hidden="true" />
            </Link>
            <Link
              href="/search"
              className="inline-flex h-12 items-center justify-center rounded-full text-zinc-700 hover:bg-white"
              aria-label="Search"
            >
              <Search className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
