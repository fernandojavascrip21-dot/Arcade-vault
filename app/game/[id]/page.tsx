import { notFound } from "next/navigation";

import { getBoard, getGameById } from "@/lib/supabase/queries";

import { GameDetail } from "./game-detail";

export default async function GamePage({ params }: PageProps<"/game/[id]">) {
  const { id } = await params;
  const game = await getGameById(id);
  if (!game) notFound();

  const boardRows = await getBoard(game.id);
  const best = boardRows[0] ? boardRows[0].score.toLocaleString("es-ES") : "—";

  return <GameDetail game={game} best={best} boardRows={boardRows} />;
}
