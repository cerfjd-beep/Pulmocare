import { AdminDashboard } from "@/modules/administration/dashboard";

export default function AdminPage() {
  return (
    <div className="inner-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PULMOCARE · ADMINISTRACIÓN</p>
          <h1>El cuidado también se coordina.</h1>
          <p>Solicitudes, servicios y costos en un espacio para la operación.</p>
        </div>
      </div>
      <AdminDashboard />
    </div>
  );
}
