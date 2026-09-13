import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount } from "@/modules/auth/server";
import { portals, portalPaths, portalLabels } from "@/modules/auth/access";
import { OnboardingForm } from "@/modules/auth/forms";
export default async function AccountPage() {
  const account = await getAccount();
  if (!account) redirect("/ingresar");
  const allowed = portals(account.access);
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
          {!allowed.length && (
            <p className="notice">
              Tu cuenta no tiene permisos activos. Contacta con la administración.
            </p>
          )}
        </>
      )}
    </div>
  );
}
