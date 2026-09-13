import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount } from "@/modules/auth/server";
import { portals, portalPaths, portalLabels } from "@/modules/auth/access";
import { OnboardingForm } from "@/modules/auth/forms";
import { ProviderDocuments } from "@/modules/auth/provider-documents";
export default async function AccountPage() {
  const account = await getAccount();
  if (!account) redirect("/ingresar");
  const allowed = portals(account.access);
  const additionalKinds = (["patient", "provider"] as const).filter(
    (kind) =>
      !allowed.includes(kind) && (kind !== "provider" || !account.access?.professional_status),
  );
  return (
    <div className="inner-page">
      <h1>Mi cuenta</h1>
      <p>{account.email}</p>
      {account.unavailable ? (
        <p className="notice">
          Tu sesión está iniciada, pero no pudimos consultar los perfiles. La administración debe
          comprobar la conexión y aplicar la actualización de la base de datos.
        </p>
      ) : !account.access ? (
        <OnboardingForm />
      ) : !account.access.active ? (
        <p className="notice">
          Tu cuenta está desactivada. Contacta con la administración de Pulmocare.
        </p>
      ) : (
        <>
          <h2>Hola, {account.access.name}</h2>
          <div className="portal-grid">
            {allowed.map((p) => (
              <Link className="account-card" href={portalPaths[p]} key={p}>
                <h3>{portalLabels[p]}</h3>
                <span className="text-button">Entrar a mi espacio →</span>
              </Link>
            ))}
          </div>
          {account.access.professional_status === "pending" && (
            <p className="notice">
              Tu solicitud para ejercer como terapeuta está pendiente. Un administrador debe
              verificar tu identidad, título y autorización profesional antes de habilitar tu
              perfil. Mientras tanto no tienes acceso al espacio de prestadores ni a pacientes.
            </p>
          )}
          {account.access.professional_status === "suspended" && (
            <p className="notice">
              Tu autorización como terapeuta está suspendida. Contacta con la administración.
            </p>
          )}
          {account.access.professional_status && (
            <ProviderDocuments pending={account.access.professional_status === "pending"} />
          )}
          {!allowed.length && !account.access.professional_status && (
            <p className="notice">
              Tu cuenta no tiene permisos activos. Contacta con la administración.
            </p>
          )}
          {additionalKinds.length > 0 && (
            <OnboardingForm kinds={additionalKinds} name={account.access.name} />
          )}
        </>
      )}
    </div>
  );
}
