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
  SESSION_MAX_AGE_SECONDS,
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

// Instante de inicio de sesión (segundos) desde el claim `amr` del JWT: el
// `timestamp` más antiguo. `null` si falta o no es legible (spec 23).
export function getAuthenticatedAt(amr: unknown): number | null {
  if (!Array.isArray(amr)) return null;
  let oldest: number | null = null;
  for (const entry of amr) {
    const ts = (entry as { timestamp?: unknown } | null)?.timestamp;
    if (typeof ts !== "number" || !Number.isFinite(ts)) continue;
    if (oldest === null || ts < oldest) oldest = ts;
  }
  return oldest;
}

// Falla abierto: sin marca legible la sesión se considera no vencida (spec 23).
export function isSessionExpired(
  authenticatedAtSeconds: number | null,
  nowSeconds: number,
  maxAgeSeconds = SESSION_MAX_AGE_SECONDS,
): boolean {
  if (authenticatedAtSeconds === null) return false;
  return nowSeconds - authenticatedAtSeconds > maxAgeSeconds;
}

export function translateAuthError(code: string | undefined): string {
  return (code && AUTH_ERRORS[code]) || GENERIC_AUTH_ERROR;
}
