import { CalendarDays, Heart, House, LayoutGrid, Route, Stethoscope } from "lucide-react";

export const patientNavigation = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/solicitar", label: "Solicitar atención", icon: Heart },
  { href: "/mis-citas", label: "Mis solicitudes", icon: CalendarDays },
];

export const staffNavigation = [
  { href: "/admin", label: "Administración", icon: LayoutGrid },
  { href: "/admin/traslados", label: "Costos de traslado", icon: Route },
  { href: "/equipo", label: "Equipo clínico", icon: Stethoscope },
];

export function isStaffPath(path: string) {
  return (
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/equipo" ||
    path.startsWith("/equipo/")
  );
}

export function isActivePath(path: string, href: string) {
  if (href === "/" || href === "/admin") return path === href;
  return path === href || path.startsWith(href + "/");
}
