import { notFound } from "next/navigation";

import { byId } from "@/app/data";

import { SalaJuego } from "./sala-juego";

export default async function SalaPage({ params }: PageProps<"/jugar/[id]">) {
  const { id } = await params;
  const game = byId(id);
  if (!game) notFound();

  return <SalaJuego game={game} />;
}
