// Utilidades de autenticación compartidas por Server Actions y pantallas
// (spec 21). Sin "use server": aquí viven tipos y funciones puras. Las
// constantes están en `lib/constants/auth.ts`.

import {
  AUTH_ERRORS,
  EMAIL_MAX,
  EMAIL_RE,
  GENERIC_AUTH_ERROR,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from "@/lib/constants/auth";

export function isValidEmail(email: string): boolean {
  return email.length <= EMAIL_MAX && EMAIL_RE.test(email);
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  }
  if (password.length > PASSWORD_MAX) {
    return `La contraseña admite como máximo ${PASSWORD_MAX} caracteres.`;
  }
  return null;
}

// Solo rutas internas: "/algo", nunca "//host", "/\host" ni URLs absolutas.
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/")) return null;
  if (next.startsWith("//") || next.includes("\\")) return null;
  return next;
}

export function translateAuthError(code: string | undefined): string {
  return (code && AUTH_ERRORS[code]) || GENERIC_AUTH_ERROR;
}
