import Link from "next/link";
import { requirePortal } from "./server";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { ProviderReview } from "./forms";
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
export async function PatientDashboard() {
  const account = await requirePortal("patient");
  const client = await createSupabaseServerClient();
  const [requests, appointments] = await Promise.all([
    client
      .from("service_requests")
      .select("id,status,submitted_at")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(50),
    client
      .from("appointments")
      .select("id,starts_at,status")
      .order("starts_at", { ascending: false })
      .limit(50),
  ]);
  return (
    <div className="inner-page">
      <p className="eyebrow">ESPACIO DEL PACIENTE</p>
      <h1>Hola, {account.access?.name}</h1>
      <p>Tus solicitudes y citas, incluyendo los registros que tengas autorizados como cuidador.</p>
      <Link className="button secondary" href="/">
        Ver servicios
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
                <strong>Solicitud {r.id.slice(0, 8)}</strong>
                <p>{statusLabel(r.status)}</p>
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
      <p className="notice">
        El formulario de solicitud continúa en demostración. Sus datos de prueba no se guardan como
        solicitudes reales.
      </p>
    </div>
  );
}
export async function ProviderDashboard() {
  const account = await requirePortal("provider");
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("list_my_assignments");
  const verified = account.access?.professional_status === "verified";
  return (
    <div className="inner-page">
      <p className="eyebrow">ESPACIO DEL PRESTADOR</p>
      <h1>Hola, {account.access?.name}</h1>
      <p>Tu acreditación y tus asignaciones de atención.</p>
      <div className="portal-grid">
        <section className="account-card">
          <h2>Mi acreditación</h2>
          <strong>{statusLabel(account.access?.professional_status ?? "pending")}</strong>
          <p>
            {verified
              ? "Tu perfil está verificado. Las asignaciones dependen de tus competencias y disponibilidad."
              : "La administración debe verificar tu registro profesional antes de habilitar la atención de pacientes."}
          </p>
        </section>
        <section className="account-card">
          <h2>Planificación</h2>
          <p>Consulta una estimación de traslado para preparar tus visitas.</p>
          {verified && (
            <Link className="button secondary" href="/equipo/traslado">
              Calcular traslado
            </Link>
          )}
        </section>
      </div>
      <section className="account-card">
        <h2>Mis asignaciones</h2>
        {error ? (
          <p role="alert">No pudimos consultar tus asignaciones.</p>
        ) : !data?.length ? (
          <p>No tienes asignaciones activas para mostrar.</p>
        ) : (
          data.map((r) => (
            <article className="request-item" key={`${r.id}-${r.purpose}`}>
              <strong>Solicitud {r.id.slice(0, 8)}</strong>
              <p>
                {r.purpose === "review" ? "Revisión clínica" : "Atención asignada"} ·{" "}
                {statusLabel(r.status)}
              </p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
export async function AdministrationDashboard() {
  const account = await requirePortal("admin");
  const client = await createSupabaseServerClient();
  const roles = account.access?.roles ?? [];
  const [registrations, requests] = await Promise.all([
    roles.includes("access_admin") ? client.rpc("list_provider_registrations") : null,
    roles.includes("operations_admin")
      ? client.rpc("list_operations_requests", { page_size: 50 })
      : null,
  ]);
  return (
    <div className="inner-page">
      <p className="eyebrow">ESPACIO DE ADMINISTRACIÓN</p>
      <h1>Hola, {account.access?.name}</h1>
      <p>Las herramientas disponibles corresponden a los permisos de tu cuenta.</p>
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
                <strong>Solicitud {r.id.slice(0, 8)}</strong>
                <p>{statusLabel(r.status)}</p>
              </article>
            ))
          )}
        </section>
      )}
    </div>
  );
}
