"use client";

import { useDemo } from "@/modules/demo/provider";

const vitalSigns = [
  ["fc", "FC · latidos/min", 1, 300, 1],
  ["fr", "FR · respiraciones/min", 1, 100, 1],
  ["systolic", "PA sistólica · mmHg", 1, 300, 1],
  ["diastolic", "PA diastólica · mmHg", 1, 200, 1],
  ["temperature", "Temperatura · °C", 25, 45, 0.1],
  ["spo2", "Saturación · %", 1, 100, 1],
] as const;

export function VisitForm({ requestId, close }: { requestId: string; close: () => void }) {
  const { updateRequest } = useDemo();
  return (
    <form
      className="visit-form stack"
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const vitals = vitalSigns.map(([key, label]) => label + ": " + fields.get(key)).join(" · ");
        const note = [
          vitals,
          "Procedimiento: " + fields.get("procedure"),
          "Evolución: " + fields.get("evolution"),
          "Recomendaciones: " + fields.get("recommendations"),
        ].join("\n");
        updateRequest(requestId, { status: "Visita completada", note });
        close();
      }}
    >
      <div>
        <p className="eyebrow">REGISTRO DE EJEMPLO</p>
        <h3>Atención domiciliaria</h3>
        <p>Los límites del formulario validan el formato; no interpretan signos vitales.</p>
      </div>
      <div className="two-fields">
        {vitalSigns.map(([name, label, min, max, step]) => (
          <label key={name}>
            {label}
            <input name={name} type="number" min={min} max={max} step={step} required />
          </label>
        ))}
      </div>
      <label>
        Procedimiento realizado
        <textarea name="procedure" required maxLength={1000} />
      </label>
      <label>
        Evolución
        <textarea name="evolution" required maxLength={1000} />
      </label>
      <label>
        Recomendaciones
        <textarea name="recommendations" required maxLength={1000} />
      </label>
      <div className="button-row">
        <button className="button primary" type="submit">
          Completar visita de ejemplo
        </button>
        <button className="button secondary" type="button" onClick={close}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
