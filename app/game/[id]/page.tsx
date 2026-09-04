import { notFound } from "next/navigation";

import { byId } from "@/app/data";

import { FichaJuego } from "./ficha-juego";

export default async function FichaPage({ params }: PageProps<"/juego/[id]">) {
  const { id } = await params;
  const game = byId(id);
  if (!game) notFound();

  return <FichaJuego game={game} />;
}
