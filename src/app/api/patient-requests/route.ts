import { createHash } from "node:crypto";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import {
  validatePatientStep,
  validPrescription,
  type PatientIntake,
} from "@/modules/intake/live-model";

export async function POST(request: Request) {
  const fail = (error: string, status = 400) => Response.json({ error }, { status });
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.host !== request.headers.get("host")
    )
      return fail("Origen no permitido.", 403);
    const client = await createSupabaseServerClient();
    if (!(await client.auth.getUser()).data.user)
      return fail("Inicia sesión para enviar tu solicitud.", 401);
    const reader = request.body?.getReader();
    if (!reader) return fail("Completa el formulario.");
    let size = 0;
    const parts: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 5 * 1024 * 1024 + 65536) {
        await reader.cancel();
        return fail("La receta debe pesar como máximo 5 MB.", 413);
      }
      parts.push(value);
    }
    const form = await new Response(Buffer.concat(parts), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const data = JSON.parse(String(form.get("data") ?? "")) as PatientIntake;
    if (
      !data ||
      typeof data !== "object" ||
      !Array.isArray(data.symptoms) ||
      !Array.isArray(data.history)
    )
      return fail("Formulario inválido.");
    for (let step = 0; step < 3; step++) {
      const error = validatePatientStep(step, data);
      if (error) return fail(error);
    }
    const retryKey = String(form.get("key") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(retryKey))
      return fail("Recarga el formulario e intenta nuevamente.");
    let bytes: Uint8Array | null = null;
    let fileInfo: { mime: string; size: number; hash: string } | null = null;
    if (data.prescription === "Sí") {
      const file = form.get("prescription");
      if (!(file instanceof File)) return fail("Adjunta la receta.");
      bytes = new Uint8Array(await file.arrayBuffer());
      if (!validPrescription(bytes, file.type))
        return fail("La receta debe ser JPG, PNG o PDF, de hasta 5 MB.");
      fileInfo = {
        mime: file.type,
        size: bytes.length,
        hash: createHash("sha256").update(bytes).digest("hex"),
      };
    }
    const payload = {
      patient: data.patient.trim(),
      phone: data.phone,
      birthDate: data.birthDate,
      reason: data.reason,
      alarm: data.alarm,
      prescription: data.prescription,
      symptoms: data.symptoms,
      history: data.history,
      noSymptoms: data.noSymptoms,
      noHistory: data.noHistory,
      consent: data.consent,
      department: data.department,
      municipality: data.municipality.trim(),
      address: data.address.trim(),
      reference: data.reference,
      serviceId: data.serviceId,
      slot: data.slot + "-06:00",
      payment: data.payment,
      file: fileInfo,
    };
    const prepared = await client.rpc("prepare_patient_request", { payload, retry_key: retryKey });
    if (prepared.error)
      return fail(
        prepared.error.code === "PGRST202"
          ? "Estamos activando las solicitudes. Intenta nuevamente en unos minutos."
          : "No se pudo guardar. Revisa tus datos y que tu perfil de paciente esté activo.",
        409,
      );
    const result = prepared.data as { id: string; path: string | null; submitted: boolean };
    if (!result.submitted && result.path && bytes && fileInfo) {
      const uploaded = await client.storage
        .from("prescriptions")
        .upload(result.path, bytes, { contentType: fileInfo.mime, upsert: false });
      // A retry may find the immutable, already-uploaded object from the same submission.
      if (
        uploaded.error &&
        uploaded.error.statusCode !== "409" &&
        uploaded.error.statusCode !== "400"
      )
        return fail("No se pudo cargar la receta. Intenta enviar nuevamente.", 502);
    }
    const finished = await client.rpc("finish_patient_request", { target: result.id });
    if (finished.error)
      return fail("La solicitud aún no se envió. Comprueba la receta y vuelve a intentar.", 409);
    return Response.json({ id: finished.data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return fail("No se pudo procesar la solicitud. Revisa el formulario y vuelve a intentar.");
  }
}
