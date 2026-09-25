"use client";

import { useEffect, useState } from "react";

import { getPlayerHistoryAction } from "@/app/hall-of-fame/actions";
import { useSession } from "@/contexts/session-context";
import { rankColor } from "@/lib/scores";
import type { BoardRow, Game, GeneralRow, HistoryRow } from "@/lib/types";

const COLS = "grid-cols-[78px_1fr_130px_118px]";

export function HallOfFame({
  games,
  boards,
  general,
  initialGame,
}: {
  games: Game[];
  boards: Record<string, BoardRow[]>;
  general: GeneralRow[];
  initialGame: string; // id de juego, "general" o "mine"
}) {
  const [tab, setTab] = useState(initialGame);
  const { user } = useSession();

  const me = user ?? "INVITADO";
  const rows = boards[tab] ?? [];

  // "MIS PARTIDAS": el historial se pide al abrir la pestaña (el nombre solo
  // existe en el cliente). `history.name` evita mostrar filas de otro nombre.
  const [history, setHistory] = useState<{
    name: string;
    rows: HistoryRow[];
  } | null>(null);
  const [historyFailed, setHistoryFailed] = useState<string | null>(null);
  const [historyGame, setHistoryGame] = useState("all");

  useEffect(() => {
    if (tab !== "mine" || !user) return;
    let cancelled = false;
    getPlayerHistoryAction(user)
      .then((r) => {
        if (cancelled) return;
        setHistory({ name: user, rows: r });
        setHistoryFailed(null);
      })
      .catch(() => {
        if (!cancelled) setHistoryFailed(user);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, user]);

  const historyLoading =
    !!user && history?.name !== user && historyFailed !== user;
  const gameTitle = (id: string) => games.find((g) => g.id === id)?.title ?? id;
  const historyRows = (history?.name === user ? history.rows : []).filter(
    (r) => historyGame === "all" || r.gameId === historyGame,
  );
  const generalCols = `78px minmax(140px,1fr) repeat(${games.length},92px) 110px`;

  return (
    <main className="relative z-10 mx-auto w-full max-w-[1080px] flex-1 animate-fade px-[22px] pb-[90px] pt-[54px]">
      <h1 className="mb-3 text-center font-display text-[clamp(20px,4.4vw,40px)] leading-[1.4] text-amarillo [text-shadow:0_0_16px_rgba(245,255,0,.55),0_0_50px_rgba(245,255,0,.25)]">
        SALÓN DE LA FAMA
      </h1>
      <p className="mb-8 text-center text-[13px] uppercase tracking-[3px] text-texto-tenue">
        Las diez mejores marcas de cada máquina
      </p>

      <div className="mb-8 flex flex-wrap justify-center gap-2.5">
        {games.map((g) => {
          const on = tab === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setTab(g.id)}
              className={`whitespace-nowrap border px-3.5 py-3 font-display text-[9px] transition-colors hover:border-amarillo hover:text-amarillo ${
                on
                  ? "border-cian bg-foreground/5 text-cian"
                  : "border-foreground/15 text-texto-tenue"
              }`}
            >
              {g.title}
            </button>
          );
        })}
        {[
          { id: "general", label: "GENERAL" },
          { id: "mine", label: "MIS PARTIDAS" },
        ].map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap border px-3.5 py-3 font-display text-[9px] transition-colors hover:border-magenta hover:text-magenta ${
                on
                  ? "border-magenta bg-magenta/10 text-magenta"
                  : "border-foreground/15 text-texto-tenue"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "general" ? (
        <div className="overflow-x-auto border border-magenta/25 bg-background/90 shadow-[0_0_44px_rgba(255,0,110,.12)]">
          <div style={{ minWidth: 78 + 140 + games.length * 92 + 110 + 80 }}>
            <div
              className="grid gap-2.5 border-b border-magenta/20 px-5 py-4 text-[10px] tracking-[2px] text-texto-tenue"
              style={{ gridTemplateColumns: generalCols }}
            >
              <span>RANGO</span>
              <span>JUGADOR</span>
              {games.map((g) => (
                <span
                  key={g.id}
                  className="truncate text-right"
                  title={g.title}
                >
                  {g.title}
                </span>
              ))}
              <span className="text-right">TOTAL</span>
            </div>
            {general.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-texto-tenue">
                Aún no hay puntuaciones guardadas.
              </p>
            ) : null}
            {general.map((r, i) => {
              const isYou = r.name === me;
              const bg = isYou
                ? "bg-magenta/10"
                : i < 3
                  ? "bg-amarillo/[.04]"
                  : "";
              return (
                <div
                  key={r.name}
                  className={`grid animate-row items-center gap-2.5 border-b border-foreground/5 px-5 py-4 ${bg}`}
                  style={{
                    gridTemplateColumns: generalCols,
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  <span
                    className="font-display text-xs"
                    style={{ color: rankColor(i) }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex items-center gap-2.5 overflow-hidden text-[15px] text-foreground">
                    <span className="truncate">{r.name}</span>
                    {isYou ? (
                      <span className="whitespace-nowrap border border-magenta px-1.5 py-1 font-display text-[8px] text-magenta">
                        TÚ
                      </span>
                    ) : null}
                  </span>
                  {games.map((g) => (
                    <span
                      key={g.id}
                      className="text-right font-display text-[10px] text-cian"
                    >
                      {r.byGame[g.id] !== undefined
                        ? r.byGame[g.id].toLocaleString("es-ES")
                        : "—"}
                    </span>
                  ))}
                  <span className="text-right font-display text-[11px] text-amarillo">
                    {r.total.toLocaleString("es-ES")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {tab === "mine" ? (
        <div className="border border-cian/25 bg-background/90 shadow-[0_0_44px_rgba(0,245,255,.12)]">
          {!user ? (
            <p className="px-5 py-10 text-center text-sm text-texto-tenue">
              Guarda una partida con tu nombre (o inicia sesión) para ver aquí
              tu historial.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-cian/20 px-5 py-4">
                <span className="mr-2 font-display text-[10px] text-cian">
                  {user}
                </span>
                {[{ id: "all", title: "TODOS" }, ...games].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setHistoryGame(g.id)}
                    className={`whitespace-nowrap border px-2.5 py-2 font-display text-[8px] transition-colors hover:border-amarillo hover:text-amarillo ${
                      historyGame === g.id
                        ? "border-cian text-cian"
                        : "border-foreground/15 text-texto-tenue"
                    }`}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
              {historyLoading ? (
                <p className="px-5 py-10 text-center text-sm text-texto-tenue">
                  Cargando tus partidas...
                </p>
              ) : historyFailed === user ? (
                <p className="px-5 py-10 text-center text-sm text-magenta">
                  No se pudo cargar tu historial. Vuelve a abrir la pestaña para
                  reintentar.
                </p>
              ) : historyRows.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-texto-tenue">
                  {historyGame === "all"
                    ? "Aún no tienes partidas guardadas con este nombre."
                    : "Aún no tienes partidas guardadas en este juego."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[420px]">
                    {historyRows.map((r, i) => (
                      <div
                        key={`${r.gameId}-${r.score}-${r.date}-${i}`}
                        className="grid animate-row grid-cols-[1fr_130px_118px] items-center gap-2.5 border-b border-foreground/5 px-5 py-3.5"
                        style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                      >
                        <span className="truncate font-display text-[10px] text-foreground">
                          {gameTitle(r.gameId)}
                        </span>
                        <span className="text-right font-display text-[11px] text-amarillo">
                          {r.score.toLocaleString("es-ES")}
                        </span>
                        <span className="text-right text-[13px] text-texto-tenue">
                          {r.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      {tab !== "general" && tab !== "mine" ? (
        <div className="overflow-x-auto border border-cian/25 bg-background/90 shadow-[0_0_44px_rgba(0,245,255,.12)]">
          <div className="min-w-[560px]">
            <div
              className={`grid ${COLS} gap-2.5 border-b border-cian/20 px-5 py-4 text-[10px] tracking-[2px] text-texto-tenue`}
            >
              <span>RANGO</span>
              <span>JUGADOR</span>
              <span className="text-right">PUNTUACIÓN</span>
              <span className="text-right">FECHA</span>
            </div>

            {rows.map((r, i) => {
              const isYou = r.name === me;
              const bg = isYou
                ? "bg-magenta/10"
                : i < 3
                  ? "bg-amarillo/[.04]"
                  : "";
              return (
                <div
                  key={`${r.name}-${r.score}-${i}`}
                  className={`grid ${COLS} animate-row items-center gap-2.5 border-b border-foreground/5 px-5 py-4 ${bg}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span
                    className="font-display text-xs"
                    style={{ color: rankColor(i) }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex items-center gap-2.5 overflow-hidden text-[15px] text-foreground">
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
                  <span className="text-right text-[13px] text-texto-tenue">
                    {r.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <p className="mt-5 text-xs text-texto-debil">
        {
          "// Ranking global compartido: toda puntuación guardada, de invitado o no, se lee desde la misma tabla."
        }
      </p>
    </main>
  );
}
