import { getBoardsForGames, getGames } from "@/lib/supabase/queries";

import { HallOfFame } from "./hall-of-fame";

export default async function HallOfFamePage({
  searchParams,
}: PageProps<"/hall-of-fame">) {
  const { game } = await searchParams;
  const games = await getGames();
  const boards = await getBoardsForGames(games.map((g) => g.id));
  const initial =
    typeof game === "string" && games.some((g) => g.id === game)
      ? game
      : games[0].id;

  return <HallOfFame games={games} boards={boards} initialGame={initial} />;
}
