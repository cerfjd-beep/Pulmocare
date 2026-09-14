import Link from "next/link";
import { requirePortal } from "@/modules/auth/server";
import { displayServices, getSupabaseCatalog } from "@/integrations/supabase/catalog";
import { PatientWizard } from "@/modules/intake/patient-wizard";
export default async function Page() {
  await requirePortal("admin");
  const services = displayServices(await getSupabaseCatalog()).filter(
    (s) => s.id !== "rehab-complete",
  );
  return (
    <div className="inner-page">
      <Link href="/admin/vistas/paciente">Volver al perfil del paciente</Link>
      <h1>Formulario que verá el paciente</h1>
      <PatientWizard services={services} preview />
    </div>
  );
}
