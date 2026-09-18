import { notFound } from "next/navigation";

import { getGameById } from "@/lib/supabase/queries";

import { PlayRoom } from "./play-room";

export default async function PlayPage({ params }: PageProps<"/play/[id]">) {
  const { id } = await params;
  const game = await getGameById(id);
  if (!game) notFound();

  return <PlayRoom game={game} />;
}
