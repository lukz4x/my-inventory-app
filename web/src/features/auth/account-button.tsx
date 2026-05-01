"use client";

import Link from "next/link";
import { LogOut, UserCircle } from "lucide-react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function AccountButton() {
  const { user, isLoading, isConfigured } = useAuthSession();

  async function signOut() {
    if (!isConfigured) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-2 text-zinc-700 ring-1 ring-zinc-950/10 transition-all duration-200 hover:bg-white"
        aria-label="Sign in"
      >
        <UserCircle className="size-5" aria-hidden="true" />
        <span className="hidden text-sm font-medium sm:inline">
          {isLoading ? "Account" : "Sign in"}
        </span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account"
        className="hidden max-w-44 truncate text-right text-sm font-medium text-zinc-700 sm:block"
      >
        {user.email ?? "Account"}
      </Link>
      <Link
        href="/account"
        className="inline-flex size-10 items-center justify-center rounded-full bg-white/75 text-zinc-700 ring-1 ring-zinc-950/10"
        aria-label="Account"
      >
        <UserCircle className="size-5" aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="inline-flex size-10 items-center justify-center rounded-full bg-white/75 text-zinc-700 ring-1 ring-zinc-950/10 transition-all duration-200 hover:bg-white"
        aria-label="Log out"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
