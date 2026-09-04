"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { GAMES } from "@/app/data";
import { useScores } from "@/contexts/scores-context";
import { bestPerGame, rankColor, topPlayersGlobal } from "@/lib/scores";
import { useReveal } from "@/lib/use-reveal";

const btnPrimary =
  "animate-pulse-neon inline-flex items-center justify-center whitespace-nowrap border border-cian bg-cian/10 px-[30px] py-5 font-display text-[13px] tracking-wider text-cian transition-colors hover:bg-cian hover:text-[#0a0a0f] active:scale-95";
const btnSecondary =
  "inline-flex items-center justify-center whitespace-nowrap border border-magenta bg-magenta/5 px-[30px] py-5 font-display text-[13px] tracking-wider text-magenta transition-colors hover:bg-magenta/20 active:scale-95";
const btnGhost =
  "inline-flex items-center justify-center whitespace-nowrap border border-white/20 px-6 py-4 font-display text-[11px] tracking-wider text-[#8b98a3] transition-colors hover:border-cian hover:text-cian active:scale-95";

// Envuelve una sección con la animación de aparición al hacer scroll.
function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// Cabecera de sección: kicker numerado + título + línea decorativa.
function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-9 flex items-center gap-[18px]">
      <div className="whitespace-nowrap font-display text-[11px] tracking-[3px] text-magenta [text-shadow:0_0_10px_rgba(255,0,110,.6)]">
        {kicker}
      </div>
      <h2 className="font-display text-[clamp(18px,2.8vw,28px)] tracking-wider text-[#e6e9ff]">
        {title}
      </h2>
      <div className="h-px flex-1 bg-gradient-to-r from-cian/30 to-transparent" />
    </div>
  );
}

