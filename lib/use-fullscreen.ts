import { useSyncExternalStore } from "react";

// Pantalla completa de la sala de juego (spec 15). El elemento que entra en
// pantalla completa es <html>, no <main>: el modal FIN DEL JUEGO y el menú
// OPCIONES viven en un portal a <body> y tienen que seguir viéndose.
// Se lee con useSyncExternalStore y el snapshot de servidor/hidratación es
// siempre `false`, así que el botón no se pinta en SSR ni hay desajuste.

function subscribe(notify: () => void) {
  document.addEventListener("fullscreenchange", notify);
  return () => document.removeEventListener("fullscreenchange", notify);
}

// El soporte no cambia durante la vida de la página.
const subscribeNever = () => () => {};
const readSupported = () => document.fullscreenEnabled === true;
const readActive = () => document.fullscreenElement !== null;
const serverSnapshot = () => false;

// Los rechazos se ignoran: el navegador puede negar la petición (sin gesto del
// usuario, permisos de un iframe...) y la sala sigue funcionando en ventana.
export function toggleFullscreen() {
  if (!document.fullscreenEnabled) return;
  const request = document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen();
  request.catch(() => {});
}

export function exitFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

export function useFullscreen(): {
  supported: boolean;
  active: boolean;
  toggle: () => void;
} {
  const supported = useSyncExternalStore(
    subscribeNever,
    readSupported,
    serverSnapshot,
  );
  const active = useSyncExternalStore(subscribe, readActive, serverSnapshot);
  return { supported, active, toggle: toggleFullscreen };
}
