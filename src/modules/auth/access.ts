export type Portal = "patient" | "provider" | "admin";
export type Access = {
  profile_id: string;
  name: string;
  active: boolean;
  roles: string[];
  professional_status: string | null;
};
export function parseAccess(value: unknown): Access | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.profile_id !== "string" ||
    typeof v.name !== "string" ||
    typeof v.active !== "boolean" ||
    !Array.isArray(v.roles) ||
    !v.roles.every((r) => typeof r === "string")
  )
    return null;
  return {
    profile_id: v.profile_id,
    name: v.name,
    active: v.active,
    roles: v.roles,
    professional_status: typeof v.professional_status === "string" ? v.professional_status : null,
  };
}
export function portals(access: Access | null): Portal[] {
  if (!access?.active) return [];
  const result: Portal[] = [];
  if (access.roles.some((r) => ["access_admin", "operations_admin", "billing_admin"].includes(r)))
    result.push("admin");
  if (
    access.professional_status === "verified" &&
    access.roles.some((r) => ["therapist", "clinical_reviewer"].includes(r))
  )
    result.push("provider");
  if (access.roles.some((r) => ["patient", "caregiver"].includes(r))) result.push("patient");
  return result;
}
export const portalPaths = { patient: "/mis-citas", provider: "/equipo", admin: "/admin" };
export const portalLabels = {
  patient: "Pacientes",
  provider: "Prestadores",
  admin: "Administradores",
};
