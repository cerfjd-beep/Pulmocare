import Link from "next/link";
import { PatientDashboard } from "@/modules/auth/dashboards";
export default function Page() {
  return (
    <>
      <div className="inner-page">
        <Link href="/admin">Volver a Administración</Link>
        <p className="notice">
          Vista previa: el paciente verá sus propios datos. No estás entrando en otra cuenta.
        </p>
      </div>
      <PatientDashboard preview />
    </>
  );
}
