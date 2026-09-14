import { byId, GAMES } from "@/app/data";

import { HallOfFame } from "./hall-of-fame";

export default async function HallOfFamePage({
  searchParams,
}: PageProps<"/hall-of-fame">) {
  const { game } = await searchParams;
  const initial =
    typeof game === "string" && byId(game) ? game : GAMES[0].id;

  return <HallOfFame initialGame={initial} />;
}
