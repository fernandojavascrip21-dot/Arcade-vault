"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveScoreAction(
  gameId: string,
  playerName: string,
  score: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(score) || score < 0) {
    return { ok: false, error: "Puntuación inválida." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, player_name: playerName, score });
    if (error) {
      return { ok: false, error: "No se pudo guardar la puntuación." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo guardar la puntuación." };
  }
}
