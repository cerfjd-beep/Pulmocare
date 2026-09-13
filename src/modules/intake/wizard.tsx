"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useDemo } from "@/modules/demo/provider";
import { services, quote, money } from "@/modules/services/catalog";
import { ClinicalStep, type UpdateIntake } from "./clinical-step";
import { LocationStep } from "./location-step";
import { ScheduleStep } from "./schedule-step";
import { hasAlarm, initialIntake, needsPriorReview, validateStep } from "./model";

const steps = ["Tu necesidad", "Ubicación", "Servicio y horario", "Resumen"];

export function IntakeWizard({ serviceId }: { serviceId?: string }) {
  const [data, setData] = useState({
    ...initialIntake,
    serviceId: services.some((x) => x.id === serviceId) ? serviceId! : "evaluation",
  });
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  const { addRequest } = useDemo();
  const update: UpdateIntake = (key, value) => {
    setData((current) => ({ ...current, [key]: value }));
    setError("");
  };
  const selected = services.find((item) => item.id === data.serviceId) ?? services[0];
  const alarm = hasAlarm(data);

  function next() {
    const invalid = validateStep(step, data);
    if (invalid) {
      setError(invalid);
      return;
    }
    setStep(step + 1);
    setError("");
  }

  function submit() {
    for (let index = 0; index < 3; index++) {
      const invalid = validateStep(index, data);
      if (invalid) {
        setStep(index);
        setError(invalid);
        return;
      }
    }
    const id = "PC-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    addRequest({
      id,
      patient: data.patient,
      reason: data.reason,
      symptoms: data.symptoms,
      history: data.history,
      prescription: data.fileName || "Sin receta",
      service: selected.name,
      address: [data.address, data.municipality, data.department, data.reference]
        .filter(Boolean)
        .join(" · "),
      slot: data.slot,
      payment: data.payment,
      total: quote(selected.cents, data.kilometers).total,
      status: needsPriorReview(data) ? "Valoración médica previa" : "Pendiente de revisión",
    });
    setCreated(id);
  }

  if (created)
    return (
      <section className="form-card success-card">
        <span className="success-icon">
          <Check size={32} />
        </span>
        <p className="eyebrow">SOLICITUD DE EJEMPLO</p>
        <h1>El primer paso está listo.</h1>
        <p>
          Referencia: <strong>{created}</strong>
        </p>
        <p>
          Tu solicitud queda en{" "}
          <strong>
            {needsPriorReview(data) ? "valoración médica previa" : "revisión profesional"}
          </strong>
          . El horario es una preferencia, no una cita confirmada.
        </p>
        <div className="notice">
          No se realizó ningún cobro ni se enviaron notificaciones. Los datos se borran al recargar
          la página.
        </div>
        <div className="button-row">
          <Link className="button primary" href="/mis-citas">
            Ver mi solicitud
          </Link>
          <Link className="button secondary" href="/equipo">
            Explorar revisión del equipo
          </Link>
        </div>
      </section>
    );

  return (
    <div className="intake-layout">
      <aside className="journey">
        <p className="eyebrow">TU SOLICITUD</p>
        <h2>
          Un paso más
          <br />
          hacia tu bienestar.
        </h2>
        <ol>
          {steps.map((title, index) => (
            <li
              key={title}
              className={step === index ? "current" : ""}
              aria-current={step === index ? "step" : undefined}
            >
              <span>{index < step ? <Check size={16} /> : index + 1}</span>
              {title}
            </li>
          ))}
        </ol>
        <div className="journey-note">
          <ShieldCheck size={24} />
          <strong>Primero, una revisión profesional</strong>
          <p>La atención se coordina según tus necesidades y la indicación correspondiente.</p>
        </div>
      </aside>
      <section className="form-card" aria-label={steps[step]}>
        {step === 0 && <ClinicalStep data={data} update={update} />}
        {step === 1 && <LocationStep data={data} update={update} />}
        {step === 2 && <ScheduleStep data={data} update={update} />}
        {step === 3 && (
          <div className="stack">
            <div>
              <p className="eyebrow">TODO EN UN SOLO LUGAR</p>
              <h2>Revisa tu solicitud</h2>
              <p>Confirma los datos antes de crear el ejemplo.</p>
            </div>
            <dl className="summary-list">
              {[
                ["Paciente", data.patient],
                ["Motivo", data.reason],
                ["Receta", data.fileName || "Sin receta"],
                ["Dirección", [data.address, data.municipality, data.department].join(" · ")],
                ["Servicio", selected.name],
                ["Detalle del servicio", selected.description],
                ["Horario de preferencia", data.slot],
                ["Método de preferencia", data.payment],
                ["Total estimado", money(quote(selected.cents, data.kilometers).total)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className={needsPriorReview(data) ? "notice amber" : "notice"}>
              {needsPriorReview(data)
                ? "Requiere valoración médica previa."
                : "La receta y la aplicabilidad serán revisadas por un profesional."}
            </div>
          </div>
        )}
        {alarm && (
          <div role="alert" className="notice red">
            <strong>Busca atención inmediata.</strong>
            <p>
              Acude a un centro asistencial o contacta al servicio local de emergencias. No esperes
              una visita domiciliaria. La solicitud ordinaria se ha detenido.
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          {step > 0 ? (
            <button
              className="button secondary"
              onClick={() => {
                setStep(step - 1);
                setError("");
              }}
            >
              <ArrowLeft size={16} /> Atrás
            </button>
          ) : (
            <Link href="/" className="text-button">
              Volver al inicio
            </Link>
          )}
          <button className="button primary" disabled={alarm} onClick={step === 3 ? submit : next}>
            {step === 3 ? "Crear solicitud de ejemplo" : "Continuar"}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
