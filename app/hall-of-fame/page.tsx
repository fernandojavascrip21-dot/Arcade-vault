import {
  getBoardsForGames,
  getGames,
  getGeneralBoard,
} from "@/lib/supabase/queries";

import { HallOfFame } from "./hall-of-fame";

export default async function HallOfFamePage({
  searchParams,
}: PageProps<"/hall-of-fame">) {
  const { game } = await searchParams;
  const games = await getGames();
  const [boards, general] = await Promise.all([
    getBoardsForGames(games.map((g) => g.id)),
    getGeneralBoard(),
  ]);
  // `game` acepta un id de juego o las vistas reservadas "general" y "mine".
  const initial =
    typeof game === "string" &&
    (game === "general" || game === "mine" || games.some((g) => g.id === game))
      ? game
      : games[0].id;

  return (
    <HallOfFame
      games={games}
      boards={boards}
      general={general}
      initialGame={initial}
    />
  );
}
