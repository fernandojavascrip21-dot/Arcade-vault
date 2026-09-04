// Persistencia y cálculo de rankings — portado de av-scores.js.
//
// Los rankings semilla viven en app/data.ts. Este módulo solo añade el estado
// local del navegador (localStorage) y lo combina con la semilla. Cuando haya
// backend real, la lectura/escritura pasará a hablar con la API.

import { GAMES, SEED } from "@/app/data";
import type { BoardRow, Game, ScoreEntry } from "@/lib/types";

export const SCORES_KEY = "arcadevault.scores.v1";

export type StoredScores = Record<string, ScoreEntry[]>;

export function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// Lee las puntuaciones locales. Devuelve {} en servidor o si falla el parseo.
export function load(): StoredScores {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SCORES_KEY) || "{}") as StoredScores;
  } catch {
    return {};
  }
}

// Añade una puntuación local y la persiste. Devuelve el nuevo estado.
export function add(
  stored: StoredScores,
  gameId: string,
  name: string,
  score: number,
): StoredScores {
  const entry: ScoreEntry = { name, score, date: fmtDate(new Date()) };
  const next: StoredScores = {
    ...stored,
    [gameId]: [...(stored[gameId] || []), entry],
  };
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(next));
  } catch {
    // localStorage no disponible (modo privado): seguimos solo en memoria.
  }
  return next;
}

// Top 10 combinando la semilla y las partidas locales, orden descendente.
export function board(stored: StoredScores, gameId: string): BoardRow[] {
  const seed: BoardRow[] = (SEED[gameId] || []).map(([name, score], i) => ({
    name,
    score,
    date: fmtDate(new Date(2026, 7, 28 - i * 3)),
    mine: false,
  }));
  const mine: BoardRow[] = (stored[gameId] || []).map((s) => ({
    name: s.name,
    score: s.score,
    date: s.date,
    mine: true,
  }));
  return [...mine, ...seed].sort((a, b) => b.score - a.score).slice(0, 10);
}

// Mejor puntuación formateada ("48.720") o "—" si no hay tabla.
export function best(stored: StoredScores, gameId: string): string {
  const top = board(stored, gameId)[0];
  return top ? top.score.toLocaleString("es-ES") : "—";
}

// Mejor fila de cada juego, en el orden de GAMES. Para la Home ("Últimas puntuaciones").
export function bestPerGame(
  stored: StoredScores,
): { game: Game; row: BoardRow | undefined }[] {
  return GAMES.map((game) => ({ game, row: board(stored, game.id)[0] }));
}

// Top N (por defecto 5) combinando el board() de todos los juegos. Para la Home ("Top jugadores").
export function topPlayersGlobal(stored: StoredScores, limit = 5): BoardRow[] {
  return GAMES.flatMap((game) => board(stored, game.id))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Color de rango: oro / plata / bronce / gris.
export function rankColor(index: number): string {
  if (index === 0) return "#f5ff00";
  if (index === 1) return "#cfd8dc";
  if (index === 2) return "#ff8a00";
  return "#4f5b64";
}

// --- Store para useSyncExternalStore -------------------------------------------
// Evita setState-en-effect: el componente se suscribe a localStorage y React
// resuelve la hidratación con el snapshot de servidor (siempre {} estable).

const EMPTY: StoredScores = {};
let cache: StoredScores = EMPTY;
let cacheRaw: string | null = null;
const listeners = new Set<() => void>();

export function subscribeScores(onChange: () => void): () => void {
  listeners.add(onChange);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onChange);
  }
  return () => {
    listeners.delete(onChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onChange);
    }
  };
}

// Devuelve una referencia estable: solo cambia si el JSON de localStorage cambió.
export function getScoresSnapshot(): StoredScores {
  if (typeof window === "undefined") return EMPTY;
  const raw = localStorage.getItem(SCORES_KEY);
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cache = raw ? (JSON.parse(raw) as StoredScores) : EMPTY;
    } catch {
      cache = EMPTY;
    }
  }
  return cache;
}

export function getScoresServerSnapshot(): StoredScores {
  return EMPTY;
}

// Guarda una puntuación local y notifica a los suscriptores.
export function saveScore(gameId: string, name: string, score: number): void {
  const next = add(getScoresSnapshot(), gameId, name, score);
  cache = next;
  cacheRaw = JSON.stringify(next);
  listeners.forEach((l) => l());
}
