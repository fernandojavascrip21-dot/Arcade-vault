"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import { NavBar } from "@/components/nav-bar";
import { useCredits } from "@/contexts/credits-context";

const gridStyle: CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(0,245,255,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,110,.08) 1px, transparent 1px)",
  backgroundSize: "100% 60px, 60px 100%",
  maskImage:
    "linear-gradient(to bottom, transparent, #000 35%, #000 65%, transparent)",
  WebkitMaskImage:
    "linear-gradient(to bottom, transparent, #000 35%, #000 65%, transparent)",
};

const glowStyle: CSSProperties = {
  background:
    "radial-gradient(ellipse at 50% 0%, rgba(255,0,110,.16), transparent 60%)",
};

const scanlinesStyle: CSSProperties = {
  background:
    "repeating-linear-gradient(to bottom, rgba(0,0,0,.42) 0 1px, rgba(0,0,0,0) 1px 3px)",
};

// "Chrome" del contenedor de la maqueta: capas de fondo fijas, barra de
// navegación, aviso de moneda y footer. Las páginas renderizan su propio <main>.
export function SiteChrome({ children }: { children: ReactNode }) {
  const { coinMsg } = useCredits();
  const isPlay = usePathname().startsWith("/play/");
  // En /play con el móvil en horizontal, footer y aviso de moneda se ocultan
  // para que la sala quepa en el alto de la pantalla (spec 14).
  const hideInLandscape = isPlay ? "mobile-landscape:hidden" : "";
  // En /play en escritorio (spec 15) la sala ocupa justo el alto de la
  // ventana: contenedor a 100dvh, contenido encogible y sin footer. El
  // contenido es una rejilla (no flex): con el alto heredado de una cadena
  // flex anidada, Chrome resuelve `cqh` a 0 dentro de <main>.
  const playRoot = isPlay ? "desktop:h-dvh" : "";
  const playContent = isPlay
    ? "desktop:grid desktop:min-h-0 desktop:grid-rows-[minmax(0,1fr)]"
    : "";
  const playFooter = isPlay ? "desktop:hidden" : "";

  return (
    <div
      className={`relative flex min-h-screen flex-1 flex-col overflow-x-hidden ${playRoot}`}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 animate-grid"
        style={gridStyle}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -inset-x-[30%] -top-[20%] bottom-[40%] z-0"
        style={glowStyle}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60] opacity-[.55]"
        style={scanlinesStyle}
      />

      <NavBar />

      {coinMsg ? (
        <div
          className={`fixed right-[22px] top-[74px] z-50 animate-fade whitespace-nowrap border border-amarillo bg-background/95 px-3.5 py-3 font-display text-[10px] tracking-wider text-amarillo shadow-[0_0_26px_rgba(245,255,0,.4)] ${hideInLandscape}`}
        >
          {coinMsg}
        </div>
      ) : null}

      <div className={`relative z-10 flex flex-1 flex-col ${playContent}`}>
        {children}
      </div>

      <footer
        className={`relative z-10 border-t border-foreground/10 px-[22px] pb-10 pt-[26px] text-center text-[11px] tracking-[3px] text-texto-debil ${hideInLandscape} ${playFooter}`}
      >
        ARCADE VAULT · 1986–2026 · INSERTA MONEDA
      </footer>
    </div>
  );
}
