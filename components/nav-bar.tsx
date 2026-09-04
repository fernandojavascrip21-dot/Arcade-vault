"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { useCredits } from "@/contexts/credits-context";
import { useSession } from "@/contexts/session-context";
import { useMediaQuery } from "@/lib/use-media-query";

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="relative whitespace-nowrap pb-1.5 text-sm uppercase tracking-[2px] text-foreground transition-colors hover:text-cian"
    >
      {children}
      {active ? (
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-cian shadow-[0_0_10px_#00f5ff,0_0_20px_rgba(0,245,255,.7)]" />
      ) : null}
    </Link>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const { credits, insertCoin } = useCredits();
  const { user, logout } = useSession();
  const isNarrow = useMediaQuery("(max-width: 999px)");
  const [menuOpen, setMenuOpen] = useState(false);

  const creditsText = String(credits).padStart(2, "0");
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-cian/30 bg-[rgba(8,8,13,.9)] px-[22px] py-3.5 shadow-[0_6px_30px_rgba(0,0,0,.6)] backdrop-blur-md">
        <Link
          href="/"
          className="whitespace-nowrap font-display text-sm tracking-wider text-cian [text-shadow:0_0_10px_rgba(0,245,255,.8)]"
        >
          ARCADE
          <span className="text-magenta [text-shadow:0_0_10px_rgba(255,0,110,.9)]">
            VAULT
          </span>
        </Link>

        {!isNarrow ? (
          <div className="flex flex-wrap items-center justify-end gap-x-[22px] gap-y-3">
            <div className="flex items-center gap-2.5 border border-amarillo/35 bg-amarillo/5 px-2.5 py-2">
              <span className="whitespace-nowrap text-[10px] tracking-[2px] text-[#b9bf6a]">
                CRÉDITOS
              </span>
              <span className="font-display text-xs text-amarillo [text-shadow:0_0_12px_rgba(245,255,0,.6)]">
                {creditsText}
              </span>
              <button
                type="button"
                onClick={insertCoin}
                className="whitespace-nowrap border border-amarillo/50 px-2 py-[7px] font-display text-[8px] tracking-wider text-amarillo transition-colors hover:bg-amarillo/15 active:scale-95"
              >
                + MONEDA
              </button>
            </div>

            <NavLink href="/" active={pathname === "/"}>
              Biblioteca
            </NavLink>
            <NavLink href="/salon-fama" active={pathname === "/salon-fama"}>
              Salón de la Fama
            </NavLink>

            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="grid h-[34px] w-[34px] place-items-center border border-amarillo font-display text-[11px] text-amarillo [box-shadow:0_0_14px_rgba(245,255,0,.4)]">
                  {user.charAt(0)}
                </div>
                <div className="whitespace-nowrap text-[13px] tracking-wider">
                  {user}
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="whitespace-nowrap text-[11px] uppercase tracking-wider text-[#6f7d88] transition-colors hover:text-magenta"
                >
                  Salir
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="whitespace-nowrap border border-magenta bg-magenta/5 px-4 py-3 font-display text-[10px] text-magenta transition-colors hover:bg-magenta/20 active:scale-95"
              >
                INICIAR SESIÓN
              </Link>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={insertCoin}
              className="flex items-center gap-2 border border-amarillo/35 bg-amarillo/5 px-2.5 py-[9px] active:scale-95"
            >
              <span className="text-[9px] tracking-wider text-[#b9bf6a]">
                CRÉD.
              </span>
              <span className="font-display text-[11px] text-amarillo">
                {creditsText}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
              className="grid gap-[5px] border border-cian/40 p-2.5"
            >
              <span className="block h-0.5 w-[22px] bg-cian" />
              <span className="block h-0.5 w-[22px] bg-cian" />
              <span className="block h-0.5 w-[22px] bg-cian" />
            </button>
          </div>
        )}
      </nav>

      {menuOpen ? (
        <div
          onClick={closeMenu}
          className="fixed inset-0 z-[55] bg-[rgba(4,4,8,.7)] backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-y-0 right-0 grid w-[76%] max-w-[320px] animate-fade content-start gap-[22px] border-l border-cian/35 bg-[#0c0c14] px-[22px] py-[26px] shadow-[-10px_0_50px_rgba(0,245,255,.18)]"
          >
            <div className="font-display text-[10px] tracking-wider text-[#46525e]">
              MENÚ
            </div>
            <Link
              href="/"
              onClick={closeMenu}
              className="font-display text-xs text-cian"
            >
              Biblioteca
            </Link>
            <Link
              href="/salon-fama"
              onClick={closeMenu}
              className="font-display text-xs text-cian"
            >
              Salón de la Fama
            </Link>
            <Link
              href="/auth"
              onClick={closeMenu}
              className="font-display text-xs text-magenta"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
