"use client";

import { useState } from "react";

import { GAMES } from "@/app/data";
import { useScores } from "@/contexts/scores-context";
import { useSession } from "@/contexts/session-context";
import { board, rankColor } from "@/lib/scores";

const COLS = "grid-cols-[78px_1fr_130px_118px]";

export function SalonFama({ initialGame }: { initialGame: string }) {
  const [tab, setTab] = useState(initialGame);
  const { stored } = useScores();
  const { user } = useSession();

  const me = user ?? "INVITADO";
  const rows = board(stored, tab);

  return (
    <main className="relative z-10 mx-auto w-full max-w-[1080px] flex-1 animate-fade px-[22px] pb-[90px] pt-[54px]">
      <h1 className="mb-3 text-center font-display text-[clamp(20px,4.4vw,40px)] leading-[1.4] text-amarillo [text-shadow:0_0_16px_rgba(245,255,0,.55),0_0_50px_rgba(245,255,0,.25)]">
        SALÓN DE LA FAMA
      </h1>
      <p className="mb-8 text-center text-[13px] uppercase tracking-[3px] text-[#6f7d88]">
        Las diez mejores marcas de cada máquina
      </p>

      <div className="mb-8 flex flex-wrap justify-center gap-2.5">
        {GAMES.map((g) => {
          const on = tab === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setTab(g.id)}
              className={`whitespace-nowrap border px-3.5 py-3 font-display text-[9px] transition-colors hover:border-amarillo hover:text-amarillo ${
                on
                  ? "border-cian bg-white/5 text-cian"
                  : "border-white/15 text-[#8b98a3]"
              }`}
            >
              {g.title}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto border border-cian/25 bg-[rgba(9,10,16,.92)] shadow-[0_0_44px_rgba(0,245,255,.12)]">
        <div className="min-w-[560px]">
          <div
            className={`grid ${COLS} gap-2.5 border-b border-cian/20 px-5 py-4 text-[10px] tracking-[2px] text-[#6f7d88]`}
          >
            <span>RANGO</span>
            <span>JUGADOR</span>
            <span className="text-right">PUNTUACIÓN</span>
            <span className="text-right">FECHA</span>
          </div>

          {rows.map((r, i) => {
            const isYou = r.mine && r.name === me;
            const bg = isYou
              ? "bg-magenta/10"
              : i < 3
                ? "bg-amarillo/[.04]"
                : "";
            return (
              <div
                key={`${r.name}-${r.score}-${i}`}
                className={`grid ${COLS} animate-row items-center gap-2.5 border-b border-white/5 px-5 py-4 ${bg}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span
                  className="font-display text-xs"
                  style={{ color: rankColor(i) }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex items-center gap-2.5 overflow-hidden text-[15px] text-[#dbe5ea]">
                  {r.name}
                  {isYou ? (
                    <span className="whitespace-nowrap border border-magenta px-1.5 py-1 font-display text-[8px] text-magenta">
                      TU MEJOR MARCA
                    </span>
                  ) : null}
                </span>
                <span className="text-right font-display text-[11px] text-amarillo">
                  {r.score.toLocaleString("es-ES")}
                </span>
                <span className="text-right text-[13px] text-[#6f7d88]">
                  {r.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-5 text-xs text-[#3b454e]">
        {"// Puntuaciones de invitado en localStorage. Las cuentas autenticadas leerían el ranking global desde la API."}
      </p>
    </main>
  );
}
