"use client";

import { createContext, useContext, useState } from "react";

export type RequestStatus =
  | "Pendiente de revisión"
  | "Valoración médica previa"
  | "Aprobada para coordinar"
  | "Visita completada";

export interface DemoRequest {
  id: string;
  patient: string;
  reason: string;
  symptoms: string[];
  history: string[];
  prescription: string;
  service: string;
  address: string;
  slot: string;
  payment: string;
  total: number;
  status: RequestStatus;
  note?: string;
  followUp?: string;
}

const initialRequests: DemoRequest[] = [
  {
    id: "PC-DEMO-001",
    patient: "Paciente de ejemplo",
    reason: "Asma",
    symptoms: ["Tos"],
    history: ["Asma"],
    prescription: "Receta de ejemplo (sin archivo)",
    service: "Evaluación respiratoria",
    address: "Dirección ficticia · San Salvador",
    slot: "Horario por coordinar",
    payment: "Pago contra entrega",
    total: 2500,
    status: "Pendiente de revisión",
  },
];

interface DemoContextValue {
  requests: DemoRequest[];
  addRequest: (request: DemoRequest) => void;
  updateRequest: (id: string, patch: Partial<DemoRequest>) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState(initialRequests);
  const addRequest = (request: DemoRequest) => setRequests((current) => [request, ...current]);
  const updateRequest = (id: string, patch: Partial<DemoRequest>) => {
    setRequests((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };
  return (
    <DemoContext.Provider value={{ requests, addRequest, updateRequest }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("Falta el proveedor de demostración.");
  return context;
}
