import { getSupabaseCatalog } from "../../../integrations/supabase/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await getSupabaseCatalog();
  return Response.json(catalog, {
    status: catalog.status === "ready" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
