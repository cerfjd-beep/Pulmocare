"use client";

import { useRef, useState } from "react";
import { LocateFixed } from "lucide-react";

export interface PointFieldsValue {
  latitude: string;
  longitude: string;
}

export function PointFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PointFieldsValue;
  onChange: (value: PointFieldsValue) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");
  const revision = useRef(0);
  function locate() {
    if (!navigator.geolocation) {
      setMessage("Este navegador no ofrece geolocalización.");
      return;
    }
    const current = ++revision.current;
    setLocating(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (current !== revision.current) return;
        setLocating(false);
        onChange({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setMessage(
          "Precisión aproximada: " +
            Math.round(position.coords.accuracy) +
            " m. Confirma que el punto corresponde al lugar del servicio o de salida.",
        );
      },
      () => {
        if (current !== revision.current) return;
        setLocating(false);
        setMessage("No pudimos obtener la ubicación. Puedes escribir las coordenadas manualmente.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }
  return (
    <fieldset className="stack">
      <legend>{label}</legend>
      <div className="two-fields">
        {(["latitude", "longitude"] as const).map((axis) => (
          <label key={axis}>
            {axis === "latitude" ? "Latitud" : "Longitud"}
            <input
              type="number"
              step="any"
              required
              value={value[axis]}
              min={axis === "latitude" ? -90 : -180}
              max={axis === "latitude" ? 90 : 180}
              onChange={(event) => {
                revision.current++;
                setLocating(false);
                setMessage("");
                onChange({ ...value, [axis]: event.target.value });
              }}
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        className="button secondary fit-content"
        disabled={locating}
        onClick={locate}
      >
        <LocateFixed size={16} />
        {locating ? "Obteniendo ubicación…" : "Usar ubicación de este dispositivo"}
      </button>
      <small>
        Solo captura la ubicación del dispositivo actual; no localiza a otra persona a distancia.
      </small>
      {message && (
        <p role="status" className="fine-print">
          {message}
        </p>
      )}
    </fieldset>
  );
}
