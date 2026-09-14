import Link from "next/link";
import { requirePortal } from "./server";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { ProviderReview } from "./forms";
import { ProviderDocuments } from "./provider-documents";
import { TherapistProfile, type ProviderProfile } from "@/modules/administration/portal-details";
const labels: Record<string, string> = {
  draft: "Borrador",
  submitted: "Enviada",
  in_review: "En revisión",
  approved: "Aprobada",
  medical_review: "Valoración médica",
  referred: "Referida",
  cancelled: "Cancelada",
  held: "Reservada",
  confirmed: "Confirmada",
  in_progress: "En curso",
  completed: "Completada",
  expired: "Vencida",
  rescheduled: "Reprogramada",
  no_show: "No asistió",
  pending: "Pendiente de verificación",
  verified: "Verificado",
  suspended: "Suspendido",
};
const statusLabel = (s: string) => labels[s] ?? "Estado por confirmar";
export async function PatientDashboard({ preview = false }: { preview?: boolean } = {}) {
  const account = await requirePortal(preview ? "admin" : "patient");
  const client = await createSupabaseServerClient();
  const [requests, appointments] = await Promise.all([
    preview ? Promise.resolve({ data: [], error: null }) : client.rpc("list_portal_requests"),
    preview
      ? Promise.resolve({ data: [], error: null })
      : client
          .from("appointments")
          .select("id,starts_at,status")
          .order("starts_at", { ascending: false })
          .limit(50),
  ]);
  return (
    <div className="inner-page">
      <p className="eyebrow">ESPACIO DEL PACIENTE</p>
      <h1>{preview ? "Tu espacio como paciente" : `Hola, ${account.access?.name}`}</h1>
      <p>Tus solicitudes y citas, incluyendo los registros que tengas autorizados como cuidador.</p>
      <Link
        className="button primary"
        href={preview ? "/admin/vistas/paciente/solicitar" : "/solicitar"}
      >
        Solicitar un servicio
      </Link>
      <div className="portal-grid">
        <section className="account-card">
          <h2>Mis solicitudes</h2>
          {requests.error ? (
            <p role="alert">No pudimos consultar tus solicitudes.</p>
          ) : !requests.data?.length ? (
            <p>Aún no tienes solicitudes registradas.</p>
          ) : (
            requests.data.map((r) => (
              <article className="request-item" key={r.id}>
                <strong>
                  {r.service_name} · {r.id.slice(0, 8)}
                </strong>
                <p>{statusLabel(r.status)}</p>
                <Link href={`/mis-citas/${r.id}`}>Ver solicitud y formulario enviado</Link>
              </article>
            ))
          )}
        </section>
        <section className="account-card">
          <h2>Mis citas</h2>
          {appointments.error ? (
            <p role="alert">No pudimos consultar tus citas.</p>
          ) : !appointments.data?.length ? (
            <p>Cuando se coordine tu atención, verás aquí la fecha y su estado.</p>
          ) : (
            appointments.data.map((a) => (
              <article className="request-item" key={a.id}>
                <strong>
                  {new Date(a.starts_at).toLocaleString("es-SV", {
                    timeZone: "America/El_Salvador",
                  })}
                </strong>
                <p>{statusLabel(a.status)}</p>
              </article>
            ))
          )}
        </section>
      </div>
      <p>
        Las solicitudes enviadas quedan guardadas y disponibles para que el equipo coordine tu
        atención.
      </p>
    </div>
  );
}
export async function ProviderDashboard() {
  await requirePortal("provider");
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("read_provider_profile");
  return (
    <div className="inner-page">
      {error || !data ? (
        <p className="notice">No pudimos consultar tu perfil.</p>
      ) : (
        <>
          <TherapistProfile profile={data as unknown as ProviderProfile} />
          <ProviderDocuments />
        </>
      )}
    </div>
  );
}
export async function AdministrationDashboard() {
  const account = await requirePortal("admin");
  const client = await createSupabaseServerClient();
  const roles = account.access?.roles ?? [];
  const [registrations, requests] = await Promise.all([
    roles.includes("access_admin") ? client.rpc("list_provider_registrations") : null,
    roles.includes("operations_admin") ? client.rpc("list_portal_requests") : null,
  ]);
  return (
    <div className="inner-page">
      <p className="eyebrow">ESPACIO DE ADMINISTRACIÓN</p>
      <h1>Hola, {account.access?.name}</h1>
      <p>Las herramientas disponibles corresponden a los permisos de tu cuenta.</p>
      <div className="button-row">
        <Link className="button secondary" href="/admin/vistas/paciente">
          Ver portal y formularios del paciente
        </Link>
        <Link className="button secondary" href="/admin/vistas/terapeuta">
          Ver portal del terapeuta
        </Link>
      </div>
      {roles.some((r) => ["operations_admin", "billing_admin"].includes(r)) && (
        <Link className="button primary" href="/admin/precios">
          Administrar precios y descuentos
        </Link>
      )}
      <div className="portal-grid">
        {roles.includes("operations_admin") && (
          <section className="account-card">
            <h2>Coordinación</h2>
            <p>Consulta las solicitudes y planifica los costos de traslado.</p>
            <Link className="button secondary" href="/admin/traslados">
              Calcular traslado
            </Link>
          </section>
        )}
        {roles.includes("billing_admin") && (
          <section className="account-card">
            <h2>Facturación</h2>
            <p>
              Tienes permiso de facturación. La gestión de cobros desde esta pantalla todavía no
              está disponible.
            </p>
          </section>
        )}
        {roles.includes("access_admin") && (
          <section className="account-card">
            <h2>Control de accesos</h2>
            <p>
              Verifica la identidad y el registro profesional antes de aprobar a un prestador. Las
              decisiones quedan registradas.
            </p>
          </section>
        )}
      </div>
      {registrations && (
        <section>
          <h2>Prestadores del servicio</h2>
          {registrations.error ? (
            <p role="alert">No pudimos cargar los prestadores.</p>
          ) : !registrations.data?.length ? (
            <p>No hay prestadores registrados.</p>
          ) : (
            <div className="account-list">
              {registrations.data.map((p) => (
                <article className="account-card" key={p.id}>
                  <h3>{p.display_name}</h3>
                  <p>
                    {p.specialty} · Registro: {p.registration_ref}
                  </p>
                  <strong>{statusLabel(p.verification_status)}</strong>
                  <p>
                    <Link href={`/admin/prestadores/${p.id}`}>
                      Abrir perfil completo del terapeuta
                    </Link>
                  </p>
                  <ProviderDocuments target={p.id} />
                  <ProviderReview id={p.id} status={p.verification_status} />
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {requests && (
        <section className="account-card">
          <h2>Solicitudes recientes</h2>
          {requests.error ? (
            <p role="alert">No pudimos cargar las solicitudes.</p>
          ) : !requests.data?.length ? (
            <p>No hay solicitudes registradas.</p>
          ) : (
            requests.data.map((r) => (
              <article className="request-item" key={r.id}>
                <strong>
                  {r.patient_name} ? {r.service_name}
                </strong>
                <p>{statusLabel(r.status)}</p>
                <Link href={`/admin/solicitudes/${r.id}`}>
                  Abrir formulario y detalle de la solicitud
                </Link>
              </article>
            ))
          )}
        </section>
      )}
    </div>
  );
}
