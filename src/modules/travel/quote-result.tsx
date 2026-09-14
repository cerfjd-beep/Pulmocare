"use client";

import { useEffect, useState } from "react";
import { money } from "@/modules/services/catalog";
import type { TravelEstimate } from "./types";

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function QuoteResult({
  estimate,
  serviceCents,
}: {
  estimate: TravelEstimate;
  serviceCents: number | null;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const expired = now >= new Date(estimate.expiresAt).getTime();
  return (
    <section className="form-card stack" aria-label="Resultado del traslado" aria-live="polite">
      <div>
        <p className="eyebrow">DESGLOSE DEL TRASLADO</p>
        <h2>{money(estimate.travelCents)}</h2>
        <p>
          {estimate.source === "simulation"
            ? "Ejemplo simulado · No es una cotización real"
            : "Estimación de ruta · Datos de Google Maps"}
        </p>
      </div>
      <dl className="summary-list">
        {[
          ["Distancia de ida", (estimate.distanceMeters / 1000).toFixed(2) + " km"],
          ["Tiempo de referencia", (estimate.baselineSeconds! / 60).toFixed(1) + " min"],
          ["Tiempo con tráfico", (estimate.durationSeconds / 60).toFixed(1) + " min"],
          ["Tiempo adicional", (estimate.delaySeconds / 60).toFixed(1) + " min"],
          ["Salida sugerida", dateLabel(estimate.departureAt)],
          ["Llegada estimada", dateLabel(estimate.arrivalAt)],
          ["Inicio de atención", dateLabel(estimate.appointmentAt)],
        ].map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="price-breakdown">
        <div>
          <span>Recargo por distancia</span>
          <strong>{money(estimate.distanceCents)}</strong>
        </div>
        <div>
          <span>Recargo por tráfico</span>
          <strong>{money(estimate.trafficCents)}</strong>
        </div>
        <div>
          <span>Servicio seleccionado</span>
          <strong>{money(serviceCents)}</strong>
        </div>
        <div className="price-total">
          <span>Total estimado</span>
          <strong>
            {money(serviceCents === null ? null : serviceCents + estimate.travelCents)}
          </strong>
        </div>
      </div>
      <p className={expired ? "notice amber" : "notice"}>
        {expired
          ? "Esta estimación venció. Recalcula antes de coordinar el servicio."
          : "Vigente hasta " +
            dateLabel(estimate.expiresAt) +
            ". Incluye 10 minutos de margen de llegada."}
      </p>
      <p className="fine-print">
        Solo ida. No incluye regreso ni peajes. El tráfico futuro es una previsión. Las tarifas de
        ejemplo aún no están aprobadas para cobro.
      </p>
    </section>
  );
}
