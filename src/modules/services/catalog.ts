import { distanceCharge } from "../travel/pricing.ts";
export type ServiceOption = {
  id: string;
  name: string;
  description: string;
  cents: number | null;
  minutes: number | null;
};
export const rehabilitationStages = [
  {
    name: "1. Evaluación y plan",
    description:
      "El profesional evalúa la situación inicial, acuerda objetivos y define el plan individual.",
  },
  {
    name: "2. Intervención y reevaluación",
    description:
      "La respuesta del paciente determina los ajustes y si corresponde continuar, repetir una etapa, pausar o dar el alta.",
  },
  {
    name: "3. Consolidación y mantenimiento",
    description:
      "Se acuerda el cierre o el seguimiento cuando corresponda. No se contratan etapas futuras automáticamente.",
  },
] as const;

export const servicePackages = [
  {
    id: "nebulization-7-days",
    baseService: "nebulization",
    name: "Nebulizaciones · tratamiento de 7 días",
    cents: null,
    minutes: null,
    sessions: 7,
    icon: "nebulization",
    description:
      "7 sesiones: una nebulización diaria durante 7 días, según indicación profesional. Precio del tratamiento y traslados por confirmar.",
  },
  {
    id: "rehab-complete",
    baseService: "rehab",
    name: "Rehabilitación pulmonar · programa por etapas",
    cents: null,
    minutes: null,
    sessions: null,
    icon: "rehab",
    description:
      "Programa individualizado por etapas, sin un número fijo de sesiones. Cada etapa se cotiza y acepta por separado; la continuidad depende de la reevaluación profesional.",
  },
] as const;

export const paymentMethods = [
  "Efectivo",
  "Pago contra entrega",
  "Tarjeta de crédito",
  "Tarjeta de débito",
  "Transferencia bancaria",
  "Pago empresarial",
] as const;

export const services = [
  {
    id: "evaluation",
    name: "Evaluación respiratoria",
    cents: 2500,
    minutes: 45,
    description: "El primer paso para conocer tus necesidades respiratorias.",
    icon: "evaluation",
  },
  {
    id: "nebulization",
    name: "Nebulización · sesión individual",
    cents: 1500,
    minutes: 30,
    description: "Administración de terapia inhalada según indicación profesional.",
    icon: "nebulization",
  },
  {
    id: "physio",
    name: "Fisioterapia respiratoria",
    cents: 2500,
    minutes: 45,
    description: "Técnicas que acompañan el cuidado de tu respiración.",
    icon: "physio",
  },
  {
    id: "aspiration",
    name: "Aspiración de secreciones",
    cents: 2000,
    minutes: 30,
    description: "Manejo de secreciones por un profesional capacitado.",
    icon: "aspiration",
  },
  {
    id: "rehab",
    name: "Rehabilitación pulmonar · sesión individual",
    cents: 3000,
    minutes: 60,
    description: "Acompañamiento para tu recuperación y actividad cotidiana.",
    icon: "rehab",
  },
  {
    id: "education",
    name: "Educación respiratoria",
    cents: 2000,
    minutes: 40,
    description: "Orientación para pacientes y cuidadores en el hogar.",
    icon: "education",
  },
  ...servicePackages,
] as const;

export function money(cents: number | null) {
  if (cents === null) return "Precio por confirmar";
  return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function quote(serviceCents: number | null, kilometers: number, visits: number | null = 1) {
  if (!Number.isFinite(kilometers) || kilometers < 0 || kilometers > 25) {
    throw new Error("La cobertura de demostración es de 0 a 25 km.");
  }
  if (serviceCents === null) return { service: null, travel: null, total: null };
  if (visits === null) return { service: serviceCents, travel: null, total: null };
  const travel = distanceCharge(kilometers * 1000);
  return { service: serviceCents, travel, total: serviceCents + travel };
}
