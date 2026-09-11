"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

export function BusinessForm() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  if (sent) return <p role="status">Solicitud de ejemplo preparada. No se envió ningún mensaje.</p>;
  return (
    <>
      <button className="text-button" onClick={() => setOpen(!open)} aria-expanded={open}>
        Solicitar cotización empresarial <ArrowUpRight size={16} />
      </button>
      {open && (
        <form
          className="stack compact-form"
          onSubmit={(event) => {
            event.preventDefault();
            setSent(true);
          }}
        >
          <label>
            Empresa ficticia
            <input required maxLength={100} placeholder="Nombre de la empresa" />
          </label>
          <label>
            Correo de ejemplo
            <input required type="email" placeholder="equipo@example.com" />
          </label>
          <label>
            Servicio
            <select>
              <option>Capacitación de RCP</option>
              <option>Primeros auxilios</option>
              <option>Salud ocupacional</option>
              <option>Evaluación respiratoria</option>
              <option>Espirometrías</option>
              <option>Charlas de prevención</option>
            </select>
          </label>
          <button className="button primary" type="submit">
            Simular solicitud
          </button>
        </form>
      )}
    </>
  );
}
