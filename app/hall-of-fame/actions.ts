"use server";

import { normalizePlayerName, validatePlayerName } from "@/lib/player-name";
import { getPlayerHistory } from "@/lib/supabase/queries";
import type { HistoryRow } from "@/lib/types";

// El nombre solo existe en el cliente (localStorage), por eso el historial se
// pide desde aquí al abrir la pestaña "MIS PARTIDAS" en vez de en page.tsx.
// Devuelve [] si el nombre es inválido o la consulta falla.
export async function getPlayerHistoryAction(
  name: string,
): Promise<HistoryRow[]> {
  const normalized = normalizePlayerName(name);
  if (validatePlayerName(normalized)) return [];

  try {
    return await getPlayerHistory(normalized);
  } catch {
    return [];
  }
}
