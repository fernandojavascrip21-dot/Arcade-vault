"use client";

import { RotateCcw, X } from "lucide-react";
import { useSyncExternalStore } from "react";

// Sugerencia "gira el móvil" de la sala de juego (spec 14). Se descarta una
// vez y se recuerda en localStorage. Se lee con useSyncExternalStore y el
// snapshot de servidor es "descartada", así que en SSR/hidratación no se pinta
// (mismo patrón que la skin de Bloques y el mando táctil).

const STORAGE_KEY = "arcadevault.rotate-hint.v1";

let memoryDismissed = false;
const listeners = new Set<() => void>();

function readDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dismissed" || memoryDismissed;
  } catch {
    return memoryDismissed;
  }
}

function dismiss() {
  memoryDismissed = true;
  try {
    localStorage.setItem(STORAGE_KEY, "dismissed");
  } catch {
    // localStorage puede no estar disponible (modo privado, cuotas, etc.).
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

const serverDismissed = () => true;

// `enabled` = juego real en dispositivo táctil (lo decide PlayRoom). La
// orientación la resuelve el CSS: solo se ve en móvil vertical.
export function RotateHint({ enabled }: { enabled: boolean }) {
  const dismissed = useSyncExternalStore(
    subscribe,
    readDismissed,
    serverDismissed,
  );

  if (!enabled || dismissed) return null;

  return (
    <div className="mt-2 hidden items-center gap-2.5 border border-cian/25 bg-cian/5 pl-3 max-md:portrait:flex">
      <RotateCcw size={14} aria-hidden className="shrink-0 text-cian" />
      <span className="flex-1 text-[10px] leading-snug tracking-[1px] text-cian">
        GIRA EL MÓVIL PARA JUGAR A PANTALLA GRANDE
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Descartar sugerencia"
        className="grid size-11 shrink-0 place-items-center text-texto-tenue transition-colors hover:text-cian active:scale-95"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
