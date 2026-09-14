import Link from "next/link";
import { requirePortal } from "@/modules/auth/server";
import { redirect } from "next/navigation";
import { TravelCalculator } from "@/modules/travel/calculator";
import { displayServices, getSupabaseCatalog } from "@/integrations/supabase/catalog";

export const dynamic = "force-dynamic";

export default async function TravelPage() {
  const account = await requirePortal("provider");
  if (account.access?.professional_status !== "verified") redirect("/equipo");
  const liveEnabled = Boolean(
    process.env.GOOGLE_MAPS_API_KEY && (process.env.TRAVEL_QUOTE_ACCESS_TOKEN?.length ?? 0) >= 32,
  );
  return (
    <div className="inner-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PULMOCARE · COORDINACIÓN</p>
          <h1>Costo de traslado a domicilio</h1>
          <p>Ubicación, horario y tráfico para planificar la visita.</p>
        </div>
        <Link className="text-button" href="/equipo">
          Volver al equipo
        </Link>
      </div>
      <TravelCalculator
        liveEnabled={liveEnabled}
        services={displayServices(await getSupabaseCatalog())}
      />
    </div>
  );
}
