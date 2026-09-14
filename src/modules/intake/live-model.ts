import { hasAlarm, reasons, symptoms, history, type IntakeData } from "./model.ts";
import { paymentMethods } from "../services/catalog.ts";

export type PatientIntake = IntakeData & { phone: string; birthDate: string };
export function validatePatientStep(step: number, data: PatientIntake): string | null {
  if (hasAlarm(data)) return "Busca atención inmediata. No esperes una visita domiciliaria.";
  if (step === 0) {
    if (
      !reasons.includes(data.reason) ||
      data.alarm !== "No" ||
      !["Sí", "No"].includes(data.prescription)
    )
      return "Responde todas las preguntas.";
    if (data.prescription === "Sí" && !data.fileName) return "Adjunta la receta en JPG, PNG o PDF.";
    if ((!data.noSymptoms && !data.symptoms.length) || (!data.noHistory && !data.history.length))
      return "Completa síntomas y antecedentes o indica ninguno.";
    if (
      data.symptoms.some((value) => !symptoms.includes(value)) ||
      data.history.some((value) => !history.includes(value))
    )
      return "Revisa las respuestas seleccionadas.";
  }
  if (step === 1) {
    if (!data.patient.trim() || data.patient.length > 100 || !data.consent)
      return "Completa el nombre y autoriza el uso de estos datos para coordinar tu atención.";
    if (!/^\+[1-9][0-9]{7,14}$/.test(data.phone))
      return "Escribe un teléfono con código de país, por ejemplo +50370000000.";
    const born = Date.parse(data.birthDate);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(data.birthDate) ||
      !Number.isFinite(born) ||
      born > Date.now() ||
      born < Date.now() - 120 * 366 * 86400000
    )
      return "Revisa la fecha de nacimiento.";
    if (!data.municipality.trim() || !data.address.trim() || !data.department.trim())
      return "Completa el departamento, municipio y dirección.";
  }
  if (step === 2) {
    const preferred = Date.parse(data.slot + "-06:00");
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(data.slot) ||
      !Number.isFinite(preferred) ||
      preferred <= Date.now() ||
      preferred > Date.now() + 180 * 86400000
    )
      return "Elige una fecha futura dentro de los próximos seis meses.";
    if (!(paymentMethods as readonly string[]).includes(data.payment))
      return "Selecciona la forma de pago de preferencia.";
  }
  return null;
}

export function validPrescription(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) return false;
  if (mime === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  if (mime === "application/pdf") return [37, 80, 68, 70, 45].every((b, i) => bytes[i] === b);
  return false;
}
