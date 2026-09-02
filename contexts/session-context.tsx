"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface SessionValue {
  user: string | null; // nombre en mayúsculas, o null
  isGuest: boolean; // true tras "jugar como invitado"
  login: (name: string) => void;
  playGuest: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

// Sesión simulada, solo en memoria: se reinicia al recargar (como la maqueta).
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const login = useCallback((name: string) => {
    setUser(name);
    setIsGuest(false);
  }, []);

  const playGuest = useCallback(() => {
    setUser(null);
    setIsGuest(true);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsGuest(false);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, isGuest, login, playGuest, logout }),
    [user, isGuest, login, playGuest, logout],
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
