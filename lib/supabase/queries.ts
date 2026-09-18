// Consultas server-only contra las tablas games/scores (spec 07). Usadas desde
// Server Components (page.tsx); nunca desde código de cliente.

import { createClient } from "@/lib/supabase/server";
import type { BoardRow, Game } from "@/lib/types";

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
