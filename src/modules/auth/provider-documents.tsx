import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { ProviderPhotoForm } from "./provider-photo-form";
export async function ProviderDocuments({
  target,
  pending = false,
}: {
  target?: string;
  pending?: boolean;
}) {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("list_provider_photos", target ? { target } : {});
  return (
    <section className="account-card">
      <h3>Título y carnet profesional</h3>
      {error ? (
        <p role="alert">
          No pudimos consultar los documentos. Comprueba que se aplicó la actualización de
          documentos en Supabase.
        </p>
      ) : (
        <>
          {(["degree", "license"] as const).map((kind) => {
            const photo = data?.find((d) => d.credential_kind === kind);
            const label = kind === "degree" ? "Título" : "Carnet profesional";
            return (
              <p key={kind}>
                {label}:{" "}
                {photo ? (
                  <a href={`/api/provider-documents/${photo.id}`}>Abrir foto guardada</a>
                ) : (
                  "Pendiente de cargar"
                )}
              </p>
            );
          })}
          {pending && <ProviderPhotoForm />}
          {target && (
            <p>
              Revisa ambas fotos y comprueba la autorización vigente con la entidad emisora antes de
              aprobar.
            </p>
          )}
        </>
      )}
    </section>
  );
}
