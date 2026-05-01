"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function useAuthSession() {
  const isConfigured = hasSupabaseBrowserEnv();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isConfigured);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  return { user, isLoading, isConfigured };
}
