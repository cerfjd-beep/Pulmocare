"use client";

import { useState } from "react";
import { CalendarDays, ClipboardList, CircleCheck, Search } from "lucide-react";
import { useDemo, type RequestStatus } from "@/modules/demo/provider";
import { money } from "@/modules/services/catalog";
import { VisitForm } from "./visit-form";

export function TeamPanel() {
  const { requests, updateRequest } = useDemo();
  const [filter, setFilter] = useState("Todas");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visit, setVisit] = useState<string | null>(null);
  const visible = requests.filter(
    (item) =>
      (filter === "Todas" || item.status === filter) &&
      (item.patient + item.id + item.service)
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const pending = requests.filter((x) =>
    ["Pendiente de revisión", "Valoración médica previa"].includes(x.status),
  );
  const completed = requests.filter((x) => x.status === "Visita completada");
  return (
    <div className="stack">
      <div className="notice">
        Vista de demostración del equipo. Los controles simulan permisos y revisión; no existe
        autenticación ni acceso a pacientes reales.
      </div>
      <div className="stats-grid">
        {[
          { label: "Solicitudes en revisión", number: pending.length, icon: ClipboardList },
          {
            label: "Por coordinar",
            number: requests.filter((x) => x.status === "Aprobada para coordinar").length,
            icon: CalendarDays,
          },
          { label: "Visitas completadas", number: completed.length, icon: CircleCheck },
        ].map(({ label, number, icon: Icon }) => (
          <div className="stat-card" key={label}>
            <Icon size={22} />
            <strong>{number.toString().padStart(2, "0")}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="form-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">COORDINACIÓN DE ATENCIÓN</p>
            <h2>Bandeja de solicitudes</h2>
          </div>
        </div>
        <div className="filter-row">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Buscar solicitudes"
              placeholder="Buscar paciente, servicio o referencia"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar por estado"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {[
              "Todas",
              "Pendiente de revisión",
              "Valoración médica previa",
              "Aprobada para coordinar",
              "Visita completada",
            ].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="request-list">
          {visible.map((item) => (
            <article className="request-item" key={item.id}>
              <div className="request-heading">
                <div>
                  <small>{item.id}</small>
                  <h3>{item.patient}</h3>
                  <p>{item.service}</p>
                </div>
                <span className="state-pill">{item.status}</span>
              </div>
              <div className="request-meta">
                <span>{item.slot}</span>
                <strong>{money(item.total)}</strong>
              </div>
              <button
                className="text-button"
                aria-expanded={expanded === item.id}
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              >
                {expanded === item.id ? "Ocultar detalle" : "Revisar solicitud →"}
              </button>
              {expanded === item.id && (
                <div className="request-detail">
                  <dl className="summary-list">
                    {[
                      ["Motivo", item.reason],
                      ["Síntomas", item.symptoms.join(", ") || "No registrados"],
                      ["Antecedentes", item.history.join(", ") || "No registrados"],
                      ["Receta", item.prescription],
                      ["Ubicación", item.address],
                      ["Pago preferido", item.payment],
                    ].map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {["Pendiente de revisión", "Valoración médica previa"].includes(item.status) && (
                    <ReviewForm
                      requestId={item.id}
                      update={(status) => updateRequest(item.id, { status })}
                    />
                  )}
                  {item.status === "Aprobada para coordinar" && visit !== item.id && (
                    <button className="button primary" onClick={() => setVisit(item.id)}>
                      Simular visita y registrar atención
                    </button>
                  )}
                  {visit === item.id && (
                    <VisitForm requestId={item.id} close={() => setVisit(null)} />
                  )}
                  {item.note && (
                    <div className="clinical-note">
                      <strong>Registro de atención</strong>
                      <p>{item.note}</p>
                    </div>
                  )}
                  {item.status === "Visita completada" && (
                    <p className="notice">
                      Seguimiento previsto: 24 horas después de la visita. En esta demo se responde
                      desde Mis solicitudes.
                    </p>
                  )}
                  {item.followUp && (
                    <div className="notice amber">
                      Seguimiento recibido: {item.followUp}
                      {item.followUp !== "Mejoré" && " · Requiere revisión del equipo."}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
        {!visible.length && <p className="empty-state">No hay solicitudes con estos filtros.</p>}
      </section>
    </div>
  );
}

function ReviewForm({
  requestId,
  update,
}: {
  requestId: string;
  update: (status: RequestStatus) => void;
}) {
  return (
    <form
      className="review-form stack"
      onSubmit={(event) => {
        event.preventDefault();
        update("Aprobada para coordinar");
      }}
    >
      <label className="check-card">
        <input required type="checkbox" name={requestId} />
        Simular que el profesional revisó fecha, diagnóstico, indicación y aplicabilidad.
      </label>
      <div className="button-row">
        <button className="button primary" type="submit">
          Simular aprobación
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => update("Valoración médica previa")}
        >
          Requiere valoración médica
        </button>
      </div>
    </form>
  );
}
