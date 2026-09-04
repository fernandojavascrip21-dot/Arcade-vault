"use client";

import { useScores } from "@/contexts/scores-context";
import { board, rankColor } from "@/lib/scores";

// Panel compacto de mejores marcas (aside de la ficha). Lee las puntuaciones
// del contexto y combina semilla + partidas locales vía `board`.
export function ScoreBoard({ gameId }: { gameId: string }) {
  const { stored } = useScores();
  const rows = board(stored, gameId);

  return (
    <aside className="border border-magenta/30 bg-[rgba(12,10,18,.9)] shadow-[0_0_34px_rgba(255,0,110,.14)]">
      <div className="border-b border-magenta/25 px-5 py-[18px] font-display text-[11px] tracking-wider text-magenta">
        MEJORES PUNTUACIONES
      </div>
      <div className="px-2 pb-4 pt-2.5">
        {rows.map((r, i) => (
          <div
            key={`${r.name}-${r.score}-${i}`}
            className="grid animate-row grid-cols-[34px_1fr_auto] items-center gap-3 border-b border-white/5 px-3 py-[11px]"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <span
              className="font-display text-[10px]"
              style={{ color: rankColor(i) }}
            >
              #{i + 1}
            </span>
            <span className="truncate text-sm text-[#cdd8de]">{r.name}</span>
            <span className="whitespace-nowrap font-display text-[10px] text-amarillo">
              {r.score.toLocaleString("es-ES")}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
