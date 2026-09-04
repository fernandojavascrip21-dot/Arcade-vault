import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative z-10 grid flex-1 animate-fade place-items-center px-5 pb-24 pt-16 text-center">
      <div className="grid justify-items-center gap-6">
        <div className="font-display text-[clamp(48px,12vw,110px)] leading-none text-magenta [text-shadow:0_0_20px_rgba(255,0,110,.7),0_0_60px_rgba(255,0,110,.35)]">
          404
        </div>
        <p className="text-sm uppercase tracking-[3px] text-[#6f7d88]">
          Esta pantalla no está en el Vault
        </p>
        <Link
          href="/"
          className="mt-2 whitespace-nowrap border border-cian bg-cian/10 px-7 py-4 font-display text-[11px] tracking-wider text-cian transition-colors hover:bg-cian hover:text-[#0a0a0f] active:scale-95"
        >
          VOLVER AL VAULT
        </Link>
      </div>
    </main>
  );
}
