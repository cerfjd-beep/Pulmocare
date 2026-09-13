"use client";
import { useActionState, useState } from "react";
import { authenticate, onboard, reviewProvider, type FormState } from "./actions";
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
export function AuthForm() {
  const [signup, setSignup] = useState(false);
  const [state, action, pending] = useActionState(authenticate, {});
  return (
    <form action={action} className="account-form">
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
        />
      </label>
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
      <Feedback state={state} />
      <button className="button primary" disabled={pending}>
        {pending ? "Un momento…" : signup ? "Crear cuenta" : "Ingresar"}
      </button>
      <button
        type="button"
        className="text-button"
        disabled={pending}
        onClick={() => setSignup(!signup)}
      >
        {signup ? "Ya tengo cuenta: iniciar sesión" : "No tengo cuenta: registrarme"}
      </button>
      {signup && (
        <small>
          Después de confirmar tu correo podrás completar tu perfil. El acceso administrativo
          requiere autorización.
        </small>
      )}
    </form>
  );
}
export function OnboardingForm() {
  const [kind, setKind] = useState("patient");
  const [state, action, pending] = useActionState(onboard, {});
  return (
    <form action={action} className="account-form">
      <h2>Completa tu perfil</h2>
      <label>
        Nombre completo
        <input name="name" autoComplete="name" required maxLength={200} />
      </label>
      <label>
        Tipo de perfil
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="patient">Paciente</option>
          <option value="provider">Prestador del servicio</option>
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
          <p>Tu perfil quedará pendiente de verificación por un administrador.</p>
        </>
      )}
      <Feedback state={state} />
      <button className="button primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar perfil"}
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
        <input type="checkbox" required /> Confirmo que revisé la identidad y el registro
        profesional para esta decisión.
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
