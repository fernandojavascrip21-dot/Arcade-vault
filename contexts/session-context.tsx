"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

interface SessionValue {
  user: string | null; // nombre en mayúsculas, o null
  isGuest: boolean; // true tras "jugar como invitado"
  login: (name: string) => void;
  setName: (name: string) => void;
  playGuest: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

// El nombre del jugador se recuerda en localStorage (spec 12). Si el
// almacenamiento no está disponible (modo privado, bloqueado), se conserva en
// memoria mientras dure la pestaña.
const STORAGE_KEY = "arcade-vault:player-name";

let memoryName: string | null = null;
const listeners = new Set<() => void>();

function readName(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryName;
  } catch {
    return memoryName;
  }
}

function writeName(name: string | null) {
  memoryName = name;
  try {
    if (name === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Sin almacenamiento: queda solo en memoria.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

// Sesión simulada: el nombre persiste entre recargas; "invitado" solo en memoria.
export function SessionProvider({ children }: { children: ReactNode }) {
  // En el servidor (y en la hidratación) no hay nombre; el cliente lo lee tras
  // montar sin provocar desajuste.
  const user = useSyncExternalStore(subscribe, readName, () => null);
  const [isGuest, setIsGuest] = useState(false);

  const setName = useCallback((name: string) => {
    writeName(name);
    setIsGuest(false);
  }, []);

  const login = setName;

  const playGuest = useCallback(() => {
    writeName(null);
    setIsGuest(true);
  }, []);

  const logout = useCallback(() => {
    writeName(null);
    setIsGuest(false);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, isGuest, login, setName, playGuest, logout }),
    [user, isGuest, login, setName, playGuest, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession debe usarse dentro de <SessionProvider>");
  }
  return ctx;
}
