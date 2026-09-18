import { GamesClient } from "@/app/games/games-client";
import { getBestPerGame } from "@/lib/supabase/queries";

export default async function BibliotecaPage() {
  const bestPerGame = await getBestPerGame();
  const games = bestPerGame.map(({ game }) => game);
  const bestMap = Object.fromEntries(
    bestPerGame.map(({ game, row }) => [
      game.id,
      row ? row.score.toLocaleString("es-ES") : "—",
    ]),
  );

  return <GamesClient games={games} bestMap={bestMap} />;
}
