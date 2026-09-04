import { byId, GAMES } from "@/app/data";

import { SalonFama } from "./salon-fama";

export default async function SalonFamaPage({
  searchParams,
}: PageProps<"/salon-fama">) {
  const { game } = await searchParams;
  const initial =
    typeof game === "string" && byId(game) ? game : GAMES[0].id;

  return <SalonFama initialGame={initial} />;
}
