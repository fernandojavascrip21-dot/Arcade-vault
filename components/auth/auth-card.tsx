import type { AuthCardProps } from "@/lib/interfaces/auth";

// Tarjeta común de las pantallas de acceso: mismo marco que el /auth original.
export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <main className="relative z-10 grid flex-1 animate-fade place-items-center px-4 pb-20 pt-12 sm:px-5">
      <div className="grid w-full max-w-[430px] gap-[22px] border border-cian/30 bg-background/95 px-5 py-8 shadow-[0_0_60px_rgba(0,245,255,.16)] sm:px-7 sm:py-9">
        <div className="animate-flicker text-center font-display text-base tracking-wider text-cian">
          ARCADE<span className="text-magenta">VAULT</span>
        </div>
        {title ? (
          <h1 className="text-center font-display text-[11px] leading-relaxed tracking-wider text-foreground">
            {title}
          </h1>
        ) : null}
        {children}
      </div>
    </main>
  );
}
