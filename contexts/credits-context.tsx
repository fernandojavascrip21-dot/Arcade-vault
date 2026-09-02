"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface CreditsValue {
  credits: number; // arranca en 3, tope 99
  coinMsg: string; // texto del aviso flotante, "" si oculto
  insertCoin: () => void; // +1 y aviso "MONEDA ACEPTADA"
  spendCredit: () => boolean; // -1 y true; si credits === 0 => aviso y false
}

const CreditsContext = createContext<CreditsValue | null>(null);

const COIN_MS = 1800;

// Créditos simulados, solo en memoria: se reinician a 3 al recargar.
export function CreditsProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState(3);
  const [coinMsg, setCoinMsg] = useState("");

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((msg: string) => {
    setCoinMsg(msg);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCoinMsg(""), COIN_MS);
  }, []);

  const insertCoin = useCallback(() => {
    setCredits((c) => Math.min(99, c + 1));
    flash("MONEDA ACEPTADA");
  }, [flash]);

  const spendCredit = useCallback(() => {
    if (credits <= 0) {
      flash("INSERTA UNA MONEDA");
      return false;
    }
    setCredits((c) => c - 1);
    flash("CRÉDITO CONSUMIDO");
    return true;
  }, [credits, flash]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const value = useMemo<CreditsValue>(
    () => ({ credits, coinMsg, insertCoin, spendCredit }),
    [credits, coinMsg, insertCoin, spendCredit],
  );

  return (
    <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>
  );
}

export function useCredits(): CreditsValue {
  const ctx = useContext(CreditsContext);
  if (!ctx) {
    throw new Error("useCredits debe usarse dentro de <CreditsProvider>");
  }
  return ctx;
}
