import Link from "next/link";
import type { Json } from "@/integrations/supabase/database.types";
import { money } from "@/modules/services/catalog";

export type ProviderProfile = {
  id: string;
  name: string;
  specialty: string;
  registration: string | null;
  status: string;
  active: boolean;
  createdAt: string;
  assignments: { id: string; status: string; purpose: string }[];
};
const labels: Record<string, string> = {
  submitted: "Enviada",
  in_review: "En revisión",
  medical_review: "Valoración médica",
  approved: "Aprobada",
  cancelled: "Cancelada",
  pending: "Pendiente de verificación",
  verified: "Verificado",
  suspended: "Suspendido",
  draft: "Pendiente de enviar",
};
export const portalStatus = (value: string) => labels[value] ?? value;
export function TherapistProfile({
  profile,
  admin = false,
  preview = false,
}: {
  profile: ProviderProfile;
  admin?: boolean;
  preview?: boolean;
}) {
  return (
    <section className="stack">
      <p className="eyebrow">PERFIL DEL TERAPEUTA</p>
      <h1>{profile.name}</h1>
      <div className="portal-grid">
        <section className="account-card">
          <h2>Acreditación</h2>
          <p>{profile.specialty}</p>
          <p>Registro profesional: {profile.registration || "Pendiente"}</p>
          <strong>{portalStatus(profile.status)}</strong>
          <p>{profile.active ? "Perfil activo" : "Perfil inactivo"}</p>
        </section>
        <section className="account-card">
          <h2>Planificación</h2>
          <p>Consulta el traslado para preparar tus visitas.</p>
          <Link
            className="button secondary"
            href={admin || preview ? "/admin/traslados" : "/equipo/traslado"}
          >
            Calcular traslado
          </Link>
        </section>
      </div>
      <section className="account-card">
        <h2>Asignaciones</h2>
        {!profile.assignments.length ? (
          <p>No hay asignaciones activas.</p>
        ) : (
          profile.assignments.map((a) => (
            <article className="request-item" key={a.id + a.purpose}>
              <strong>Solicitud {a.id.slice(0, 8)}</strong>
              <p>
                {portalStatus(a.status)} · {a.purpose === "review" ? "Revisión" : "Atención"}
              </p>
              {!preview && (
                <Link href={admin ? `/admin/solicitudes/${a.id}` : `/equipo/solicitudes/${a.id}`}>
                  Abrir solicitud
                </Link>
              )}
            </article>
          ))
        )}
      </section>
    </section>
  );
}
type Submission = {
  id: string;
  status: string;
  patientId: string;
  patientName: string;
  phone: string;
  birthDate: string;
  preferredAt: string;
  submittedAt: string;
  prescriptionId: string | null;
  details: {
    input: Record<string, Json>;
    serviceName: string;
    serviceCents: number | null;
    serviceScope: string | null;
  } | null;
};
function display(value: Json | undefined): string {
  if (value === null || value === undefined || value === "") return "No indicado";
  if (Array.isArray(value))
    return value.length ? value.map(display).join(", ") : "Ninguno de los listados";
  return typeof value === "boolean" ? (value ? "Sí" : "No") : String(value);
}
export function PatientSubmission({ value }: { value: Json }) {
  const r = value as unknown as Submission;
  const input = r.details?.input;
  return (
    <section className="stack">
      <p className="eyebrow">SOLICITUD {r.id.slice(0, 8)}</p>
      <h1>{r.details?.serviceName || "Solicitud de atención"}</h1>
      <strong>{portalStatus(r.status)}</strong>
      <p>
        Fecha preferida:{" "}
        {new Date(r.preferredAt).toLocaleString("es-SV", { timeZone: "America/El_Salvador" })}.
        Sujeta a confirmación.
      </p>
      <section className="account-card">
        <h2>Datos enviados por el paciente</h2>
        <dl className="summary-list">
          {[
            ["Nombre", input?.patient ?? r.patientName],
            ["Teléfono", input?.phone ?? r.phone],
            ["Nacimiento", input?.birthDate ?? r.birthDate],
            ["Departamento", input?.department],
            ["Municipio", input?.municipality],
            ["Dirección", input?.address],
            ["Referencias", input?.reference],
            ["Motivo", input?.reason],
            ["Señales de alarma declaradas", input?.alarm],
            ["Síntomas", input?.symptoms],
            ["Antecedentes", input?.history],
            ["Declara receta", input?.prescription],
            ["Forma de pago", input?.payment],
            ["Autorización para guardar y revisar los datos", input?.consent],
          ].map(([label, val]) => (
            <div key={String(label)}>
              <dt>{String(label)}</dt>
              <dd>{display(val)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="account-card">
        <h2>Servicio y receta</h2>
        <p>Precio del servicio al solicitar: {money(r.details?.serviceCents ?? null)}</p>
        <p>{r.details?.serviceScope}</p>
        <p>Traslados y total final pendientes de confirmación.</p>
        {r.prescriptionId ? (
          <a href={`/api/patient-requests/files/${r.prescriptionId}`}>Descargar receta adjunta</a>
        ) : (
          <p>Sin receta adjunta.</p>
        )}
        <p>Las respuestas y la receta están pendientes de revisión profesional.</p>
      </section>
    </section>
  );
}
