import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

function navigate(origin: string, path: string) {
  const response = NextResponse.redirect(new URL(path, origin), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  try {
    const client = await createSupabaseServerClient();
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) return navigate(url.origin, "/nueva-clave");
    }
  } catch {
    /* Invalid and expired links share the same public response. */
  }
  return navigate(url.origin, "/recuperar?notice=expired");
}

export async function POST(request: Request) {
  let origin: string;
  try {
    const header = request.headers.get("origin");
    const url = new URL(header ?? "");
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.origin !== header ||
      url.host !== request.headers.get("host")
    )
      throw new Error("Origin mismatch");
    origin = url.origin;
  } catch {
    return new Response("Origen no permitido", { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded"))
    return new Response("Formato no permitido", { status: 415 });
  const raw = await request.text();
  if (raw.length > 8192) return new Response("Formulario demasiado grande", { status: 413 });
  const fields = new URLSearchParams(raw);
  const mode = fields.get("mode");
  try {
    const client = await createSupabaseServerClient();
    if (mode === "request") {
      const email = (fields.get("email") ?? "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
        return navigate(origin, "/recuperar?notice=failed");
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/recovery`,
      });
      return navigate(origin, error ? "/recuperar?notice=failed" : "/recuperar?notice=sent");
    }
    if (mode === "update") {
      const { data, error: sessionError } = await client.auth.getUser();
      if (sessionError || !data.user) return navigate(origin, "/recuperar?notice=expired");
      const password = fields.get("password") ?? "";
      if (password.length < 10 || password.length > 128 || password !== fields.get("confirmation"))
        return navigate(origin, "/nueva-clave?notice=failed");
      const { error } = await client.auth.updateUser({ password });
      if (error) return navigate(origin, "/nueva-clave?notice=failed");
      await client.auth.signOut({ scope: "global" });
      return navigate(origin, "/ingresar?notice=password_updated");
    }
  } catch {
    return navigate(
      origin,
      mode === "update" ? "/nueva-clave?notice=failed" : "/recuperar?notice=failed",
    );
  }
  return new Response("Operación no válida", { status: 400 });
}
