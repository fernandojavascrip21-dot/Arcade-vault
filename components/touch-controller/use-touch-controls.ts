"use client";

import { useCallback, useSyncExternalStore } from "react";

// Visibilidad del control táctil (spec 13): solo en `(pointer: coarse)`, con
// una preferencia manual "on"/"off" en localStorage para ocultarlo. Ambos se leen con
// useSyncExternalStore (snapshot de servidor = oculto) para no desajustar la
// hidratación, igual que la skin de Bloques en play-room.tsx.

const STORAGE_KEY = "arcadevault.touch-controls.v1";
const COARSE_QUERY = "(pointer: coarse)";

type Preference = "on" | "off" | null; // null = automático

let memoryPreference: Preference = null;
const preferenceListeners = new Set<() => void>();

function isPreference(value: string | null): value is "on" | "off" {
  return value === "on" || value === "off";
}

function readPreference(): Preference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isPreference(stored) ? stored : memoryPreference;
  } catch {
    return memoryPreference;
  }
}

function writePreference(next: "on" | "off") {
  memoryPreference = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // localStorage puede no estar disponible (modo privado, cuotas, etc.).
  }
  preferenceListeners.forEach((notify) => notify());
}

function subscribePreference(notify: () => void) {
  preferenceListeners.add(notify);
  return () => {
    preferenceListeners.delete(notify);
  };
}

function subscribeCoarse(notify: () => void) {
  const media = window.matchMedia(COARSE_QUERY);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

function readCoarse() {
  return window.matchMedia(COARSE_QUERY).matches;
}

const serverCoarse = () => false;
const serverPreference = (): Preference => null;

export function useTouchControls() {
  const isCoarse = useSyncExternalStore(
    subscribeCoarse,
    readCoarse,
    serverCoarse,
  );
  const preference = useSyncExternalStore(
    subscribePreference,
    readPreference,
    serverPreference,
  );

  // La preferencia solo cuenta en táctil: en escritorio el panel nunca se
  // muestra, porque ahí no existe el botón MANDO para quitarlo.
  const visible = isCoarse && preference !== "off";

  const toggle = useCallback(() => {
    writePreference(visible ? "off" : "on");
  }, [visible]);

  return { isCoarse, visible, toggle };
}
