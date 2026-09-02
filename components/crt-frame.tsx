import type { CSSProperties, ReactNode } from "react";

const scanlines: CSSProperties = {
  background:
    "repeating-linear-gradient(to bottom, rgba(0,0,0,.5) 0 1px, rgba(0,0,0,0) 1px 3px)",
};

const vignette: CSSProperties = {
  background:
    "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.5) 100%)",
};

// Marco CRT de la maqueta. Placeholder estático (sin canvas ni juego): pinta el
// gradiente `background` y admite `children` para superponer texto (pausa, HUD…).
export function CrtFrame({
  background,
  label = "PREVISUALIZACIÓN",
  className = "",
  children,
}: {
  background: string;
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`rounded-[18px] border border-cian/25 bg-[linear-gradient(180deg,#1a1c24,#0d0e13)] p-3.5 shadow-[0_0_44px_rgba(0,245,255,.14),inset_0_2px_0_rgba(255,255,255,.06)] ${className}`}
    >
      <div className="relative overflow-hidden rounded-xl bg-[#04040a] shadow-[inset_0_0_50px_rgba(0,245,255,.12)]">
        <div className="aspect-[16/10] w-full" style={{ background }} />
        <div className="pointer-events-none absolute inset-0 opacity-30" style={scanlines} />
        <div className="pointer-events-none absolute inset-0" style={vignette} />
        {label ? (
          <div className="absolute left-3 top-2.5 whitespace-nowrap bg-black/55 px-2 py-1.5 font-display text-[8px] tracking-wider text-cian">
            {label}
          </div>
        ) : null}
        {children ? (
          <div className="absolute inset-0">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
