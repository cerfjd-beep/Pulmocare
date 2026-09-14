"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { requirePortal } from "@/modules/auth/server";
import type { FormState } from "@/modules/auth/actions";
export async function savePrice(_: FormState, form: FormData): Promise<FormState> {
  const account = await requirePortal("admin");
  if (!account.access?.roles.some((r) => ["operations_admin", "billing_admin"].includes(r)))
    return { error: "No tienes permiso para cambiar precios." };
  const amount = String(form.get("amount") ?? "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(amount) || Number(amount) > 1000000)
    return { error: "Escribe un precio válido en USD, con hasta dos decimales." };
  try {
    const client = await createSupabaseServerClient();
    const result = await client.rpc("publish_service_price", {
      target: String(form.get("id")),
      amount: Math.round(Number(amount) * 100),
      expected: String(form.get("version") ?? "") || undefined,
      price_scope: String(form.get("scope") ?? ""),
    });
    if (result.error)
      return {
        error:
          result.error.code === "40001"
            ? "Otro administrador cambió el precio. Recarga antes de editar."
            : "No se pudo publicar. Revisa el precio y el alcance de la etapa.",
      };
  } catch {
    return { error: "No se pudo conectar con el servicio de precios." };
  }
  revalidatePath("/", "layout");
  return { message: "Precio publicado. Las cotizaciones existentes conservan su importe." };
}
export async function saveDiscount(_: FormState, form: FormData): Promise<FormState> {
  const account = await requirePortal("admin");
  if (!account.access?.roles.some((r) => ["operations_admin", "billing_admin"].includes(r)))
    return { error: "No tienes permiso para cambiar descuentos." };
  const value = String(form.get("discount") ?? "");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value) || Number(value) > 100)
    return { error: "El descuento debe estar entre 0 y 100%, con hasta dos decimales." };
  try {
    const client = await createSupabaseServerClient();
    const { error } = await client.rpc("set_nebulization_discount", {
      discount: Number(value),
      expected: String(form.get("version")),
    });
    if (error)
      return {
        error:
          "No se pudo guardar. Recarga para comprobar si otro administrador modificó el descuento.",
      };
  } catch {
    return { error: "No se pudo conectar con el servicio de precios." };
  }
  revalidatePath("/", "layout");
  return { message: "Descuento publicado." };
}
