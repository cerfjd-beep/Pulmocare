import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";
import {
  services as demoServices,
  servicePackages,
  type ServiceOption,
} from "@/modules/services/catalog";

export interface CatalogService {
  id: string;
  code: string;
  name: string;
  description: string;
  durationMinutes: number | null;
  amountCents: number | null;
}

export type CatalogResult =
  | { status: "ready"; services: CatalogService[] }
  | { status: "not_configured" | "configuration_error" | "schema_missing" | "unavailable" };

export async function getSupabaseCatalog(): Promise<CatalogResult> {
  let config;
  try {
    config = getSupabaseConfig();
  } catch {
    return { status: "configuration_error" };
  }
  if (!config) return { status: "not_configured" };
  // A stateless public client only: never forward cookies or use a privileged key for the catalog.
  const client = createClient<Database>(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }),
    },
  });
  const offers = await client.rpc("get_service_offers");
  if (!offers.error)
    return {
      status: "ready",
      services: (offers.data ?? []).map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        description: [s.description, s.scope].filter(Boolean).join(" "),
        durationMinutes: s.duration_minutes,
        amountCents: s.amount_cents,
      })),
    };
  if (!["PGRST202", "42883"].includes(offers.error.code)) return { status: "unavailable" };
  const [services, prices] = await Promise.all([
    client
      .from("services")
      .select("id,code,name,description,duration_minutes")
      .order("code")
      .limit(100),
    client.from("service_price_versions").select("service_id,amount_cents,currency").limit(100),
  ]);
  const error = services.error ?? prices.error;
  if (error) {
    return {
      status:
        error.code === "PGRST205" || error.code === "42P01" ? "schema_missing" : "unavailable",
    };
  }
  return {
    status: "ready",
    services: (services.data ?? []).map((service) => ({
      id: service.id,
      code: service.code,
      name: service.name,
      description: service.description,
      durationMinutes: service.duration_minutes,
      // RLS returns only currently published USD prices; draft prices remain private.
      amountCents:
        prices.data?.find((price) => price.service_id === service.id && price.currency === "USD")
          ?.amount_cents ?? null,
    })),
  };
}

export function displayServices(catalog: CatalogResult): ServiceOption[] {
  if (catalog.status === "not_configured") return [...demoServices];
  if (catalog.status !== "ready") return [];
  const items: ServiceOption[] = catalog.services.map((s) => ({
    id: s.code,
    name: ["nebulization", "rehab"].includes(s.code) ? `${s.name} · sesión individual` : s.name,
    description: s.description,
    minutes: s.durationMinutes,
    cents: s.amountCents,
  }));
  return [
    ...items,
    ...servicePackages.filter(
      (p) => !items.some((s) => s.id === p.id) && items.some((s) => s.id === p.baseService),
    ),
  ];
}
