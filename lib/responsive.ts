// Media queries de la sala de juego responsive (spec 14). Mantener
// sincronizadas con las variantes `mobile` / `mobile-landscape` de
// app/globals.css: el layout es CSS puro y estas constantes solo sirven al poco
// JS que las necesita (p. ej. la sensibilidad del deslizador en horizontal).
export const MOBILE_LANDSCAPE_QUERY =
  "(orientation: landscape) and (max-height: 540px)";

export const MOBILE_QUERY = `(max-width: 767px), ${MOBILE_LANDSCAPE_QUERY}`;

// Complemento exacto de MOBILE_QUERY: variante `desktop` (spec 15). Solo la usa
// el menú OPCIONES para cerrarse al redimensionar cuando está anclado al ⋮.
export const DESKTOP_QUERY = "(width >= 768px) and (height > 540px)";
