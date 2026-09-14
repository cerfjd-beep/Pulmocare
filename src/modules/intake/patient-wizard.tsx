"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { initialIntake, hasAlarm } from "./model";
import { ClinicalStep } from "./clinical-step";
import { validatePatientStep, type PatientIntake } from "./live-model";
import type { IntakeData } from "./model";
import { money, paymentMethods, type ServiceOption } from "@/modules/services/catalog";

export function PatientWizard({
  services,
  serviceId,
  name = "",
  preview = false,
}: {
  services: ServiceOption[];
  serviceId?: string;
  name?: string;
  preview?: boolean;
}) {
  const [data, setData] = useState<PatientIntake>({
    ...initialIntake,
    patient: name,
    phone: "",
    birthDate: "",
    serviceId: services.find((s) => s.id === serviceId)?.id ?? services[0]?.id ?? "evaluation",
  });
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState("");
  const key = useRef<string | null>(null);
  const inFlight = useRef(false);
  const update = <K extends keyof PatientIntake>(field: K, value: PatientIntake[K]) => {
    setData((d) => ({ ...d, [field]: value }));
    setError("");
    key.current = null;
  };
  const updateClinical = <K extends keyof IntakeData>(field: K, value: IntakeData[K]) => {
    update(field, value as PatientIntake[K]);
  };
  const selected = services.find((s) => s.id === data.serviceId);
  const steps = ["Tu necesidad", "Contacto y dirección", "Servicio y fecha", "Revisar y enviar"];
  async function submit() {
    if (inFlight.current) return;
    if (preview) {
      setError(
        "Vista previa: esta solicitud no se enviará. Los pacientes utilizan este mismo formulario desde su cuenta.",
      );
      return;
    }
    for (let index = 0; index < 3; index++) {
      const invalid = validatePatientStep(index, data);
      if (invalid) {
        setStep(index);
        setError(invalid);
        return;
      }
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      key.current ??= crypto.randomUUID();
      const form = new FormData();
      form.set("data", JSON.stringify(data));
      form.set("key", key.current);
      if (file) form.set("prescription", file);
      const response = await fetch("/api/patient-requests", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.id)
        throw new Error(result.error || "No se pudo enviar la solicitud.");
      setCreated(result.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo conectar. Vuelve a intentar.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  if (created)
    return (
      <section className="form-card success-card">
        <p className="eyebrow">SOLICITUD RECIBIDA</p>
        <h1>Tu solicitud quedó guardada</h1>
        <p>Referencia: {created.slice(0, 8)}</p>
        <p>
          Administración ya puede consultarla y coordinar la revisión. La fecha es una preferencia;
          aún no es una cita confirmada.
        </p>
        <Link href={`/mis-citas/${created}`} className="button primary">
          Ver mi solicitud
        </Link>
      </section>
    );
  if (!selected)
    return <p className="notice">No hay servicios disponibles para solicitar en este momento.</p>;
  return (
    <div className="intake-layout">
      <aside className="journey">
        <h2>Tu solicitud</h2>
        <ol>
          {steps.map((label, index) => (
            <li
              key={label}
              className={step === index ? "current" : ""}
              aria-current={step === index ? "step" : undefined}
            >
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        {preview && (
          <p className="notice">
            Vista previa del administrador. Explora los pasos sin enviar datos.
          </p>
        )}
      </aside>
      <section className="form-card" aria-label={steps[step]}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          {step === 0 && <ClinicalStep data={data} update={updateClinical} onFile={setFile} />}
          {step === 1 && (
            <div className="stack">
              <h2>Contacto y ubicación</h2>
              <label>
                Nombre completo del paciente
                <input
                  value={data.patient}
                  maxLength={100}
                  autoComplete="name"
                  onChange={(e) => update("patient", e.target.value)}
                />
              </label>
              <div className="two-fields">
                <label>
                  Teléfono de contacto
                  <input
                    type="tel"
                    value={data.phone}
                    maxLength={16}
                    autoComplete="tel"
                    placeholder="+50370000000"
                    onChange={(e) => update("phone", e.target.value.replace(/[\s()-]/g, ""))}
                  />
                </label>
                <label>
                  Fecha de nacimiento
                  <input
                    type="date"
                    value={data.birthDate}
                    onChange={(e) => update("birthDate", e.target.value)}
                  />
                </label>
              </div>
              <div className="two-fields">
                <label>
                  Departamento
                  <input
                    value={data.department}
                    maxLength={100}
                    onChange={(e) => update("department", e.target.value)}
                  />
                </label>
                <label>
                  Municipio
                  <input
                    value={data.municipality}
                    maxLength={100}
                    onChange={(e) => update("municipality", e.target.value)}
                  />
                </label>
              </div>
              <label>
                Dirección
                <input
                  value={data.address}
                  maxLength={200}
                  autoComplete="street-address"
                  onChange={(e) => update("address", e.target.value)}
                />
              </label>
              <label>
                Referencias para llegar
                <input
                  value={data.reference}
                  maxLength={200}
                  onChange={(e) => update("reference", e.target.value)}
                />
              </label>
              <p>
                Confirmaremos la cobertura y el costo del traslado antes de aceptar la atención.
              </p>
              <label className="check-card">
                <input
                  type="checkbox"
                  checked={data.consent}
                  onChange={(e) => update("consent", e.target.checked)}
                />
                Autorizo a Pulmocare a guardar estos datos y compartirlos con el equipo autorizado
                para revisar y coordinar mi solicitud.
              </label>
            </div>
          )}
          {step === 2 && (
            <div className="stack">
              <h2>Servicio y fecha preferida</h2>
              <label>
                Servicio
                <select
                  value={data.serviceId}
                  onChange={(e) => update("serviceId", e.target.value)}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {money(s.cents)}
                    </option>
                  ))}
                </select>
              </label>
              <p>{selected.description}</p>
              <label>
                Fecha y hora preferida (El Salvador)
                <input
                  type="datetime-local"
                  value={data.slot}
                  onChange={(e) => update("slot", e.target.value)}
                />
              </label>
              <p>El equipo confirmará la disponibilidad. Esta selección no reserva una cita.</p>
              <label>
                Forma de pago de preferencia
                <select value={data.payment} onChange={(e) => update("payment", e.target.value)}>
                  {paymentMethods.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <p>No se realiza ningún cobro al enviar la solicitud.</p>
              <div className="price-breakdown">
                <div>
                  <span>Servicio o etapa</span>
                  <strong>{money(selected.cents)}</strong>
                </div>
                <div>
                  <span>Traslado y total final</span>
                  <strong>Por confirmar</strong>
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="stack">
              <h2>Revisa tu solicitud</h2>
              <dl className="summary-list">
                {[
                  ["Paciente", data.patient],
                  ["Teléfono", data.phone],
                  ["Nacimiento", data.birthDate],
                  ["Servicio", selected.name],
                  ["Motivo", data.reason],
                  ["Síntomas", data.symptoms.join(", ") || "Ninguno de los listados"],
                  ["Antecedentes", data.history.join(", ") || "Ninguno de los listados"],
                  ["Receta", data.fileName || "Sin receta"],
                  [
                    "Dirección",
                    [data.address, data.municipality, data.department, data.reference]
                      .filter(Boolean)
                      .join(" · "),
                  ],
                  ["Fecha preferida", data.slot.replace("T", " ")],
                  ["Forma de pago", data.payment],
                  ["Precio del servicio", money(selected.cents)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p>
                El equipo revisará la solicitud. La atención, el precio final y los traslados se
                confirman antes de contratar el servicio.
              </p>
            </div>
          )}
          {hasAlarm(data) && (
            <div role="alert" className="notice red">
              <strong>Busca atención inmediata.</strong>
              <p>
                Acude a un centro asistencial o contacta al servicio local de emergencias. No
                esperes una visita domiciliaria.
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="notice">
              {error}
            </p>
          )}
          <div className="form-actions">
            {step > 0 && (
              <button
                className="button secondary"
                onClick={() => {
                  setStep(step - 1);
                  setError("");
                }}
              >
                Atrás
              </button>
            )}
            <button
              className="button primary"
              disabled={busy || hasAlarm(data)}
              onClick={() => {
                if (step === 3) {
                  void submit();
                  return;
                }
                const invalid = validatePatientStep(step, data);
                if (invalid && !preview) setError(invalid);
                else {
                  setStep(step + 1);
                  setError("");
                }
              }}
            >
              {busy
                ? "Guardando solicitud…"
                : step === 3
                  ? preview
                    ? "Probar envío (vista previa)"
                    : "Enviar solicitud"
                  : "Continuar"}
            </button>
          </div>
        </fieldset>
      </section>
    </div>
  );
}
