import { notFound } from "next/navigation";

import { byId } from "@/app/data";

import { PlayRoom } from "./play-room";

export default async function PlayPage({ params }: PageProps<"/play/[id]">) {
  const { id } = await params;
  const game = byId(id);
  if (!game) notFound();

  return <PlayRoom game={game} />;
}
