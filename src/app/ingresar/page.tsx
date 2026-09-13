import { AuthForm } from "@/modules/auth/forms";
export default function LoginPage() {
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
        <AuthForm />
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
