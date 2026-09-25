import Link from "next/link";

import { rankColor } from "@/lib/scores";
import type { BoardRow, SavedResult } from "@/lib/types";

const ROW =
  "grid grid-cols-[34px_1fr_auto] items-center gap-3 border-b border-foreground/5 px-3 py-[9px] text-left";

function Row({
  rank,
  row,
  you,
  delay,
}: {
  rank: number;
  row: BoardRow;
  you: boolean;
  delay: number;
}) {
  return (
    <div
      className={`${ROW} animate-row ${you ? "bg-magenta/10" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        className="font-display text-[10px]"
        style={{ color: rankColor(rank - 1) }}
      >
        #{rank}
      </span>
      <span className="flex items-center gap-2 overflow-hidden text-sm text-foreground">
        <span className="truncate">{row.name}</span>
        {you ? (
          <span className="whitespace-nowrap border border-magenta px-1.5 py-0.5 font-display text-[8px] text-magenta">
            TÚ
          </span>
        ) : null}
      </span>
      <span className="whitespace-nowrap font-display text-[10px] text-amarillo">
        {row.score.toLocaleString("es-ES")}
      </span>
    </div>
  );
}

// Top 10 del juego recién jugado con la fila del jugador resaltada; si quedó
// fuera del top 10, añade una fila aparte con su puesto real (spec 12).
export function GameOverRanking({
  result,
  name,
  score,
}: {
  result: SavedResult;
  name: string;
  score: number;
}) {
  // Sin datos (falló solo la lectura del ranking tras guardar): no se muestra.
  if (result.total === 0) return null;

  const youIndex = result.board.findIndex(
    (r) => r.name === name && r.score === score,
  );

  return (
    <div className="grid w-full gap-3">
      <div className="font-display text-[11px] tracking-wider text-cian">
        PUESTO #{result.rank} DE {result.total.toLocaleString("es-ES")}
      </div>
      <div className="border border-magenta/30 bg-background/90">
        {result.board.map((r, i) => (
          <Row
            key={`${r.name}-${r.score}-${i}`}
            rank={i + 1}
            row={r}
            you={i === youIndex}
            delay={i * 35}
          />
        ))}
        {youIndex === -1 ? (
          <>
            <div className="py-1 text-center text-[10px] tracking-[3px] text-[#6f7d88]">
              ···
            </div>
            <Row
              rank={result.rank}
              row={{ name, score, date: "" }}
              you
              delay={result.board.length * 35}
            />
          </>
        ) : null}
      </div>
      <Link
        href="/hall-of-fame?game=general"
        className="whitespace-nowrap font-display text-[9px] text-amarillo underline-offset-4 hover:underline"
      >
        VER RANKING GENERAL
      </Link>
    </div>
  );
}
