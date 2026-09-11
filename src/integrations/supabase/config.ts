export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export function validateSupabaseConfig(
  url: string | undefined,
  publishableKey: string | undefined,
): SupabaseConfig | null {
  if (!url && !publishableKey) return null;
  if (!url || !publishableKey)
    throw new Error("La configuración pública de Supabase está incompleta.");
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".supabase.co") ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname !== "/" && parsed.pathname !== "")
  ) {
    throw new Error("La URL de Supabase no es válida.");
  }
  if (!publishableKey.startsWith("sb_publishable_")) {
    throw new Error("La conexión pública requiere una Publishable key de Supabase.");
  }
  return { url: parsed.origin, publishableKey };
}

export function getSupabaseConfig(): SupabaseConfig | null {
  // Keep explicit references so Next.js can supply public variables to browser builds.
  return validateSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
