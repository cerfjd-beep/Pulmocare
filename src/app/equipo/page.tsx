import Link from "next/link";
import { TeamPanel } from "@/modules/clinical/team-panel";

export default function TeamPage() {
  return (
    <div className="inner-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PULMOCARE · EQUIPO</p>
          <h1>Cada paciente, acompañado.</h1>
          <p>Revisa solicitudes y explora el registro de atención.</p>
        </div>
        <Link className="button primary fit-content" href="/equipo/traslado">
          Calcular costo de traslado
        </Link>
      </div>
      <TeamPanel />
    </div>
  );
}
