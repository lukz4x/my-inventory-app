import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseBrowserEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseBrowserEnv();

  if (!url || !anonKey) {
    throw new Error("Missing Supabase browser environment variables.");
  }

  return createBrowserClient<Database>(url, anonKey);
}
