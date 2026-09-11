import { PatientPanel } from "@/modules/follow-up/patient-panel";

export default function AppointmentsPage() {
  return (
    <div className="inner-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TU ESPACIO DE CUIDADO</p>
          <h1>Mis solicitudes</h1>
          <p>Consulta el estado de tu atención y continúa tu seguimiento.</p>
        </div>
      </div>
      <PatientPanel />
    </div>
  );
}
