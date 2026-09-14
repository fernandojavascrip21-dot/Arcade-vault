import { notFound } from "next/navigation";

import { byId } from "@/app/data";

import { GameDetail } from "./game-detail";

export default async function GamePage({ params }: PageProps<"/game/[id]">) {
  const { id } = await params;
  const game = byId(id);
  if (!game) notFound();

  return <GameDetail game={game} />;
}
