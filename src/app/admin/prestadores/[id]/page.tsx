import Link from "next/link";
import { requirePortal } from "@/modules/auth/server";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { TherapistProfile, type ProviderProfile } from "@/modules/administration/portal-details";
import { ProviderDocuments } from "@/modules/auth/provider-documents";
import { ProviderReview } from "@/modules/auth/forms";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requirePortal("admin");
  const { id } = await params;
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("read_provider_profile", { target: id });
  const profile = data as unknown as ProviderProfile;
  return (
    <div className="inner-page">
      <Link href="/admin">Volver a Administración</Link>
      {error || !data ? (
        <p className="notice">No se pudo consultar el perfil del prestador.</p>
      ) : (
        <>
          <TherapistProfile profile={profile} admin />
          <ProviderDocuments target={id} />
          <ProviderReview id={id} status={profile.status} />
        </>
      )}
    </div>
  );
}
