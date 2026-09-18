import { HomeClient } from "@/app/home-client";
import { getBestPerGame, getTopPlayersGlobal } from "@/lib/supabase/queries";
import type { BoardRow, Game } from "@/lib/types";

export default async function HomePage() {
  const bestPerGame = await getBestPerGame();
  const games = bestPerGame.map(({ game }) => game);
  const ticker = bestPerGame.filter(
    (entry): entry is { game: Game; row: BoardRow } => Boolean(entry.row),
  );
  const topPlayers = await getTopPlayersGlobal(5);

  return <HomeClient games={games} ticker={ticker} topPlayers={topPlayers} />;
}
