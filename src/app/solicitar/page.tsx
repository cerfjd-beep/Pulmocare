import { IntakeWizard } from "@/modules/intake/wizard";

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ servicio?: string }>;
}) {
  const { servicio } = await searchParams;
  return (
    <div className="inner-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ATENCIÓN RESPIRATORIA DOMICILIAR</p>
          <h1>Estamos para cuidarte.</h1>
          <p>Una solicitud sencilla, con orientación en cada paso.</p>
        </div>
      </div>
      <IntakeWizard serviceId={servicio} />
    </div>
  );
}
