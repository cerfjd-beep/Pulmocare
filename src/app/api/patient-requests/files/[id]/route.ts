import { createSupabaseServerClient } from "@/integrations/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const client = await createSupabaseServerClient();
    if (!(await client.auth.getUser()).data.user)
      return new Response("Inicia sesión", { status: 401 });
    const { id } = await params;
    const path = await client.rpc("get_submission_file", { target: id });
    if (path.error || !path.data) return new Response("Archivo no disponible", { status: 404 });
    const file = await client.storage.from("prescriptions").download(path.data);
    if (file.error || !file.data) return new Response("Archivo no disponible", { status: 404 });
    return new Response(file.data, {
      headers: {
        "Content-Type": file.data.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="receta.${path.data.split(".").pop()}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Archivo no disponible", { status: 404 });
  }
}
