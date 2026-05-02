export function getSupabaseBrowserEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window === "undefined" ? "" : window.location.origin)
  ).replace(/\/$/, "");
}

export function hasSupabaseBrowserEnv() {
  const { url, anonKey } = getSupabaseBrowserEnv();
  return Boolean(
    url &&
      anonKey &&
      !url.includes("YOUR_PROJECT_REF") &&
      !anonKey.includes("REPLACE_ME"),
  );
}
