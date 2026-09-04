"use client";

import { useMemo, useState } from "react";

import { CATEGORIES, GAMES } from "@/app/data";
import { GameCard } from "@/components/game-card";
import { useScores } from "@/contexts/scores-context";
import { best } from "@/lib/scores";

export default function BibliotecaPage() {
  const { stored } = useScores();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("Todos");

  const q = query.trim().toLowerCase();
  const games = useMemo(
    () =>
      GAMES.filter(
        (g) =>
          (cat === "Todos" || g.category === cat) &&
          (!q ||
            g.title.toLowerCase().includes(q) ||
            g.desc.toLowerCase().includes(q)),
      ),
    [q, cat],
  );

  return (
    <main className="relative z-10 mx-auto w-full max-w-[1240px] flex-1 animate-fade px-[22px] pb-[90px] pt-14">
      <header className="mb-12 grid justify-items-center gap-[18px] text-center">
        <h1 className="animate-flicker font-display text-[clamp(28px,6vw,62px)] leading-[1.25] text-cian">
          ARCADE
          <br />
          <span className="text-magenta [text-shadow:0_0_12px_rgba(255,0,110,.9),0_0_44px_rgba(255,0,110,.5)]">
            VAULT
          </span>
        </h1>
        <p className="text-[15px] uppercase tracking-[4px] text-amarillo [text-shadow:0_0_12px_rgba(245,255,0,.5)]">
          Inserta una moneda para jugar
        </p>

        <div className="mt-2.5 flex w-full max-w-[720px] flex-wrap justify-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar juego por nombre..."
            aria-label="Buscar juego por nombre"
            className="min-w-0 flex-1 basis-[260px] border border-cian/35 bg-cian/5 px-[18px] py-[15px] text-[15px] tracking-wide text-[#e6f2f5] focus:border-cian focus:shadow-[0_0_22px_rgba(0,245,255,.45)]"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2.5">
          {CATEGORIES.map((c) => {
            const on = cat === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                aria-pressed={on}
                className={`whitespace-nowrap border px-3.5 py-2 text-xs uppercase tracking-[2px] transition-colors hover:border-amarillo hover:text-amarillo ${
                  on
                    ? "border-cian bg-white/5 text-cian"
                    : "border-white/15 text-[#8b98a3]"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(268px,1fr))] gap-[26px]">
        {games.map((g) => (
          <GameCard key={g.id} game={g} best={best(stored, g.id)} />
        ))}
      </div>

      {games.length === 0 ? (
        <div className="mt-10 text-center text-sm uppercase tracking-[2px] text-[#6f7d88]">
          NINGÚN JUEGO COINCIDE CON LA BÚSQUEDA
        </div>
      ) : null}
    </main>
  );
}
