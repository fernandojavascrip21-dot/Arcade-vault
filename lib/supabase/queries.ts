// Consultas server-only contra las tablas games/scores (spec 07). Usadas desde
// Server Components (page.tsx); nunca desde código de cliente.

import { createClient } from "@/lib/supabase/server";
import type { BoardRow, Game, GeneralRow, HistoryRow } from "@/lib/types";

type GameRow = {
  id: string;
  title: string;
  category: Game["category"];
  desc: string;
  long: string;
  thumb: string;
};

type ScoreRow = {
  game_id: string;
  player_name: string;
  score: number;
  created_at: string;
};

function toGame(row: GameRow): Game {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    desc: row.desc,
    long: row.long,
    thumb: row.thumb,
  };
}

function formatDate(createdAt: string): string {
  const d = new Date(createdAt);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function toBoardRow(row: ScoreRow): BoardRow {
  return {
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  };
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("games").select("*");
  if (error) throw error;
  return (data ?? []).map(toGame);
}

export async function getGameById(id: string): Promise<Game | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toGame(data) : undefined;
}

export async function getBoard(
  gameId: string,
  limit = 10,
): Promise<BoardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("game_id, player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toBoardRow);
}

export async function getBoardsForGames(
  gameIds: string[],
): Promise<Record<string, BoardRow[]>> {
  const boards = await Promise.all(gameIds.map((gameId) => getBoard(gameId)));
  return Object.fromEntries(gameIds.map((gameId, i) => [gameId, boards[i]]));
}

export async function getBestPerGame(): Promise<
  { game: Game; row: BoardRow | undefined }[]
> {
  const games = await getGames();
  const boards = await getBoardsForGames(games.map((g) => g.id));
  return games.map((game) => ({ game, row: boards[game.id]?.[0] }));
}

export async function getTopPlayersGlobal(limit = 5): Promise<BoardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("game_id, player_name, score, created_at")
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toBoardRow);
}

// Ranking general (spec 12): mejor marca de cada jugador en cada juego (vista
// player_best_scores) y total = suma de esas marcas, ordenado por total.
export async function getGeneralBoard(limit = 20): Promise<GeneralRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_best_scores")
    .select("player_name, game_id, best_score");
  if (error) throw error;

  const byPlayer = new Map<string, GeneralRow>();
  for (const row of data ?? []) {
    if (row.player_name === null || row.game_id === null) continue;
    const entry: GeneralRow = byPlayer.get(row.player_name) ?? {
      name: row.player_name,
      total: 0,
      byGame: {},
    };
    entry.byGame[row.game_id] = row.best_score ?? 0;
    entry.total += row.best_score ?? 0;
    byPlayer.set(row.player_name, entry);
  }

  return [...byPlayer.values()]
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// Historial personal ("MIS PARTIDAS"): más recientes primero.
export async function getPlayerHistory(
  name: string,
  limit = 100,
): Promise<HistoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("game_id, score, created_at")
    .eq("player_name", name)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    gameId: row.game_id,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

// Puesto de una puntuación en un juego: 1 + cuántas son estrictamente mayores.
export async function getScoreRank(
  gameId: string,
  score: number,
): Promise<{ rank: number; total: number }> {
  const supabase = await createClient();
  const [greater, all] = await Promise.all([
    supabase
      .from("scores")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId)
      .gt("score", score),
    supabase
      .from("scores")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId),
  ]);
  if (greater.error) throw greater.error;
  if (all.error) throw all.error;
  return { rank: (greater.count ?? 0) + 1, total: all.count ?? 0 };
}
