"use client";

import Link from "next/link";
import { CalendarDays, ClipboardList, CircleCheck } from "lucide-react";
import { useDemo } from "@/modules/demo/provider";
import { money, services } from "@/modules/services/catalog";
import { travelTariff } from "@/modules/travel/pricing";

export function AdminDashboard() {
  const { requests } = useDemo();
  const pending = requests.filter((request) =>
    ["Pendiente de revisión", "Valoración médica previa"].includes(request.status),
  ).length;
  return (
    <div className="stack">
      <div className="notice">
        Administración de demostración. La separación de pantallas aún no incluye autenticación ni
        permisos de producción.
      </div>
      <div className="stats-grid">
        {[
          { label: "Solicitudes recibidas", number: requests.length, icon: ClipboardList },
          { label: "Pendientes de revisión clínica", number: pending, icon: CalendarDays },
          {
            label: "Visitas completadas",
            number: requests.filter((r) => r.status === "Visita completada").length,
            icon: CircleCheck,
          },
        ].map(({ label, number, icon: Icon }) => (
          <div className="stat-card" key={label}>
            <Icon size={22} />
            <strong>{number}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="form-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OPERACIÓN</p>
            <h2>Solicitudes y coordinación</h2>
          </div>
          <Link href="/equipo" className="text-button">
            Abrir revisión clínica →
          </Link>
        </div>
        <p>
          Consulta el estado operativo. El equipo clínico evalúa la aplicabilidad y registra la
          atención.
        </p>
        {requests.map((request) => (
          <article key={request.id} className="request-item">
            <div className="request-heading">
              <div>
                <small>{request.id}</small>
                <h3>{request.patient}</h3>
                <p>{request.service}</p>
              </div>
              <span className="state-pill">{request.status}</span>
            </div>
            <div className="request-meta">
              <span>{request.slot}</span>
              <strong>
                {money(request.total)}
                {request.total !== null && " estimados"}
              </strong>
            </div>
            <small>Preferencia de pago: {request.payment}. No representa un cobro recibido.</small>
          </article>
        ))}
        {!requests.length && <p className="empty-state">Aún no hay solicitudes.</p>}
      </section>
      <section className="form-card stack">
        <div>
          <p className="eyebrow">CATÁLOGO ACTUAL</p>
          <h2>Servicios y tarifas</h2>
          <p>
            Precios de demostración en consulta. La edición y su historial se añadirán al módulo
            operativo.
          </p>
        </div>
        <dl className="summary-list">
          {services.map((service) => (
            <div key={service.id}>
              <dt>
                {service.name} · {service.minutes} min
              </dt>
              <dd>{money(service.cents)}</dd>
            </div>
          ))}
        </dl>
        <div className="notice">
          Tráfico: {money(travelTariff.trafficCentsPerMinute)} por minuto adicional, hasta{" "}
          {money(travelTariff.maxTrafficCents)}. Tarifas pendientes de aprobación comercial.
        </div>
        <Link className="button primary fit-content" href="/admin/traslados">
          Calcular costo de traslado
        </Link>
      </section>
    </div>
  );
}
