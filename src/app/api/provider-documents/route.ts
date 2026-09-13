import { createHash } from "node:crypto";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { PHOTO_LIMIT, validPhoto } from "@/modules/auth/photo-validation";

export async function POST(request: Request) {
  const fail = (error: string, status: number) => Response.json({ error }, { status });
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    if (
      origin.host !== request.headers.get("host") ||
      !["http:", "https:"].includes(origin.protocol)
    )
      return fail("Origen no permitido.", 403);
    const client = await createSupabaseServerClient();
    if (!(await client.auth.getUser()).data.user) return fail("Inicia sesión nuevamente.", 401);
    // Bound the body before multipart parsing, including when Content-Length is absent.
    const reader = request.body?.getReader();
    if (!reader) return fail("Selecciona una foto.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > PHOTO_LIMIT + 65536) {
        await reader.cancel();
        return fail("La foto debe pesar como máximo 3 MB.", 413);
      }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("photo");
    const kind = String(form.get("kind"));
    if (!(file instanceof File) || !["degree", "license"].includes(kind))
      return fail("Selecciona el documento y su foto.", 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validPhoto(bytes, file.type)) return fail("Usa una foto JPG o PNG de hasta 3 MB.", 400);
    const reservation = await client.rpc("reserve_provider_photo", {
      photo_kind: kind,
      photo_mime: file.type,
      photo_size: bytes.length,
      photo_hash: createHash("sha256").update(bytes).digest("hex"),
    });
    if (reservation.error || !reservation.data)
      return fail(
        "No se pudo preparar la carga. Tu solicitud debe estar pendiente y la base de datos actualizada.",
        409,
      );
    const upload = await client.storage
      .from("credentials")
      .upload(reservation.data, bytes, { contentType: file.type, upsert: false });
    if (upload.error) return fail("No se pudo guardar la foto. Intenta nuevamente.", 502);
    return Response.json(
      { message: "Foto guardada." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return fail("No se pudo cargar la foto. Intenta nuevamente.", 400);
  }
}
