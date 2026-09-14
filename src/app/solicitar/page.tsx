import { PatientWizard } from "@/modules/intake/patient-wizard";
import { requirePortal } from "@/modules/auth/server";
import { displayServices, getSupabaseCatalog } from "@/integrations/supabase/catalog";

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ servicio?: string }>;
}) {
  const account = await requirePortal("patient");
  const { servicio } = await searchParams;
  const services = displayServices(await getSupabaseCatalog()).filter(
    (s) => s.id !== "rehab-complete",
  );
  return (
    <div className="inner-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ATENCIÓN RESPIRATORIA DOMICILIAR</p>
          <h1>Estamos para cuidarte.</h1>
          <p>Una solicitud sencilla, con orientación en cada paso.</p>
        </div>
      </div>
      {services.length ? (
        <PatientWizard
          name={account.access?.name}
          serviceId={servicio === "rehab-complete" ? "rehab-assessment" : servicio}
          services={services}
        />
      ) : (
        <p className="notice">No pudimos consultar los servicios. Intenta nuevamente.</p>
      )}
    </div>
  );
}
