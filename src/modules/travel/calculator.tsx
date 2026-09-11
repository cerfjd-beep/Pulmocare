"use client";

import { useRef, useState } from "react";
import { services, money } from "@/modules/services/catalog";
import { estimateTravel } from "./estimate";
import { simulatedRoute } from "./simulation";
import { localAppointmentToIso } from "./validation";
import { PointFields, type PointFieldsValue } from "./point-fields";
import { QuoteResult } from "./quote-result";
import type { TravelEstimate, GeoPoint } from "./types";

const emptyPoint = { latitude: "", longitude: "" };
function asPoint(value: PointFieldsValue): GeoPoint {
  if (!value.latitude.trim() || !value.longitude.trim())
    throw new Error("Completa ambas ubicaciones.");
  return { latitude: Number(value.latitude), longitude: Number(value.longitude) };
}

export function TravelCalculator({ liveEnabled }: { liveEnabled: boolean }) {
  const [origin, setOrigin] = useState(emptyPoint);
  const [destination, setDestination] = useState(emptyPoint);
  const [appointment, setAppointment] = useState("");
  const [serviceId, setServiceId] = useState<string>("evaluation");
  const [mode, setMode] = useState("simulation");
  const [accessToken, setAccessToken] = useState("");
  const [result, setResult] = useState<TravelEstimate | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const service = services.find((item) => item.id === serviceId)!;

  function invalidate() {
    revision.current++;
    activeRequest.current?.abort();
    setResult(null);
    setError("");
    setBusy(false);
  }
  function example() {
    invalidate();
    setOrigin({ latitude: "13.6929", longitude: "-89.2182" });
    setDestination({ latitude: "13.7000", longitude: "-89.1600" });
    const tomorrow = new Date(Date.now() + 86400000 - 6 * 3600000);
    setAppointment(tomorrow.toISOString().slice(0, 10) + "T10:00");
    setMode("simulation");
  }
  async function calculate() {
    invalidate();
    const current = revision.current;
    setBusy(true);
    try {
      const input = {
        origin: asPoint(origin),
        destination: asPoint(destination),
        appointmentAt: localAppointmentToIso(appointment),
      };
      let estimate: TravelEstimate;
      if (mode === "simulation") {
        estimate = await estimateTravel(input, simulatedRoute);
      } else {
        const controller = new AbortController();
        activeRequest.current = controller;
        const response = await fetch("/api/travel-quote", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
          body: JSON.stringify(input),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "No se pudo cotizar la ruta.");
        estimate = payload;
      }
      if (current === revision.current) setResult(estimate);
    } catch (failure) {
      if (current === revision.current) {
        setError(failure instanceof Error ? failure.message : "No se pudo calcular el traslado.");
      }
    } finally {
      if (current === revision.current) setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="notice">
        {mode === "simulation"
          ? "Modo de prueba: distancia y tráfico sintéticos. No consulta carreteras ni congestión real."
          : "Consulta de rutas: al calcular se enviarán ambas coordenadas y la hora de salida a Google Maps."}
      </div>
      <form
        className="form-card stack"
        onSubmit={(event) => {
          event.preventDefault();
          void calculate();
        }}
      >
        <div className="two-fields">
          <label>
            Origen de los datos
            <select
              value={mode}
              onChange={(event) => {
                invalidate();
                setMode(event.target.value);
              }}
            >
              <option value="simulation">Simulación sin conexión</option>
              <option value="google" disabled={!liveEnabled}>
                Google Maps · Ruta con tráfico
              </option>
            </select>
          </label>
          <label>
            Servicio
            <select
              value={serviceId}
              onChange={(event) => {
                invalidate();
                setServiceId(event.target.value);
              }}
            >
              {services.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {money(item.cents)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!liveEnabled && (
          <p className="fine-print">
            La consulta real está pendiente de configurar el acceso del equipo y el proveedor de
            mapas.
          </p>
        )}
        {mode === "google" && (
          <label>
            Código de acceso del equipo
            <input
              type="password"
              required
              autoComplete="off"
              value={accessToken}
              onChange={(event) => {
                invalidate();
                setAccessToken(event.target.value);
              }}
            />
          </label>
        )}
        <button type="button" className="text-button fit-content" onClick={example}>
          Cargar un ejemplo ficticio
        </button>
        <PointFields
          label="1. Ubicación del paciente · Destino"
          value={destination}
          onChange={(point) => {
            invalidate();
            setDestination(point);
          }}
        />
        <PointFields
          label="2. Ubicación de salida del prestador · Origen"
          value={origin}
          onChange={(point) => {
            invalidate();
            setOrigin(point);
          }}
        />
        <label>
          3. Fecha y hora de atención · El Salvador
          <input
            type="datetime-local"
            required
            value={appointment}
            onChange={(event) => {
              invalidate();
              setAppointment(event.target.value);
            }}
          />
        </label>
        <p className="fine-print">
          Para una visita futura, indica el lugar desde el que saldrá el prestador, que puede ser
          distinto de su ubicación actual.
        </p>
        <div className="notice">
          4. Tráfico: el cálculo usa el tiempo previsto de viaje respecto al tiempo de referencia.
          Tarifas de ejemplo: hasta 5 km $0; hasta 10 km $3; hasta 25 km $5. Tráfico: $0.10/min
          adicional, máximo $5.
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button primary fit-content" disabled={busy}>
          {busy ? "Calculando ruta y salida…" : "Calcular recargo de traslado"}
        </button>
      </form>
      {result && <QuoteResult estimate={result} serviceCents={service.cents} />}
    </div>
  );
}