// Siluetas pixel decorativas flotando en el hero. Puramente visual, sin datos.
function FloatingSilhouettes() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] opacity-[0.55]"
    >
      <svg
        viewBox="0 0 40 32"
        className="absolute left-[8%] top-[14%] w-20 animate-float text-cian drop-shadow-[0_0_10px_currentColor]"
      >
        <g fill="currentColor">
          <rect x="6" y="4" width="4" height="4" />
          <rect x="30" y="4" width="4" height="4" />
          <rect x="2" y="8" width="36" height="4" />
          <rect x="2" y="12" width="4" height="4" />
          <rect x="14" y="12" width="4" height="4" />
          <rect x="22" y="12" width="4" height="4" />
          <rect x="34" y="12" width="4" height="4" />
          <rect x="2" y="16" width="36" height="4" />
          <rect x="6" y="20" width="4" height="4" />
          <rect x="30" y="20" width="4" height="4" />
        </g>
      </svg>
      <svg
        viewBox="0 0 32 32"
        className="absolute right-[10%] top-[22%] w-[72px] animate-float text-magenta [animation-delay:-1.5s] drop-shadow-[0_0_10px_currentColor]"
      >
        <g fill="currentColor">
          <rect x="8" y="0" width="16" height="4" />
          <rect x="4" y="4" width="24" height="4" />
          <rect x="0" y="8" width="32" height="12" />
          <rect x="0" y="20" width="6" height="6" />
          <rect x="10" y="20" width="4" height="6" />
          <rect x="18" y="20" width="4" height="6" />
          <rect x="26" y="20" width="6" height="6" />
        </g>
      </svg>
      <svg
        viewBox="0 0 32 32"
        className="absolute bottom-[18%] left-[12%] w-[88px] animate-float text-amarillo [animation-delay:-3s] drop-shadow-[0_0_10px_currentColor]"
      >
        <g fill="currentColor">
          <rect x="10" y="0" width="12" height="4" />
          <rect x="6" y="4" width="20" height="4" />
          <rect x="4" y="8" width="6" height="6" />
          <rect x="22" y="8" width="6" height="6" />
          <rect x="2" y="14" width="28" height="10" />
          <rect x="6" y="24" width="4" height="4" />
          <rect x="14" y="24" width="4" height="4" />
          <rect x="22" y="24" width="4" height="4" />
        </g>
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="absolute bottom-[22%] right-[14%] w-[60px] animate-float text-[#00ff88] [animation-delay:-4.5s] drop-shadow-[0_0_10px_currentColor]"
      >
        <g fill="currentColor">
          <rect x="10" y="0" width="4" height="24" />
          <rect x="0" y="10" width="24" height="4" />
          <rect
            x="6"
            y="6"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </g>
      </svg>
      <svg
        viewBox="0 0 36 24"
        className="absolute left-[4%] top-[38%] w-[70px] animate-float text-[#aa00ff] [animation-delay:-2s] drop-shadow-[0_0_10px_currentColor]"
      >
        <g fill="currentColor">
          <rect x="14" y="2" width="8" height="4" />
          <rect x="10" y="6" width="16" height="4" />
          <rect x="4" y="10" width="28" height="4" />
          <rect x="0" y="14" width="36" height="4" />
          <rect x="6" y="18" width="4" height="2" />
          <rect x="16" y="18" width="4" height="2" />
          <rect x="26" y="18" width="4" height="2" />
        </g>
      </svg>
      <svg
        viewBox="0 0 20 20"
        className="absolute left-[46%] top-[8%] w-11 animate-float text-[#ffcf3a] [animation-delay:-3.5s] drop-shadow-[0_0_10px_currentColor]"
      >
        <g fill="currentColor">
          <rect x="6" y="0" width="8" height="2" />
          <rect x="2" y="2" width="16" height="2" />
          <rect x="0" y="4" width="20" height="12" />
          <rect x="2" y="16" width="16" height="2" />
          <rect x="6" y="18" width="8" height="2" />
          <rect x="8" y="4" width="4" height="12" fill="#0a0a0f" />
        </g>
      </svg>
      <svg
        viewBox="0 0 24 22"
        className="absolute bottom-[12%] left-[42%] w-[52px] animate-float text-[#ff3060] [animation-delay:-1s] drop-shadow-[0_0_10px_currentColor]"
      >
        <g fill="currentColor">
          <rect x="2" y="2" width="6" height="2" />
          <rect x="16" y="2" width="6" height="2" />
          <rect x="0" y="4" width="10" height="4" />
          <rect x="14" y="4" width="10" height="4" />
          <rect x="0" y="8" width="24" height="4" />
          <rect x="2" y="12" width="20" height="2" />
          <rect x="4" y="14" width="16" height="2" />
          <rect x="6" y="16" width="12" height="2" />
          <rect x="8" y="18" width="8" height="2" />
          <rect x="10" y="20" width="4" height="2" />
        </g>
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="absolute right-[4%] top-1/2 w-[60px] animate-float text-[#00d4ff] [animation-delay:-5s] drop-shadow-[0_0_10px_currentColor]"
      >
        <g fill="currentColor">
          <rect x="8" y="2" width="8" height="6" />
          <rect x="2" y="8" width="20" height="8" />
          <rect x="8" y="16" width="8" height="6" />
          <rect x="11" y="6" width="2" height="2" fill="#0a0a0f" />
          <rect x="11" y="16" width="2" height="2" fill="#0a0a0f" />
          <rect x="4" y="11" width="2" height="2" fill="#0a0a0f" />
          <rect x="18" y="11" width="2" height="2" fill="#0a0a0f" />
        </g>
      </svg>
    </div>
  );
}

type FeatureKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

function FeatureIcon({ kind }: { kind: FeatureKind }) {
  if (kind === "GAMEPAD")
    return (
      <svg viewBox="0 0 16 16" className="h-11 w-11 drop-shadow-[0_0_8px_currentColor]">
        <g fill="currentColor">
          <rect x="2" y="6" width="12" height="6" />
          <rect x="0" y="8" width="2" height="4" />
          <rect x="14" y="8" width="2" height="4" />
          <rect x="3" y="8" width="2" height="2" />
          <rect x="11" y="7" width="1.5" height="1.5" />
          <rect x="11" y="10" width="1.5" height="1.5" />
        </g>
      </svg>
    );
  if (kind === "FREE")
    return (
      <svg viewBox="0 0 16 16" className="h-11 w-11 drop-shadow-[0_0_8px_currentColor]">
        <g fill="currentColor">
          <rect
            x="3"
            y="3"
            width="10"
            height="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect x="5" y="6" width="1.5" height="4" />
          <rect x="5" y="6" width="4" height="1.5" />
          <rect x="5" y="8" width="3" height="1" />
          <rect x="10" y="6" width="1.5" height="4" />
        </g>
      </svg>
    );
  if (kind === "TROPHY")
    return (
      <svg viewBox="0 0 16 16" className="h-11 w-11 drop-shadow-[0_0_8px_currentColor]">
        <g fill="currentColor">
          <rect x="3" y="2" width="10" height="2" />
          <rect x="3" y="2" width="2" height="6" />
          <rect x="11" y="2" width="2" height="6" />
          <rect x="5" y="8" width="6" height="2" />
          <rect x="7" y="10" width="2" height="3" />
          <rect x="5" y="13" width="6" height="1.5" />
          <rect x="1" y="3" width="2" height="3" />
          <rect x="13" y="3" width="2" height="3" />
        </g>
      </svg>
    );
  return (
    <svg viewBox="0 0 16 16" className="h-11 w-11 drop-shadow-[0_0_8px_currentColor]">
      <g fill="currentColor">
        <rect x="7" y="1" width="2" height="2" />
        <rect x="6" y="3" width="4" height="2" />
        <rect x="5" y="5" width="6" height="6" />
        <rect x="4" y="11" width="2" height="2" />
        <rect x="10" y="11" width="2" height="2" />
        <rect x="7" y="6" width="2" height="2" fill="#0a0a0f" />
        <rect x="6" y="13" width="1" height="2" />
        <rect x="9" y="13" width="1" height="2" />
      </g>
    </svg>
  );
}

