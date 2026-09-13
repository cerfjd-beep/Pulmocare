import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { validPhoto } from "@/modules/auth/photo-validation";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  try {
    const client = await createSupabaseServerClient();
    if (!(await client.auth.getUser()).data.user)
      return new Response("Inicia sesión", { status: 401, headers });
    const { id } = await params;
    const path = await client.rpc("get_provider_photo", { target: id });
    if (path.error || !path.data)
      return new Response("Documento no disponible", { status: 404, headers });
    const file = await client.storage.from("credentials").download(path.data);
    if (file.error || !file.data)
      return new Response("Documento no disponible", { status: 404, headers });
    const mime = path.data.endsWith(".png") ? "image/png" : "image/jpeg";
    if (!validPhoto(new Uint8Array(await file.data.arrayBuffer()), mime))
      return new Response("Imagen no válida", { status: 422, headers });
    return new Response(file.data, {
      headers: {
        ...headers,
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="documento.${mime === "image/png" ? "png" : "jpg"}"`,
      },
    });
  } catch {
    return new Response("Documento no disponible", { status: 503, headers });
  }
}
