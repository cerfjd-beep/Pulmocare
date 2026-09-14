import Link from "next/link";
import { requirePortal } from "@/modules/auth/server";
import { TherapistProfile } from "@/modules/administration/portal-details";
export default async function Page() {
  await requirePortal("admin");
  return (
    <div className="inner-page">
      <Link href="/admin">Volver a Administración</Link>
      <p className="notice">
        Vista previa del terapeuta verificado. Para ver una persona registrada, abre su perfil en la
        lista de prestadores.
      </p>
      <TherapistProfile
        preview
        profile={{
          id: "",
          name: "Perfil del terapeuta",
          specialty: "Terapia respiratoria",
          registration: null,
          status: "verified",
          active: true,
          createdAt: "",
          assignments: [],
        }}
      />
      <section className="account-card">
        <h2>Título y carnet profesional</h2>
        <p>
          El prestador carga sus documentos en Mi cuenta y consulta el estado de su verificación.
          Administración puede abrirlos desde su perfil.
        </p>
      </section>
    </div>
  );
}
