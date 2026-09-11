export const reasons = [
  "Dificultad respiratoria",
  "Exceso de secreciones",
  "Uso de oxígeno",
  "Asma",
  "EPOC",
  "Neumonía",
  "Postoperatorio",
  "Traqueostomía",
  "Ventilación mecánica",
  "Otro",
];
export const symptoms = [
  "Tos",
  "Flema",
  "Falta de aire",
  "Saturación baja",
  "Dolor torácico",
  "Fiebre",
];
export const history = [
  "Asma",
  "EPOC",
  "COVID previo",
  "Insuficiencia cardíaca",
  "Enfermedad neuromuscular",
];

export interface IntakeData {
  reason: string;
  alarm: string;
  prescription: string;
  fileName: string;
  symptoms: string[];
  history: string[];
  noSymptoms: boolean;
  noHistory: boolean;
  patient: string;
  consent: boolean;
  department: string;
  municipality: string;
  address: string;
  reference: string;
  kilometers: number;
  serviceId: string;
  slot: string;
  payment: string;
}

export const initialIntake: IntakeData = {
  reason: "",
  alarm: "",
  prescription: "",
  fileName: "",
  symptoms: [],
  history: [],
  noSymptoms: false,
  noHistory: false,
  patient: "",
  consent: false,
  department: "San Salvador",
  municipality: "",
  address: "",
  reference: "",
  kilometers: 5,
  serviceId: "evaluation",
  slot: "",
  payment: "Pago contra entrega",
};

export function needsPriorReview(data: IntakeData) {
  return (
    data.prescription === "No" || ["Traqueostomía", "Ventilación mecánica"].includes(data.reason)
  );
}

// Demo only: this is a workflow gate, not a validated clinical triage algorithm.
export function hasAlarm(data: IntakeData) {
  return data.alarm === "Sí" || data.symptoms.includes("Dolor torácico");
}

export function validateStep(step: number, data: IntakeData): string | null {
  if (hasAlarm(data)) return "La solicitud ordinaria se detiene ante una señal de alarma.";
  if (step === 0) {
    if (!data.reason || !data.alarm || !data.prescription) return "Responde todas las preguntas.";
    if (data.prescription === "Sí" && !data.fileName) return "Selecciona una receta ficticia.";
    if (data.prescription === "No" && !data.noSymptoms && !data.symptoms.length) {
      return "Selecciona los síntomas o indica que no presentas los listados.";
    }
    if (data.prescription === "No" && !data.noHistory && !data.history.length) {
      return "Selecciona los antecedentes o indica que no tienes los listados.";
    }
  }
  if (step === 1) {
    if (!data.patient.trim() || !data.consent)
      return "Ingresa un nombre ficticio y acepta el modo demo.";
    if (!data.municipality.trim() || !data.address.trim())
      return "Completa el municipio y la dirección.";
    if (!Number.isFinite(data.kilometers) || data.kilometers < 0 || data.kilometers > 25) {
      return "La cobertura de demostración es de 0 a 25 km.";
    }
  }
  if (step === 2 && !data.slot) return "Selecciona un horario de preferencia.";
  return null;
}
