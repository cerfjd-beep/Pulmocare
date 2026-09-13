"use client";
import { useActionState, useState } from "react";
import { onboard, reviewProvider, type FormState } from "./actions";
function Feedback({ state }: { state: FormState }) {
  return (
    <div aria-live="polite">
      {state.error && (
        <p role="alert" className="notice">
          {state.error}
        </p>
      )}
      {state.message && <p className="notice">{state.message}</p>}
    </div>
  );
}
export function AuthForm({ signup = false, state = {} }: { signup?: boolean; state?: FormState }) {
  const [validationError, setValidationError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      action="/auth/session"
      method="post"
      noValidate
      className="account-form"
      onInvalid={(event) => {
        const input = event.target as HTMLInputElement;
        const label =
          input.name === "email"
            ? "Correo electrónico"
            : input.name === "confirmation"
              ? "Repite la contraseña"
              : "Contraseña";
        setValidationError(`${label}: ${input.validationMessage}`);
      }}
      onInput={() => setValidationError("")}
      onSubmit={() => {
        setValidationError("");
        setPending(true);
      }}
    >
      <h2>{signup ? "Crea tu cuenta" : "Inicia sesión"}</h2>
      <p>Acceso para pacientes, prestadores y administradores.</p>
      <input type="hidden" name="mode" value={signup ? "signup" : "login"} />
      <label>
        Correo electrónico
        <input type="email" name="email" autoComplete="email" required maxLength={254} />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          name="password"
          autoComplete={signup ? "new-password" : "current-password"}
          required
          minLength={signup ? 10 : 1}
          maxLength={128}
          aria-describedby={signup ? "password-requirements" : undefined}
        />
      </label>
      {signup && (
        <small id="password-requirements">
          Usa al menos 10 caracteres. Debes escribir la misma contraseña en ambos campos.
        </small>
      )}
      {signup && (
        <label>
          Repite la contraseña
          <input
            type="password"
            name="confirmation"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
          />
        </label>
      )}
      <Feedback state={validationError ? { error: validationError } : state} />
      <p role="status" aria-live="polite">
        {pending ? "Enviando la solicitud. Espera a que aparezca el resultado." : ""}
      </p>
      <button type="submit" className="button primary" disabled={pending}>
        {pending ? "Un momento…" : signup ? "Crear cuenta" : "Ingresar"}
      </button>
      <a href={signup ? "/ingresar" : "/ingresar?mode=signup"} className="text-button">
        {signup ? "Ya tengo cuenta: iniciar sesión" : "No tengo cuenta: registrarme"}
      </a>
      {signup && (
        <small>
          Después de confirmar tu correo podrás completar tu perfil. El acceso administrativo
          requiere autorización.
        </small>
      )}
    </form>
  );
}
export function OnboardingForm({
  kinds = ["patient", "provider"],
  name = "",
}: {
  kinds?: ("patient" | "provider")[];
  name?: string;
}) {
  const [kind, setKind] = useState(kinds[0] ?? "patient");
  const [state, action, pending] = useActionState(onboard, {});
  return (
    <form action={action} className="account-form">
      <h2>{name ? "Agregar perfil" : "Completa tu perfil"}</h2>
      <label>
        Nombre completo
        <input name="name" autoComplete="name" defaultValue={name} required maxLength={200} />
      </label>
      <label>
        Tipo de perfil
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value === "provider" ? "provider" : "patient")}
        >
          {kinds.includes("patient") && <option value="patient">Paciente</option>}
          {kinds.includes("provider") && <option value="provider">Prestador del servicio</option>}
        </select>
      </label>
      {kind === "provider" && (
        <>
          <label>
            Especialidad
            <input name="specialty" required maxLength={200} />
          </label>
          <label>
            Número de registro profesional
            <input name="registration" required maxLength={200} />
          </label>
          <p>
            Enviarás una solicitud de autorización. La administración debe verificar tu identidad,
            título y registro profesional vigente antes de habilitar tu perfil de terapeuta. En el
            siguiente paso deberás cargar una foto de tu título y de tu carnet profesional.
          </p>
        </>
      )}
      <Feedback state={state} />
      <button className="button primary" disabled={pending}>
        {pending ? "Guardando…" : kind === "provider" ? "Solicitar autorización" : "Guardar perfil"}
      </button>
    </form>
  );
}
export function ProviderReview({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(reviewProvider, {});
  return (
    <form action={action} className="account-form compact">
      <input type="hidden" name="id" value={id} />
      <label>
        <input type="checkbox" name="credentials_checked" /> Confirmo que verifiqué la identidad, el
        título y la autorización profesional vigente con la entidad emisora.
      </label>
      <div className="account-actions">
        {status !== "verified" && (
          <button name="decision" value="approve" className="button primary" disabled={pending}>
            Aprobar prestador
          </button>
        )}
        {status !== "suspended" && (
          <button name="decision" value="suspend" className="button secondary" disabled={pending}>
            Suspender
          </button>
        )}
      </div>
      <Feedback state={state} />
    </form>
  );
}
