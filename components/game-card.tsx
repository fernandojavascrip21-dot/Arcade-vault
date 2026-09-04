import Link from "next/link";
import type { CSSProperties } from "react";

import { GameCover } from "@/components/game-cover";
import type { Game } from "@/lib/types";

const stripes: CSSProperties = {
  background:
    "repeating-linear-gradient(135deg, rgba(0,0,0,.28) 0 6px, rgba(0,0,0,0) 6px 12px)",
};

// Tarjeta del catálogo. Toda la tarjeta enlaza a la ficha del juego.
export function GameCard({ game, best }: { game: Game; best: string }) {
  return (
    <Link
      href={`/juego/${game.id}`}
      className="group grid grid-rows-[auto_1fr] border border-cian/25 bg-[linear-gradient(180deg,rgba(16,18,28,.95),rgba(9,9,14,.95))] transition duration-200 hover:-translate-y-2 hover:border-cian hover:shadow-[0_0_30px_rgba(0,245,255,.4),0_24px_50px_rgba(0,0,0,.6)]"
    >
      <div
        className="relative aspect-[16/10] overflow-hidden border-b border-cian/20"
        style={{ background: game.thumb }}
      >
        <div className="absolute inset-0">
          <GameCover id={game.id} />
        </div>
        <div className="absolute inset-0" style={stripes} />
        <div className="absolute left-2.5 top-2.5 whitespace-nowrap bg-black/60 px-2 py-1.5 font-display text-[8px] tracking-wider text-amarillo">
          {game.category}
        </div>
      </div>

      <div className="grid content-start gap-3.5 p-5">
        <h3 className="font-display text-sm leading-normal text-[#e9f6f9]">
          {game.title}
        </h3>
        <p className="text-sm leading-normal text-[#8b98a3]">{game.desc}</p>
        <div className="flex items-center justify-between gap-2.5 border border-dashed border-amarillo/35 bg-amarillo/5 px-2.5 py-2">
          <span className="whitespace-nowrap text-[10px] uppercase tracking-[2px] text-[#b9bf6a]">
            Mejor puntuación
          </span>
          <span className="whitespace-nowrap font-display text-[11px] text-amarillo">
            {best}
          </span>
        </div>
        <div className="mt-1 border border-cian/50 p-3.5 text-center font-display text-[11px] tracking-wider text-cian transition-colors group-hover:bg-cian/15 group-hover:text-white">
          JUGAR
        </div>
      </div>
    </Link>
  );
}
