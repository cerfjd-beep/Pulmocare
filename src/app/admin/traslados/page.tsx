import Link from "next/link";
import { TravelCalculator } from "@/modules/travel/calculator";

export const dynamic = "force-dynamic";

export default function AdminTravelPage() {
  const liveEnabled = Boolean(
    process.env.GOOGLE_MAPS_API_KEY && (process.env.TRAVEL_QUOTE_ACCESS_TOKEN?.length ?? 0) >= 32,
  );
  return (
    <div className="inner-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PULMOCARE · ADMINISTRACIÓN</p>
          <h1>Costo de traslado a domicilio</h1>
          <p>Planifica la salida y consulta el recargo por distancia y tráfico.</p>
        </div>
        <Link className="text-button" href="/admin">
          Volver a administración
        </Link>
      </div>
      <TravelCalculator liveEnabled={liveEnabled} />
    </div>
  );
}
