"use client";

import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { useDemo } from "@/modules/demo/provider";
import { money } from "@/modules/services/catalog";

export function PatientPanel() {
  const { requests, updateRequest } = useDemo();
  return (
    <div className="stack">
      <div className="notice">
        Datos ficticios de esta sesión. Recargar reinicia la demostración y elimina tus cambios.
      </div>
      {requests.map((item) => (
        <article className="form-card" key={item.id}>
          <div className="request-heading">
            <div>
              <p className="eyebrow">{item.id}</p>
              <h2>{item.service}</h2>
              <p>{item.patient}</p>
            </div>
            <span className="state-pill">{item.status}</span>
          </div>
          <div className="appointment-info">
            <CalendarDays size={22} />
            <div>
              <strong>{item.slot}</strong>
              <p>Preferencia de horario · Profesional por asignar</p>
            </div>
            <strong>
              {money(item.total)} <small>estimados</small>
            </strong>
          </div>
          <p>{item.address}</p>
          {item.status !== "Visita completada" && (
            <p className="fine-print">
              La solicitud no representa una cita confirmada. El equipo debe revisar y coordinar la
              atención.
            </p>
          )}
          {item.status === "Visita completada" && (
            <div className="follow-up">
              <h3>¿Cómo te sientes después de la atención?</h3>
              <p>Simulación del seguimiento a las 24 horas.</p>
              <div className="button-row">
                {["Mejoré", "Persisten los síntomas", "Deseo nueva cita"].map((answer) => (
                  <button
                    key={answer}
                    className={item.followUp === answer ? "button primary" : "button secondary"}
                    aria-pressed={item.followUp === answer}
                    onClick={() => updateRequest(item.id, { followUp: answer })}
                  >
                    {answer}
                  </button>
                ))}
              </div>
              {item.followUp && (
                <p role="status">
                  Respuesta registrada en la demostración.
                  {item.followUp !== "Mejoré" && " Queda pendiente de revisión del equipo."}
                </p>
              )}
              {item.followUp === "Deseo nueva cita" && (
                <Link className="text-button" href="/solicitar">
                  Iniciar una nueva solicitud →
                </Link>
              )}
              <p className="fine-print">
                Si tienes dificultad respiratoria intensa o dolor en el pecho, busca atención
                inmediata; no esperes este seguimiento.
              </p>
            </div>
          )}
        </article>
      ))}
      <Link className="button primary fit-content" href="/solicitar">
        <Plus size={18} />
        Nueva solicitud
      </Link>
    </div>
  );
}
