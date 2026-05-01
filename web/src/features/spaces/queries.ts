import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { Location } from "@/types/database";

export async function getSpaces(): Promise<Location[]> {
  if (!hasSupabaseBrowserEnv()) {
    return [];
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .is("parent_location_id", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}
