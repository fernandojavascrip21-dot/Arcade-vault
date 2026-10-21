// Constantes de autenticación (spec 21). Solo valores: la lógica vive en
// `lib/auth.ts` y las Server Actions en `app/auth/actions.ts`.

import type { AuthFormState } from "@/lib/interfaces/auth";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // límite de bcrypt en Supabase Auth

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
  weak_password: `La contraseña es demasiado débil (mínimo ${PASSWORD_MIN} caracteres).`,
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
