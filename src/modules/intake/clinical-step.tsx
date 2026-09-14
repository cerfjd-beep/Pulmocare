"use client";

import { history, reasons, symptoms, type IntakeData } from "./model";

export type UpdateIntake = <K extends keyof IntakeData>(key: K, value: IntakeData[K]) => void;

export function ClinicalStep({
  data,
  update,
  onFile,
}: {
  data: IntakeData;
  update: UpdateIntake;
  onFile?: (file: File | null) => void;
}) {
  function options(key: "symptoms" | "history", values: string[]) {
    const noneKey = key === "symptoms" ? "noSymptoms" : "noHistory";
    return (
      <div className="choice-grid">
        {values.map((value) => (
          <label className="check-card" key={value}>
            <input
              type="checkbox"
              checked={data[key].includes(value)}
              onChange={(event) => {
                update(
                  key,
                  event.target.checked
                    ? [...data[key], value]
                    : data[key].filter((x) => x !== value),
                );
                update(noneKey, false);
              }}
            />
            {value}
          </label>
        ))}
        <label className="check-card">
          <input
            type="checkbox"
            checked={data[noneKey]}
            onChange={(event) => {
              update(noneKey, event.target.checked);
              update(key, []);
            }}
          />
          Ninguno de los anteriores
        </label>
      </div>
    );
  }
  return (
    <div className="stack">
      <div>
        <p className="eyebrow">PRIMERO, TU BIENESTAR</p>
        <h2>Cuéntanos qué necesitas</h2>
        <p>El equipo revisará tus respuestas antes de coordinar la atención.</p>
      </div>
      <fieldset>
        <legend>¿Presentas dificultad respiratoria intensa o dolor en el pecho?</legend>
        <p className="field-help">
          Si ocurre ahora, busca atención inmediata en un centro asistencial.
        </p>
        <div className="choice-grid">
          {["Sí", "No"].map((value) => (
            <label className="check-card" key={value}>
              <input
                type="radio"
                name="alarm"
                checked={data.alarm === value}
                onChange={() => update("alarm", value)}
              />
              {value}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        ¿Cuál es el motivo de consulta?
        <select value={data.reason} onChange={(event) => update("reason", event.target.value)}>
          <option value="">Selecciona un motivo</option>
          {reasons.map((reason) => (
            <option key={reason}>{reason}</option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>¿Tienes receta médica?</legend>
        <div className="choice-grid">
          {["Sí", "No"].map((value) => (
            <label className="check-card" key={value}>
              <input
                type="radio"
                name="prescription"
                checked={data.prescription === value}
                onChange={() => {
                  update("prescription", value);
                  update("fileName", "");
                  onFile?.(null);
                  update("symptoms", []);
                  update("history", []);
                  update("noSymptoms", false);
                  update("noHistory", false);
                }}
              />
              {value}
            </label>
          ))}
        </div>
      </fieldset>
      {data.prescription === "Sí" && (
        <label className="upload-zone">
          Adjunta tu receta
          <small>JPG, PNG o PDF · Máximo 5 MB · Acceso privado para revisar tu solicitud.</small>
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              const valid =
                file &&
                file.size <= 5 * 1024 * 1024 &&
                ["image/jpeg", "image/png", "application/pdf"].includes(file.type);
              event.target.setCustomValidity(
                file && !valid ? "Usa JPG, PNG o PDF de hasta 5 MB." : "",
              );
              event.target.reportValidity();
              update("fileName", valid ? file.name : "");
              onFile?.(valid ? file : null);
            }}
          />
          {data.fileName && <span>Seleccionada: {data.fileName}</span>}
        </label>
      )}
      {
        <>
          <fieldset>
            <legend>Síntomas actuales</legend>
            {options("symptoms", symptoms)}
          </fieldset>
          <fieldset>
            <legend>Antecedentes</legend>
            {options("history", history)}
          </fieldset>
          {data.prescription === "No" && (
            <div className="notice amber">
              Sin receta, la solicitud pasa a valoración médica previa.
            </div>
          )}
        </>
      }
      {["Traqueostomía", "Ventilación mecánica"].includes(data.reason) && (
        <div className="notice amber">
          Este motivo requiere revisión especializada antes de coordinar la visita.
        </div>
      )}
    </div>
  );
}
