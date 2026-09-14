"use client";
import { useActionState, useState } from "react";
import { savePrice, saveDiscount } from "./pricing-actions";
import { money } from "@/modules/services/catalog";
export function PriceForm({
  item,
}: {
  item: {
    service_id: string;
    name: string;
    billing_unit: string;
    amount_cents: number | null;
    price_id: string | null;
    scope: string | null;
  };
}) {
  const [state, action, pending] = useActionState(savePrice, {});
  return (
    <form action={action} className="account-form account-card">
      <h3>{item.name}</h3>
      <p>
        {item.billing_unit === "phase" ? "Precio por etapa acordada" : "Precio por sesión"}:{" "}
        {money(item.amount_cents)}
      </p>
      <input type="hidden" name="id" value={item.service_id} />
      <input type="hidden" name="version" value={item.price_id ?? ""} />
      <label>
        Precio en USD
        <input
          name="amount"
          type="number"
          min="0"
          max="1000000"
          step="0.01"
          required
          defaultValue={item.amount_cents === null ? "" : (item.amount_cents / 100).toFixed(2)}
        />
      </label>
      <label>
        Qué incluye el precio{item.billing_unit === "phase" ? " (obligatorio)" : ""}
        <textarea
          name="scope"
          maxLength={2000}
          minLength={item.billing_unit === "phase" ? 10 : undefined}
          required={item.billing_unit === "phase"}
          defaultValue={item.scope ?? ""}
        />
      </label>
      {item.billing_unit === "phase" && (
        <p>
          Define prestaciones incluidas, período de atención, reevaluación, exclusiones y cómo se
          cotiza una extensión. La cantidad de intervenciones se individualiza; no se promete
          atención ilimitada ni un resultado clínico.
        </p>
      )}
      <p role="status">{state.error ?? state.message}</p>
      <button className="button primary" disabled={pending}>
        {pending ? "Publicando…" : "Publicar precio"}
      </button>
    </form>
  );
}
export function DiscountForm({
  percent,
  revision,
  unitPrice,
}: {
  percent: number;
  revision: string;
  unitPrice: number | null;
}) {
  const [value, setValue] = useState(String(percent));
  const [state, action, pending] = useActionState(saveDiscount, {});
  const valid =
    value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
  const total =
    unitPrice === null || !valid ? null : Math.round((unitPrice * 7 * (100 - Number(value))) / 100);
  return (
    <form action={action} className="account-form account-card">
      <h2>Nebulizaciones · 7 días</h2>
      <input type="hidden" name="version" value={revision} />
      <label>
        Descuento (%)
        <input
          name="discount"
          type="number"
          min="0"
          max="100"
          step="0.01"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <p>
        {money(unitPrice)} × 7 × (1 − {value || "0"}/100) = <strong>{money(total)}</strong>
      </p>
      <p>
        Descuento sobre las siete sesiones. Traslados aparte. Cambiar el precio individual recalcula
        el tratamiento para nuevas solicitudes.
      </p>
      <p role="status">{state.error ?? state.message}</p>
      <button className="button primary" disabled={pending}>
        {pending ? "Guardando…" : "Publicar descuento"}
      </button>
    </form>
  );
}
