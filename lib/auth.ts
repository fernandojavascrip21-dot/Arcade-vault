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
  PASSWORD_RE,
  PASSWORD_SYMBOL_RE,
  PASSWORD_RULE_HINT,
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
  const missing: string[] = [];
  if (!/[a-z]/.test(password)) missing.push("una minúscula");
  if (!/[A-Z]/.test(password)) missing.push("una mayúscula");
  if (!/\d/.test(password)) missing.push("un número");
  if (!PASSWORD_SYMBOL_RE.test(password)) missing.push("un símbolo");
  if (missing.length > 0) {
    return `La contraseña necesita ${missing.join(", ").replace(/, ([^,]*)$/, " y $1")}.`;
  }
  // Red de seguridad: la regla completa es la fuente de verdad.
  if (!PASSWORD_RE.test(password)) {
    return `La contraseña no cumple la regla. ${PASSWORD_RULE_HINT}`;
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
