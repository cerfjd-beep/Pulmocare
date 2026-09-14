import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

export default async function NewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/recuperar?notice=expired");
  const { notice } = await searchParams;
  return (
    <div className="inner-page">
      <section className="account-card">
        <h1>Elige una contraseña nueva</h1>
        <p>Cuenta: {data.user.email}</p>
        {notice && (
          <p role="alert" className="notice">
            No se pudo actualizar. Usa una contraseña nueva de al menos 10 caracteres y repítela
            igual.
          </p>
        )}
        <form action="/auth/recovery" method="post" className="account-form">
          <input type="hidden" name="mode" value="update" />
          <label>
            Nueva contraseña
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
            />
          </label>
          <label>
            Repite la contraseña
            <input
              type="password"
              name="confirmation"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
            />
          </label>
          <button className="button primary">Guardar contraseña</button>
        </form>
        <Link href="/ingresar">Volver a iniciar sesión</Link>
      </section>
    </div>
  );
}
