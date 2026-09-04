"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useSession } from "@/contexts/session-context";
import {
  getScoresServerSnapshot,
  getScoresSnapshot,
  saveScore as persistScore,
  subscribeScores,
  type StoredScores,
} from "@/lib/scores";

interface ScoresValue {
  stored: StoredScores; // partidas locales por juego (localStorage)
  saveScore: (gameId: string, score: number) => void;
}

const ScoresContext = createContext<ScoresValue | null>(null);

// Puntuaciones locales: se leen de localStorage vía useSyncExternalStore (sin
// desajuste de hidratación) y se persisten al guardar. El nombre del jugador
// sale de la sesión (o "INVITADO").
export function ScoresProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const stored = useSyncExternalStore(
    subscribeScores,
    getScoresSnapshot,
    getScoresServerSnapshot,
  );

  const saveScore = useCallback(
    (gameId: string, score: number) => {
      persistScore(gameId, user ?? "INVITADO", score);
    },
    [user],
  );

  const value = useMemo<ScoresValue>(
    () => ({ stored, saveScore }),
    [stored, saveScore],
  );

  return (
    <ScoresContext.Provider value={value}>{children}</ScoresContext.Provider>
  );
}

export function useScores(): ScoresValue {
  const ctx = useContext(ScoresContext);
  if (!ctx) {
    throw new Error("useScores debe usarse dentro de <ScoresProvider>");
  }
  return ctx;
}
