import { timingSafeEqual } from "node:crypto";
import { getAccount } from "@/modules/auth/server";
import { googleRoutes } from "@/integrations/maps/google-routes";
import { estimateTravel } from "@/modules/travel/estimate";
import { TravelError, type TravelInput } from "@/modules/travel/types";

export const runtime = "nodejs";
export const maxDuration = 40;

// Local/pilot protection; replace with authenticated professional roles before public deployment.
const budget = { windowStart: 0, count: 0, lastRequest: 0 };
function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const account = await getAccount();
  if (!account) return reply({ error: "Inicia sesión para consultar rutas." }, 401);
  const access = account.access;
  if (
    !access?.active ||
    !(
      access.roles.includes("operations_admin") ||
      (access.professional_status === "verified" &&
        access.roles.some((r) => ["therapist", "clinical_reviewer"].includes(r)))
    )
  ) {
    return reply({ error: "No tienes permiso para consultar rutas." }, 403);
  }
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const secret = process.env.TRAVEL_QUOTE_ACCESS_TOKEN;
  if (!key || !secret || secret.length < 32) {
    return reply({ error: "La consulta real de rutas todavía no está configurada." }, 503);
  }
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(secret);
  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    return reply({ error: "El código de acceso del equipo no es válido." }, 401);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return reply({ error: "Se requiere una solicitud JSON." }, 415);
  }
  const now = Date.now();
  if (now - budget.windowStart >= 3600000) {
    budget.windowStart = now;
    budget.count = 0;
  }
  if (now - budget.lastRequest < 10000 || budget.count >= 30) {
    return reply({ error: "Se alcanzó el límite de consultas. Espera antes de recalcular." }, 429);
  }
  try {
    const body = await request.text();
    if (body.length > 2048) return reply({ error: "La solicitud es demasiado grande." }, 413);
    let input: TravelInput;
    try {
      input = JSON.parse(body);
    } catch {
      return reply({ error: "La solicitud JSON no es válida." }, 400);
    }
    if (!input || typeof input !== "object") {
      return reply({ error: "Faltan los datos del traslado." }, 400);
    }
    budget.lastRequest = now;
    budget.count++;
    const estimate = await estimateTravel(input, googleRoutes(key), new Date(now));
    return reply(estimate);
  } catch (error) {
    if (error instanceof TravelError) {
      const unavailable = ["ROUTE_UNAVAILABLE", "TRAFFIC_UNAVAILABLE", "INVALID_ROUTE"];
      return reply(
        { error: error.message, code: error.code },
        unavailable.includes(error.code) ? 502 : 422,
      );
    }
    return reply({ error: "No se pudo calcular el traslado. Intenta nuevamente." }, 500);
  }
}
