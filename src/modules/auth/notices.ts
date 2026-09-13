export const authNotices: Record<string, string> = {
  invalid:
    "Completa un correo válido y la contraseña. Para registrarte usa al menos 10 caracteres y repite la misma contraseña.",
  failed:
    "No pudimos iniciar sesión. Revisa el correo, la contraseña y que tu cuenta esté confirmada en Supabase.",
  signup_failed:
    "No se pudo crear la cuenta. La administración debe revisar los registros de Authentication en Supabase y el servicio de correo.",
  unavailable: "El servicio de acceso no está disponible. Intenta nuevamente más tarde.",
};
