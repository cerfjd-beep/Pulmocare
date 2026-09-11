import { distanceCharge } from "../travel/pricing.ts";

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
    name: "Nebulización",
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
    name: "Rehabilitación pulmonar",
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
] as const;

export function money(cents: number) {
  return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function quote(serviceCents: number, kilometers: number) {
  if (!Number.isFinite(kilometers) || kilometers < 0 || kilometers > 25) {
    throw new Error("La cobertura de demostración es de 0 a 25 km.");
  }
  const travel = distanceCharge(kilometers * 1000);
  return { service: serviceCents, travel, total: serviceCents + travel };
}
