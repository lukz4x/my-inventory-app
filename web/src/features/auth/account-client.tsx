"use client";

import Link from "next/link";
import { LogOut, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { useAuthSession } from "@/hooks/use-auth-session";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function AccountClient() {
  const { user, isLoading, isConfigured } = useAuthSession();

  async function signOut() {
    if (!isConfigured) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="px-4 py-5">
      <div className="mx-auto grid w-full max-w-md gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-600">Account</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Profile</h1>
        </div>

        <GlassPanel className="grid gap-4 p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-white/75 text-zinc-700 ring-1 ring-zinc-950/10">
              <UserCircle className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-zinc-950">
                {isLoading
                  ? "Loading..."
                  : user?.email ?? "Not signed in"}
              </p>
              <p className="text-sm text-zinc-600">
                {user ? "Supabase session active" : "Sign in to sync across devices"}
              </p>
            </div>
          </div>

          {user ? (
            <Button onClick={signOut} variant="secondary">
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </Button>
          ) : (
            <ButtonLink href="/login">Sign in</ButtonLink>
          )}
        </GlassPanel>

        <Link href="/home" className="text-center text-sm font-medium text-zinc-600">
          Back home
        </Link>
      </div>
    </main>
  );
}
