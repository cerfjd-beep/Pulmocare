"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PHOTO_LIMIT } from "./photo-validation";
export function ProviderPhotoForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="account-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const photos = (["degree", "license"] as const)
          .map((kind) => ({ kind, file: data.get(kind) }))
          .filter(
            (p): p is { kind: "degree" | "license"; file: File } =>
              p.file instanceof File && p.file.size > 0,
          );
        if (!photos.length) {
          setMessage("Selecciona una foto del título o del carnet.");
          return;
        }
        if (
          photos.some(
            (p) => p.file.size > PHOTO_LIMIT || !["image/jpeg", "image/png"].includes(p.file.type),
          )
        ) {
          setMessage("Cada foto debe ser JPG o PNG y pesar como máximo 3 MB.");
          return;
        }
        setPending(true);
        setMessage("");
        let completed = 0;
        try {
          for (const { kind, file } of photos) {
            const body = new FormData();
            body.set("kind", kind);
            body.set("photo", file);
            const result = await fetch("/api/provider-documents", { method: "POST", body });
            const payload = await result.json();
            if (!result.ok) throw new Error(payload.error ?? "No se pudo cargar la foto.");
            completed++;
          }
          form.reset();
          setMessage("Fotos guardadas. Tu solicitud sigue pendiente de revisión administrativa.");
        } catch (error) {
          setMessage(
            `${completed ? "La primera foto se guardó. " : ""}${error instanceof Error ? error.message : "Error de conexión. Intenta nuevamente."}`,
          );
        } finally {
          setPending(false);
          router.refresh();
        }
      }}
    >
      <p>
        Carga fotos legibles del documento completo. JPG o PNG, hasta 3 MB por foto. Puedes cargar
        una a la vez o reemplazar una foto mientras tu solicitud esté pendiente.
      </p>
      <label>
        Foto del título
        <input type="file" name="degree" accept="image/jpeg,image/png" disabled={pending} />
      </label>
      <label>
        Foto del carnet que te habilita como profesional
        <input type="file" name="license" accept="image/jpeg,image/png" disabled={pending} />
      </label>
      <p>Solo tú y la administración de accesos pueden consultar estas fotos.</p>
      <p role="status" aria-live="polite">
        {pending ? "Cargando fotos…" : message}
      </p>
      <button className="button primary" disabled={pending}>
        {pending ? "Cargando…" : "Guardar documentos"}
      </button>
    </form>
  );
}
