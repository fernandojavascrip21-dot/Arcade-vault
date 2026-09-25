// Reglas del nombre de jugador, compartidas por cliente y servidor (spec 12).
// El servidor las repite siempre: el cliente no es confiable.

export const GUEST_NAME = "INVITADO";
export const NAME_MIN = 3;
export const NAME_MAX = 14;

const ALLOWED = /^[\p{L}\p{N}_ ]+$/u;

// Recorta, colapsa espacios múltiples, pasa a mayúsculas y limita a NAME_MAX.
export function normalizePlayerName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toUpperCase().slice(0, NAME_MAX);
}

// Devuelve el mensaje de error, o null si el nombre es válido. Espera un
// nombre ya normalizado; "INVITADO" siempre es válido.
export function validatePlayerName(name: string): string | null {
  if (name === GUEST_NAME) return null;
  if (name.length < NAME_MIN) {
    return `El nombre debe tener al menos ${NAME_MIN} caracteres.`;
  }
  if (name.length > NAME_MAX) {
    return `El nombre admite como máximo ${NAME_MAX} caracteres.`;
  }
  if (!ALLOWED.test(name)) {
    return "Solo letras, números, guion bajo y espacios.";
  }
  if (
    name !== name.toUpperCase() ||
    /\s{2,}/.test(name) ||
    name !== name.trim()
  ) {
    return "Nombre no normalizado.";
  }
  return null;
}
