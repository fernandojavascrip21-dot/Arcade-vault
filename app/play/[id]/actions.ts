"use server";

import { validatePlayerName } from "@/lib/player-name";
import { createClient } from "@/lib/supabase/server";
import { getBoard, getGameById, getScoreRank } from "@/lib/supabase/queries";
import type { SavedResult } from "@/lib/types";

export async function saveScoreAction(
  gameId: string,
  playerName: string,
  score: number,
): Promise<({ ok: true } & SavedResult) | { ok: false; error: string }> {
  if (!Number.isInteger(score) || score < 0) {
    return { ok: false, error: "Puntuación inválida." };
  }

  const nameError = validatePlayerName(playerName);
  if (nameError) return { ok: false, error: nameError };

  try {
    if (!(await getGameById(gameId))) {
      return { ok: false, error: "Juego no encontrado." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, player_name: playerName, score });
    if (error) {
      return { ok: false, error: "No se pudo guardar la puntuación." };
    }
  } catch {
    return { ok: false, error: "No se pudo guardar la puntuación." };
  }

  // La puntuación ya está guardada: si solo falla la lectura del ranking, no se
  // devuelve error (un reintento duplicaría la fila); el cliente oculta el
  // ranking cuando `total` es 0.
  try {
    const [board, { rank, total }] = await Promise.all([
      getBoard(gameId),
      getScoreRank(gameId, score),
    ]);
    return { ok: true, board, rank, total };
  } catch {
    return { ok: true, board: [], rank: 0, total: 0 };
  }
}
