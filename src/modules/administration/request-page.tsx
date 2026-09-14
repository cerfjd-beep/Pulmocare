import Link from "next/link";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { requirePortal } from "@/modules/auth/server";
import type { Portal } from "@/modules/auth/access";
import { PatientSubmission } from "./portal-details";

export async function RequestPage({ id, portal }: { id: string; portal: Portal }) {
  await requirePortal(portal);
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("read_patient_submission", { target: id });
  return (
    <div className="inner-page">
      <Link href={portal === "admin" ? "/admin" : portal === "provider" ? "/equipo" : "/mis-citas"}>
        Volver a mi espacio
      </Link>
      {error || !data ? (
        <p className="notice">
          No se pudo abrir la solicitud o tu cuenta no tiene permiso para consultarla.
        </p>
      ) : (
        <PatientSubmission value={data} />
      )}
    </div>
  );
}
