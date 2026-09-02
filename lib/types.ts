// Tipos de dominio de la maqueta. Portados de av-data.js / av-scores.js.

export type CategoryLabel = "Todos" | "Acción" | "Clásico" | "Espacio" | "Puzzle";

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
export interface BoardRow extends ScoreEntry {
  mine: boolean; // procede de localStorage (partida local)
}
