"use server";

import { validatePlayerName } from "@/lib/player-name";
import { createClient } from "@/lib/supabase/server";
import {
  getBoard,
  getGameById,
  getProfile,
  getScoreRank,
} from "@/lib/supabase/queries";
import type { SavedResult } from "@/lib/types";

export async function saveScoreAction(
  gameId: string,
  playerName: string,
  score: number,
): Promise<
  ({ ok: true; name: string } & SavedResult) | { ok: false; error: string }
> {
  if (!Number.isInteger(score) || score < 0) {
    return { ok: false, error: "Puntuación inválida." };
  }

  let savedName = playerName;
  try {
    if (!(await getGameById(gameId))) {
      return { ok: false, error: "Juego no encontrado." };
    }

    const supabase = await createClient();

    // Identidad (spec 21): con cuenta y perfil se guarda con SU nombre y su
    // user_id e ignora el nombre del cliente. Sin perfil o sin sesión, se trata
    // como invitado y el trigger de la base reserva los nombres de cuentas.
    const { data: auth } = await supabase.auth.getUser();
    const profile = auth.user ? await getProfile(auth.user.id, supabase) : null;

    let name = playerName;
    if (!profile) {
      const nameError = validatePlayerName(playerName);
      if (nameError) return { ok: false, error: nameError };
    } else {
      name = profile.playerName;
    }

    const { error } = await supabase.from("scores").insert({
      game_id: gameId,
      player_name: name,
      score,
      user_id: profile?.userId ?? null,
    });
    if (error) {
      if (error.message.includes("player_name_reserved")) {
        return {
          ok: false,
          error: "Ese nombre pertenece a un jugador registrado.",
        };
      }
      if (error.message.includes("profile_required")) {
        return { ok: false, error: "Elige tu nombre de jugador para guardar." };
      }
      return { ok: false, error: "No se pudo guardar la puntuación." };
    }

    savedName = name;
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
    return { ok: true, name: savedName, board, rank, total };
  } catch {
    return { ok: true, name: savedName, board: [], rank: 0, total: 0 };
  }
}
