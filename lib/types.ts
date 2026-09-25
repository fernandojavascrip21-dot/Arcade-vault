// Tipos de dominio de la maqueta. Portados de av-data.js / av-scores.js.

export type CategoryLabel =
  "Todos" | "Acción" | "Clásico" | "Espacio" | "Puzzle";

export interface Game {
  id: string; // "rompemuros", "serpiente", ...
  title: string; // "ROMPEMUROS"
  category: Exclude<CategoryLabel, "Todos">;
  desc: string; // frase corta para la tarjeta
  long: string; // descripción larga para la ficha
  thumb: string; // gradiente CSS de la carátula
}

export interface ScoreEntry {
  name: string;
  score: number;
  date: string; // "DD/MM/AAAA"
}

// Fila ya resuelta para pintar rankings.
export type BoardRow = ScoreEntry;

// Ranking general (spec 12): una fila por jugador con su mejor marca por juego.
export interface GeneralRow {
  name: string;
  total: number; // suma de sus mejores marcas
  byGame: Record<string, number>; // gameId -> mejor marca (ausente = no jugó)
}

// Partida del historial personal ("MIS PARTIDAS").
export interface HistoryRow {
  gameId: string;
  score: number;
  date: string; // "DD/MM/AAAA"
}

// Resultado de guardar una puntuación: dónde quedó el jugador en ese juego.
export interface SavedResult {
  board: BoardRow[]; // top 10 del juego
  rank: number; // 1 + cuántas puntuaciones son estrictamente mayores
  total: number; // total de partidas guardadas de ese juego
}
