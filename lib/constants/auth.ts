// Constantes de autenticación (spec 21). Solo valores: la lógica vive en
// `lib/auth.ts` y las Server Actions en `app/auth/actions.ts`.

import type { AuthFormState } from "@/lib/interfaces/auth";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // límite de bcrypt en Supabase Auth

// Regla completa (spec 22): minúscula, mayúscula y número, de 8 a 72
// caracteres. Mantener igual que el requisito del panel de Supabase Auth.
export const PASSWORD_RE = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{${PASSWORD_MIN},${PASSWORD_MAX}}$`,
);
export const PASSWORD_RULE_HINT = `De ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres, con minúscula, mayúscula y número.`;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX = 254;

export const INITIAL_AUTH_STATE: AuthFormState = { ok: false };

export const GENERIC_AUTH_ERROR =
  "No se pudo completar la operación. Inténtalo de nuevo.";

export const NEUTRAL_RESET_MESSAGE =
  "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña.";
export const NEUTRAL_RESEND_MESSAGE =
  "Si el correo está pendiente de confirmar, te enviamos un nuevo enlace.";

export const PLAYER_NAME_CREATED_MESSAGE = "CUENTA CREADA";

// Mapa central de errores de Supabase Auth (por `error.code`) a español.
// Las credenciales inválidas usan un único mensaje: no revela si el correo existe.
export const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed: "Confirma tu correo antes de iniciar sesión.",
  weak_password: `La contraseña es demasiado débil. ${PASSWORD_RULE_HINT}`,
  same_password: "La nueva contraseña debe ser distinta de la anterior.",
  email_address_invalid: "El correo no es válido.",
  validation_failed: "Revisa los datos e inténtalo de nuevo.",
  over_email_send_rate_limit:
    "Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.",
  over_request_rate_limit:
    "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  otp_expired: "El enlace venció o ya se usó. Solicita uno nuevo.",
  session_not_found: "Tu sesión venció. Vuelve a iniciar sesión.",
  not_authenticated: "Tu sesión venció. Vuelve a iniciar sesión.",
};

// Reenvío del correo de confirmación (/auth/check-email).
export const RESEND_COOLDOWN_SECONDS = 60;

// /auth/player-name: espera de la comprobación de disponibilidad y pausa del
// estado "CUENTA CREADA" antes de redirigir.
export const NAME_CHECK_DEBOUNCE_MS = 400;
export const ACCOUNT_CREATED_REDIRECT_MS = 1800;

// Avisos de /auth según `?error=` (los pone /auth/callback).
export const AUTH_PAGE_NOTICES: Record<string, string> = {
  "link-invalid": "El enlace venció o ya se usó. Pide uno nuevo con tu correo.",
  oauth: "No se pudo iniciar sesión con ese proveedor. Inténtalo de nuevo.",
};

export const OAUTH_PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
] as const;

export const NAME_TAKEN_ERROR =
  "Ese nombre ya está en uso. Si ya lo elegiste con otra cuenta, cierra sesión y entra con esa cuenta.";

// Sugerencias de nombre cuando el elegido ya está en uso (/auth/player-name).
export const NAME_SUGGESTION_SUFFIXES = ["2", "_21", "_99", "_X"] as const;
export const NAME_SUGGESTIONS_MAX = 3;
export const PLAYER_NAME_INTRO =
  "Tu cuenta con este correo ya está creada. Solo falta elegir tu nombre de jugador: es el que verás en el ranking y después no se puede cambiar.";

// Fuerza al proveedor a preguntar con qué cuenta entrar en vez de reutilizar la
// que tenga abierta el navegador (evita entrar sin querer con otra cuenta).
export const OAUTH_QUERY_PARAMS = { prompt: "select_account" } as const;
