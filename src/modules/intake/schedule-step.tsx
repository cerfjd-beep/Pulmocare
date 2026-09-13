import { services, money, quote, paymentMethods } from "@/modules/services/catalog";
import type { IntakeData } from "./model";
import type { UpdateIntake } from "./clinical-step";

export function ScheduleStep({ data, update }: { data: IntakeData; update: UpdateIntake }) {
  const selected = services.find((item) => item.id === data.serviceId) ?? services[0];
  const total = quote(selected.cents, data.kilometers);
  return (
    <div className="stack">
      <div>
        <p className="eyebrow">PLANIFICA TU CUIDADO</p>
        <h2>Servicio y horario de preferencia</h2>
        <p>Disponibilidad de ejemplo. El equipo coordinará la visita después de revisar tu caso.</p>
      </div>
      <label>
        Servicio de interés
        <select value={data.serviceId} onChange={(e) => update("serviceId", e.target.value)}>
          {services.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {money(item.cents)}
            </option>
          ))}
        </select>
      </label>
      <p>{selected.description}</p>
      {selected.cents === null && (
        <p className="notice">
          El horario seleccionado es una preferencia para iniciar el programa. Las visitas se
          coordinarán después de la revisión; el total y los traslados del paquete se confirmarán
          antes de contratarlo.
        </p>
      )}
      <fieldset>
        <legend>Horarios de ejemplo · Profesional por asignar</legend>
        <div className="slot-grid">
          {[
            "Próximo día · 8:00 am",
            "Próximo día · 2:00 pm",
            "Próximo día · 4:00 pm",
            "En dos días · 9:00 am",
          ].map((slot) => (
            <label key={slot} className="check-card">
              <input
                name="slot"
                type="radio"
                checked={data.slot === slot}
                onChange={() => update("slot", slot)}
              />
              {slot}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Método de pago de preferencia
        <select value={data.payment} onChange={(e) => update("payment", e.target.value)}>
          {paymentMethods.map((method) => (
            <option key={method}>{method}</option>
          ))}
        </select>
      </label>
      {data.payment === "Efectivo" && (
        <p>Pago en efectivo al recibir la atención, conforme al importe previamente confirmado.</p>
      )}
      <div className="notice">
        No se solicitan datos bancarios ni se realizan cobros en esta demostración.
      </div>
      <div className="price-breakdown">
        <div>
          <span>
            {selected.minutes === null ? "Paquete completo" : `Servicio · ${selected.minutes} min`}
          </span>
          <strong>{money(total.service)}</strong>
        </div>
        <div>
          <span>
            {selected.cents === null ? "Traslados del paquete" : `Traslado · ${data.kilometers} km`}
          </span>
          <strong>{money(total.travel)}</strong>
        </div>
        <div className="price-total">
          <span>Total estimado</span>
          <strong>{money(total.total)}</strong>
        </div>
      </div>
    </div>
  );
}