const FEATURES: {
  icon: FeatureKind;
  title: string;
  desc: string;
  color: string;
}[] = [
  {
    icon: "GAMEPAD",
    title: "JUEGOS CLÁSICOS",
    desc: "Rompemuros, Bloques, Serpiente y muchos más. Los mejores arcades de siempre en un solo lugar.",
    color: "text-cian",
  },
  {
    icon: "FREE",
    title: "100% GRATIS",
    desc: "Sin suscripciones, sin pagos ocultos. Todos los juegos disponibles de forma gratuita.",
    color: "text-amarillo",
  },
  {
    icon: "TROPHY",
    title: "LADDER BOARDS",
    desc: "Compite con otros jugadores. Escala el ranking y demuestra quién es el mejor.",
    color: "text-magenta",
  },
  {
    icon: "ROCKET",
    title: "SIEMPRE CRECIENDO",
    desc: "Agregamos nuevos juegos constantemente. Vuelve seguido, siempre habrá algo nuevo que jugar.",
    color: "text-[#00ff88]",
  },
];

export default function HomePage() {
  const { stored } = useScores();
  const ticker = bestPerGame(stored).filter(
    (entry): entry is { game: (typeof GAMES)[number]; row: NonNullable<typeof entry.row> } =>
      Boolean(entry.row),
  );
  const topPlayers = topPlayersGlobal(stored, 5);
  const topScore = topPlayers[0]?.score ?? 1;

  return (
    <main className="relative z-10 flex-1 animate-fade">
      {/* HERO */}
      <section className="relative flex min-h-[calc(100vh-60px)] items-center justify-center overflow-hidden px-[22px] py-16">
        <FloatingSilhouettes />
        <div className="relative z-[3] mx-auto max-w-[1100px] text-center">
          <div className="mb-6 font-display text-[11px] uppercase tracking-[4px] text-amarillo [text-shadow:0_0_10px_rgba(245,255,0,.5)]">
            ▸ INSERTA UNA MONEDA
            <span className="animate-caret">_</span>
          </div>
          <h1 className="flex flex-col gap-2 font-display text-[clamp(30px,7vw,80px)] leading-[1.1] tracking-wider">
            <span className="text-white drop-shadow-[0_0_14px_rgba(255,255,255,.35)]">
              EL ARCADE
            </span>
            <span className="bg-gradient-to-b from-cian to-[#4dd0e1] bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(0,245,255,.4)]">
              CLÁSICO ESTÁ
            </span>
            <span className="bg-gradient-to-b from-magenta to-[#ff6b9e] bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(255,0,110,.4)]">
              DE VUELTA
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-[640px] text-[15px] leading-[1.7] tracking-wide text-[#8a8fb5]">
            Juega los mejores clásicos directamente en tu navegador.
            <br />
            Sin descargas. Sin costo. Solo diversión.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link href="/games" className={btnPrimary}>
              ▶ EXPLORAR JUEGOS
            </Link>
            <Link href="/auth" className={btnSecondary}>
              ✦ CREAR CUENTA
            </Link>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 font-display text-[9px] tracking-[3px] text-[#4a4f70]">
          <span>DESLIZA</span>
          <span className="animate-bounce text-cian">▼</span>
        </div>
      </section>

      {/* WHY */}
      <Reveal className="mx-auto max-w-[1240px] px-[22px] py-16">
        <SectionHead kicker="// 01" title="¿POR QUÉ ARCADE VAULT?" />
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`flex flex-col gap-3.5 border border-white/10 bg-gradient-to-b from-[rgba(16,18,28,.9)] to-[rgba(9,9,14,.9)] p-6 transition-transform hover:-translate-y-1.5 ${f.color}`}
            >
              <FeatureIcon kind={f.icon} />
              <div className="font-display text-xs tracking-wider drop-shadow-[0_0_8px_currentColor]">
                {f.title}
              </div>
              <div className="text-[13px] leading-[1.6] text-[#8a8fb5]">
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* GAMES PREVIEW */}
      <Reveal className="mx-auto max-w-[1240px] px-[22px] py-16">
        <SectionHead kicker="// 02" title="JUEGOS DISPONIBLES AHORA" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {GAMES.map((g) => (
            <Link
              key={g.id}
              href={`/juego/${g.id}`}
              className="group border border-white/10 bg-[#0f0f18] transition-transform hover:-translate-y-1 hover:border-cian"
            >
              <div className={`cover-${g.id} relative aspect-square overflow-hidden`} />
              <div className="p-2.5">
                <div className="truncate font-display text-[10px] tracking-wide text-[#e6e9ff]">
                  {g.title}
                </div>
                <div className="mt-1 truncate text-[10px] tracking-[2px] text-[#4a4f70]">
                  {g.category}
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href="/games" className={btnGhost}>
            VER TODOS LOS JUEGOS →
          </Link>
        </div>
      </Reveal>

      {/* STATS */}
      <Reveal className="border-y border-cian/20 bg-gradient-to-b from-[#06060a] to-[#0c0c14] px-[22px] py-14">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            { n: String(GAMES.length), u: "JUEGOS", s: "Y CONTANDO" },
            { n: "MILES", u: "DE PARTIDAS", s: "JUGADAS CADA DÍA" },
            { n: "GLOBAL", u: "RANKING", s: "COMPITE CON EL MUNDO" },
          ].map((st, i) => (
            <div
              key={st.u}
              className={`grid gap-2.5 py-2 text-center sm:border-l sm:border-cian/20 ${
                i === 0 ? "sm:border-l-0" : ""
              }`}
            >
              <div className="font-display text-[clamp(30px,5vw,52px)] text-amarillo [text-shadow:0_0_16px_rgba(245,255,0,.4)]">
                {st.n}
              </div>
              <div className="font-display text-[13px] tracking-[3px] text-[#e6e9ff]">
                {st.u}
              </div>
              <div className="text-[11px] uppercase tracking-[2px] text-[#4a4f70]">
                {st.s}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* LIVE ACTIVITY */}
      <Reveal className="mx-auto max-w-[1240px] px-[22px] py-16">
        <SectionHead kicker="// 03" title="ACTIVIDAD EN VIVO" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="border border-cian/25 bg-[rgba(12,14,20,.9)]">
            <div className="border-b border-cian/20 px-5 py-[18px] font-display text-[11px] tracking-wider text-cian">
              ▸ ÚLTIMAS PUNTUACIONES
            </div>
            <div className="px-2 pb-3 pt-2">
              {ticker.map(({ game, row }, i) => (
                <div
                  key={game.id}
                  className="grid animate-row grid-cols-[1fr_auto] items-center gap-2 border-b border-white/5 px-3 py-3 sm:grid-cols-[100px_1fr_auto_auto]"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="truncate font-display text-[10px] text-amarillo">
                    {row.name}
                  </span>
                  <span className="hidden truncate text-[12px] text-[#8a8fb5] sm:block">
                    ▸ {game.title}
                  </span>
                  <span className="whitespace-nowrap font-display text-[11px] text-cian">
                    {row.score.toLocaleString("es-ES")}
                  </span>
                  <span className="hidden whitespace-nowrap text-[10px] text-[#4a4f70] sm:block">
                    {row.date}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-magenta/25 bg-[rgba(12,10,18,.9)]">
            <div className="flex items-center justify-between border-b border-magenta/20 px-5 py-[18px]">
              <div className="font-display text-[11px] tracking-wider text-magenta">
                ▸ TOP JUGADORES
              </div>
              <Link
                href="/salon-fama"
                className="whitespace-nowrap text-[10px] uppercase tracking-[2px] text-[#8a8fb5] transition-colors hover:text-cian"
              >
                VER SALÓN →
              </Link>
            </div>
            <div className="grid gap-1 px-4 py-4">
              {topPlayers.map((row, i) => (
                <div
                  key={`${row.name}-${row.score}-${i}`}
                  className="grid animate-row grid-cols-[34px_1fr_auto] items-center gap-3 py-2"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span
                    className="font-display text-[10px]"
                    style={{ color: rankColor(i) }}
                  >
                    #{String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="h-1.5 overflow-hidden bg-white/5">
                    <span
                      className="block h-full bg-cian/60"
                      style={{ width: `${(row.score / topScore) * 100}%` }}
                    />
                  </span>
                  <span className="whitespace-nowrap font-display text-[11px] text-[#e6e9ff]">
                    {row.score.toLocaleString("es-ES")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* PRICING */}
      <Reveal className="mx-auto max-w-[1240px] px-[22px] py-16">
        <SectionHead kicker="// 04" title="PRECIOS" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="relative border border-cian bg-[rgba(12,14,20,.9)] p-8 shadow-[0_0_30px_rgba(0,245,255,.18)]">
            <div className="font-display text-[10px] tracking-[3px] text-[#4a4f70]">
              PLAN ÚNICO
            </div>
            <div className="mt-1.5 font-display text-base tracking-wider text-[#e6e9ff]">
              JUGADOR VAULT
            </div>
            <div className="mt-5 flex items-end gap-2">
              <span className="font-display text-[40px] text-amarillo [text-shadow:0_0_16px_rgba(245,255,0,.4)]">
                $0
              </span>
              <span className="mb-1.5 text-xs uppercase tracking-[2px] text-[#4a4f70]">
                / siempre
              </span>
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-[2px] text-[#8a8fb5]">
              Sin trucos · sin letra pequeña
            </div>
            <ul className="mt-6 grid gap-2.5 text-sm text-[#cdd8de]">
              <li>✔ Acceso a todos los juegos</li>
              <li>✔ Ranking global y salón de la fama</li>
              <li>✔ Sin anuncios entre partidas</li>
              <li>✔ Guarda tus puntuaciones</li>
              <li>✔ Nuevos juegos cada mes</li>
              <li>✔ Funciona en cualquier navegador</li>
            </ul>
            <Link href="/auth" className={`${btnPrimary} mt-7 w-full`}>
              EMPEZAR GRATIS →
            </Link>
            <div className="mt-3 text-center text-[11px] text-[#4a4f70]">
              No pedimos tarjeta. Nunca lo haremos.
            </div>
          </div>

          <div className="grid gap-5">
            <div>
              <div className="font-display text-xs tracking-wider text-[#e6e9ff]">
                ¿REALMENTE ES GRATIS?
              </div>
              <p className="mt-2 text-sm leading-[1.7] text-[#8a8fb5]">
                Sí. Arcade Vault es un proyecto sin fines de lucro hecho por
                amor a los clásicos. No hay versión &quot;premium&quot;
                escondida.
              </p>
            </div>
            <div>
              <div className="font-display text-xs tracking-wider text-[#e6e9ff]">
                ¿NECESITO CREAR CUENTA?
              </div>
              <p className="mt-2 text-sm leading-[1.7] text-[#8a8fb5]">
                No. Puedes jugar como invitado. Si quieres guardar tu
                puntuación y aparecer en el ranking, regístrate en 10
                segundos.
              </p>
            </div>
            <div>
              <div className="font-display text-xs tracking-wider text-[#e6e9ff]">
                ¿CÓMO SOBREVIVEN SIN COBRAR?
              </div>
              <p className="mt-2 text-sm leading-[1.7] text-[#8a8fb5]">
                Es un proyecto comunitario. Si te gusta, compártelo. Esa es
                toda la moneda que aceptamos.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* FINAL CTA */}
      <Reveal className="mx-auto max-w-[900px] px-[22px] py-24 text-center">
        <h2 className="bg-gradient-to-b from-white to-amarillo bg-clip-text font-display text-[clamp(22px,4vw,40px)] tracking-wider text-transparent drop-shadow-[0_0_12px_rgba(245,255,0,.4)]">
          ¿LISTO PARA JUGAR?
        </h2>
        <Link
          href="/games"
          className={`${btnPrimary} mt-9 inline-flex px-11 py-6 text-sm`}
        >
          INSERTAR MONEDA →
        </Link>
        <div className="mt-7 text-[13px] tracking-wide text-[#8a8fb5]">
          Gratis. Sin registro obligatorio. Empieza en segundos.
        </div>
      </Reveal>
    </main>
  );
}
