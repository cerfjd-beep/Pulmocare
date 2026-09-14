import { AuthForm } from "@/modules/auth/forms";
import { authNotices } from "@/modules/auth/notices";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const state =
    params.notice === "password_updated"
      ? { message: "Contraseña actualizada. Inicia sesión con tu contraseña nueva." }
      : params.notice === "check_email"
        ? {
            message:
              "Revisa tu correo para confirmar la cuenta. Después vuelve e inicia sesión. Si ya tienes cuenta, inicia sesión directamente.",
          }
        : {
            error:
              params.notice && Object.hasOwn(authNotices, params.notice)
                ? authNotices[params.notice]
                : undefined,
          };
  return (
    <div className="inner-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BIENVENIDO A PULMOCARE</p>
          <h1>Un acceso para cada persona.</h1>
          <p>
            Ingresa con tu correo y contraseña. Te mostraremos los espacios autorizados para tu
            cuenta.
          </p>
        </div>
      </div>
      <div className="auth-grid">
        <AuthForm
          key={`${params.mode}-${params.notice}`}
          signup={params.mode === "signup"}
          state={state}
        />
        <section className="account-card">
          <h2>Tu espacio en Pulmocare</h2>
          <h3>Pacientes</h3>
          <p>Consulta tus solicitudes y citas.</p>
          <h3>Prestadores del servicio</h3>
          <p>Revisa tus asignaciones y el estado de tu acreditación.</p>
          <h3>Administradores</h3>
          <p>Consulta la operación y gestiona los accesos según tus permisos.</p>
        </section>
      </div>
    </div>
  );
}
