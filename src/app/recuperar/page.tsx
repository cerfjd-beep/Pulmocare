import Link from "next/link";

export default async function RecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  return (
    <div className="inner-page">
      <section className="account-card">
        <h1>Recuperar tu acceso</h1>
        <p>
          Escribe el correo de tu cuenta de Pulmocare. Recibirás un enlace para elegir una
          contraseña nueva.
        </p>
        {notice && (
          <p role="status" className="notice">
            {notice === "sent"
              ? "Si el correo corresponde a una cuenta, recibirás un enlace. Revisa también el correo no deseado y ábrelo en este mismo navegador."
              : notice === "expired"
                ? "El enlace venció o no se pudo validar. Solicita uno nuevo y ábrelo en este mismo navegador."
                : "No se pudo solicitar el enlace. Revisa el correo e intenta nuevamente en unos minutos."}
          </p>
        )}
        <form action="/auth/recovery" method="post" className="account-form">
          <input type="hidden" name="mode" value="request" />
          <label>
            Correo electrónico
            <input type="email" name="email" autoComplete="email" maxLength={254} required />
          </label>
          <button className="button primary">Enviar enlace de recuperación</button>
        </form>
        <Link href="/ingresar">Volver a iniciar sesión</Link>
      </section>
    </div>
  );
}
