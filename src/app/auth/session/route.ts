import { NextResponse } from "next/server";
import { authenticate } from "@/modules/auth/actions";

export async function POST(request: Request) {
  // Next's internal request URL can use a different hostname behind a proxy.
  // Compare the browser origin with the original Host header, not that internal URL.
  const originHeader = request.headers.get("origin");
  let origin: string;
  try {
    const parsed = new URL(originHeader ?? "");
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== originHeader ||
      parsed.host !== request.headers.get("host")
    )
      throw new Error("Origin mismatch");
    origin = parsed.origin;
  } catch {
    return new Response("Solicitud de otro origen rechazada", { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded"))
    return new Response("Formato no permitido", { status: 415 });
  const body = await request.text();
  if (body.length > 8192) return new Response("Formulario demasiado grande", { status: 413 });
  const params = new URLSearchParams(body);
  const fields = new FormData();
  for (const name of ["mode", "email", "password", "confirmation"])
    fields.set(name, params.get(name) ?? "");
  const state = await authenticate({}, fields);
  const target = new URL(state.authenticated ? "/cuenta" : "/ingresar", origin);
  if (!state.authenticated) {
    const signup = fields.get("mode") === "signup";
    if (signup) target.searchParams.set("mode", "signup");
    const notice = state.message
      ? "check_email"
      : state.error?.startsWith("Escribe") || state.error?.startsWith("Usa al menos")
        ? "invalid"
        : state.error?.startsWith("El servicio")
          ? "unavailable"
          : signup
            ? "signup_failed"
            : "failed";
    target.searchParams.set("notice", notice);
  }
  // Never redirect the credential POST with 307/308: the next request must be GET.
  const response = NextResponse.redirect(target, 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
