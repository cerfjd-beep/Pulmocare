"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { requirePortal } from "./server";

export type FormState = { error?: string; message?: string; authenticated?: boolean };
const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
export async function authenticate(_: FormState, data: FormData): Promise<FormState> {
  const email = field(data, "email");
  const password = String(data.get("password") ?? "");
  const signup = data.get("mode") === "signup";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !password ||
    password.length > 128
  )
    return { error: "Escribe un correo y una contraseña válidos." };
  if (signup && (password.length < 10 || password !== data.get("confirmation")))
    return { error: "Usa al menos 10 caracteres y repite la misma contraseña." };
  try {
    const client = await createSupabaseServerClient();
    if (signup) {
      const { data: result, error } = await client.auth.signUp({ email, password });
      if (error)
        return { error: "No pudimos crear la cuenta. Revisa los datos o intenta más tarde." };
      if (!result.session)
        return {
          message:
            "Revisa tu correo para confirmar la cuenta. Después vuelve aquí e inicia sesión. Si ya tienes cuenta, inicia sesión directamente.",
        };
    } else {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error)
        return {
          error:
            "No pudimos iniciar sesión. Revisa el correo, la contraseña y la confirmación de tu correo.",
        };
    }
  } catch {
    return { error: "El servicio de acceso no está disponible. Intenta nuevamente más tarde." };
  }
  revalidatePath("/", "layout");
  return { authenticated: true };
}
export async function signOut() {
  const client = await createSupabaseServerClient();
  await client.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/ingresar");
}
export async function onboard(_: FormState, data: FormData): Promise<FormState> {
  const name = field(data, "name");
  const kind = field(data, "kind");
  if (!name || name.length > 200 || !["patient", "provider"].includes(kind))
    return { error: "Revisa el nombre y el tipo de perfil." };
  try {
    const client = await createSupabaseServerClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return { error: "Inicia sesión para completar tu perfil." };
    const result =
      kind === "patient"
        ? await client.rpc("register_patient", { display_name: name })
        : await client.rpc("register_provider", {
            full_name: name,
            specialty: field(data, "specialty"),
            registration_ref: field(data, "registration"),
          });
    if (result.error)
      return {
        error:
          "No se pudo guardar el perfil. Verifica los campos y que la base de datos esté actualizada.",
      };
  } catch {
    return { error: "No fue posible conectar. Intenta nuevamente." };
  }
  revalidatePath("/", "layout");
  redirect(kind === "patient" ? "/mis-citas" : "/cuenta");
}
export async function reviewProvider(_: FormState, data: FormData): Promise<FormState> {
  const account = await requirePortal("admin");
  if (!account.access?.roles.includes("access_admin"))
    return { error: "No tienes permiso para administrar accesos." };
  const decision = field(data, "decision");
  if (!["approve", "suspend"].includes(decision))
    return { error: "Selecciona una decisión válida." };
  if (decision === "approve" && data.get("credentials_checked") !== "on")
    return {
      error:
        "Debes verificar la identidad, el título y la autorización profesional vigente antes de aprobar.",
    };
  try {
    const client = await createSupabaseServerClient();
    const { error } = await client.rpc("review_provider", {
      target: field(data, "id"),
      approve: decision === "approve",
    });
    if (error)
      return {
        error:
          "No se pudo actualizar este prestador. Para aprobarlo deben estar cargadas las fotos del título y del carnet. No puedes aprobar tu propio perfil.",
      };
  } catch {
    return { error: "No fue posible conectar." };
  }
  revalidatePath("/admin");
  return { message: "Estado del prestador actualizado." };
}
