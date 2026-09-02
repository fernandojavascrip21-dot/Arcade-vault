"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CrtFrame } from "@/components/crt-frame";
import { ScoreBoard } from "@/components/score-board";
import { useCredits } from "@/contexts/credits-context";
import { useScores } from "@/contexts/scores-context";
import { best } from "@/lib/scores";
import type { Game } from "@/lib/types";

export function FichaJuego({ game }: { game: Game }) {
  const router = useRouter();
  const { spendCredit } = useCredits();
  const { stored } = useScores();

  // Consume un crédito; solo entra a la sala si había crédito. El aviso
  // ("INSERTA UNA MONEDA") lo muestra el contexto de créditos.
  const play = () => {
    if (spendCredit()) router.push(`/jugar/${game.id}`);
  };

  return (
    <main className="relative z-10 mx-auto w-full max-w-[1160px] flex-1 animate-fade px-[22px] pb-[90px] pt-12">
      <Link
        href="/"
        className="mb-6 inline-block text-xs uppercase tracking-[2px] text-[#6f7d88] transition-colors hover:text-cian"
      >
        &lt;&lt; Volver al Vault
      </Link>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-8">
        <section className="grid gap-[22px]">
          <CrtFrame background={game.thumb} />

          <h1 className="font-display text-[clamp(22px,4vw,38px)] leading-[1.35] text-cian [text-shadow:0_0_14px_rgba(0,245,255,.7),0_0_46px_rgba(0,245,255,.3)]">
            {game.title}
          </h1>

          <div className="flex flex-wrap gap-2.5">
            <span className="whitespace-nowrap border border-magenta/50 px-2.5 py-2 font-display text-[9px] text-magenta">
              {game.category}
            </span>
            <span className="whitespace-nowrap border border-amarillo/50 px-2.5 py-2 font-display text-[9px] text-amarillo">
              MEJOR: {best(stored, game.id)}
            </span>
          </div>

          <p className="max-w-[56ch] text-pretty text-base leading-[1.75] text-[#9aa7b2]">
            {game.long}
          </p>

          <div className="mt-1.5 flex flex-wrap gap-3.5">
            <button
              type="button"
              onClick={play}
              className="animate-pulse-neon whitespace-nowrap border border-cian bg-cian/10 px-[30px] py-5 font-display text-[13px] text-cian transition-colors hover:bg-cian hover:text-[#0a0a0f] active:scale-95"
            >
              JUGAR AHORA
            </button>
            <Link
              href="/"
              className="whitespace-nowrap border border-white/20 px-[30px] py-5 font-display text-[13px] text-[#8b98a3] transition-colors hover:border-magenta hover:text-magenta active:scale-95"
            >
              VOLVER AL VAULT
            </Link>
          </div>
        </section>

        <ScoreBoard gameId={game.id} />
      </div>
    </main>
  );
}
