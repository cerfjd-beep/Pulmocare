import type { IntakeData } from "./model";
import type { UpdateIntake } from "./clinical-step";

export function LocationStep({ data, update }: { data: IntakeData; update: UpdateIntake }) {
  return (
    <div className="stack">
      <div>
        <p className="eyebrow">CUIDADO CERCA DE TI</p>
        <h2>¿Dónde necesitas la atención?</h2>
        <p>Usa datos ficticios para explorar el recorrido.</p>
      </div>
      <label>
        Nombre del paciente de ejemplo
        <input
          value={data.patient}
          maxLength={100}
          placeholder="Ej. Paciente de prueba"
          onChange={(e) => update("patient", e.target.value)}
        />
      </label>
      <div className="two-fields">
        <label>
          Departamento
          <select value={data.department} onChange={(e) => update("department", e.target.value)}>
            {["San Salvador", "La Libertad", "Santa Ana", "San Miguel", "Otro"].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Municipio
          <input
            value={data.municipality}
            maxLength={100}
            placeholder="Municipio de ejemplo"
            onChange={(e) => update("municipality", e.target.value)}
          />
        </label>
      </div>
      <label>
        Dirección de ejemplo
        <input
          value={data.address}
          maxLength={200}
          placeholder="Colonia, calle y número de casa"
          onChange={(e) => update("address", e.target.value)}
        />
      </label>
      <label>
        Referencias (opcional)
        <input
          value={data.reference}
          maxLength={200}
          placeholder="Una referencia para llegar"
          onChange={(e) => update("reference", e.target.value)}
        />
      </label>
      <div className="zone-preview">
        <span className="map-marker">P</span>
        <strong>Cobertura de demostración</strong>
        <span>Hasta 25 km desde una base de ejemplo</span>
        <small>El mapa y el cálculo por GPS se conectarán en la etapa de integraciones.</small>
      </div>
      <label>
        Distancia simulada: {Number.isFinite(data.kilometers) ? data.kilometers : "—"} km
        <input
          type="number"
          min="0"
          max="25"
          step="0.1"
          value={Number.isNaN(data.kilometers) ? "" : data.kilometers}
          onChange={(e) => update("kilometers", e.target.valueAsNumber)}
        />
      </label>
      <label className="check-card">
        <input
          type="checkbox"
          checked={data.consent}
          onChange={(e) => update("consent", e.target.checked)}
        />
        Entiendo que es una demostración y estoy usando datos ficticios.
      </label>
    </div>
  );
}
