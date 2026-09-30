// Media queries de la sala de juego responsive (spec 14). Mantener
// sincronizadas con las variantes `mobile` / `mobile-landscape` de
// app/globals.css: el layout es CSS puro y estas constantes solo sirven al poco
// JS que las necesita (p. ej. la sensibilidad del deslizador en horizontal).
export const MOBILE_LANDSCAPE_QUERY =
  "(orientation: landscape) and (max-height: 540px)";

export const MOBILE_QUERY = `(max-width: 767px), ${MOBILE_LANDSCAPE_QUERY}`;
