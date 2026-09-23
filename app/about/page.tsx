"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { useReveal } from "@/lib/use-reveal";

const inputCls =
  "w-full border border-line bg-background px-3 py-3 font-mono text-[15px] text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:border-cian focus:shadow-[0_0_12px_rgba(0,245,255,.35)]";
const labelCls = "grid gap-2 text-xs uppercase tracking-[2px] text-texto-tenue";

// Envuelve una sección con la animación de aparición al hacer scroll (mismo patrón que la Home).
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

type HighlightKind = "HEART" | "BROWSER" | "PLANT";

function HighlightIcon({ kind }: { kind: HighlightKind }) {
  if (kind === "HEART")
    return (
      <svg
        viewBox="0 0 16 16"
        className="h-9 w-9 flex-none drop-shadow-[0_0_6px_currentColor]"
      >
        <g fill="currentColor">
          <rect x="2" y="3" width="4" height="2" />
          <rect x="10" y="3" width="4" height="2" />
          <rect x="1" y="4" width="2" height="4" />
          <rect x="13" y="4" width="2" height="4" />
          <rect x="2" y="8" width="2" height="2" />
          <rect x="12" y="8" width="2" height="2" />
          <rect x="3" y="9" width="10" height="2" />
          <rect x="4" y="11" width="8" height="2" />
          <rect x="5" y="12" width="6" height="2" />
          <rect x="6" y="13" width="4" height="1" />
          <rect x="7" y="14" width="2" height="1" />
        </g>
      </svg>
    );
  if (kind === "BROWSER")
    return (
      <svg
        viewBox="0 0 16 16"
        className="h-9 w-9 flex-none drop-shadow-[0_0_6px_currentColor]"
      >
        <g fill="currentColor">
          <rect
            x="1"
            y="2"
            width="14"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <rect x="1" y="2" width="14" height="3" />
          <rect x="3" y="3" width="1" height="1" fill="var(--background)" />
          <rect x="5" y="3" width="1" height="1" fill="var(--background)" />
          <rect x="7" y="3" width="1" height="1" fill="var(--background)" />
          <rect x="3" y="7" width="4" height="1" />
          <rect x="3" y="9" width="6" height="1" />
          <rect x="3" y="11" width="3" height="1" />
        </g>
      </svg>
    );
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-9 w-9 flex-none drop-shadow-[0_0_6px_currentColor]"
    >
      <g fill="currentColor">
        <rect x="7" y="2" width="2" height="10" />
        <rect x="4" y="4" width="3" height="2" />
        <rect x="9" y="6" width="3" height="2" />
        <rect x="3" y="3" width="2" height="2" />
        <rect x="11" y="5" width="2" height="2" />
        <rect x="3" y="12" width="10" height="2" />
        <rect x="4" y="14" width="8" height="1" />
      </g>
    </svg>
  );
}

const HIGHLIGHTS: { icon: HighlightKind; text: string; color: string }[] = [
  { icon: "HEART", text: "HECHO CON ❤️ PARA JUGADORES", color: "text-magenta" },
  {
    icon: "BROWSER",
    text: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR",
    color: "text-cian",
  },
  {
    icon: "PLANT",
    text: "PROYECTO EN CONSTANTE CRECIMIENTO",
    color: "text-[#00ff88]",
  },
];

type ContactForm = { name: string; email: string; msg: string };
type Status = "idle" | "sending" | "error";

const EMPTY_FORM: ContactForm = { name: "", email: "", msg: "" };

export default function AboutPage() {
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [sent, setSent] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: { ok: true } | { ok: false; error: string } =
        await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(
          !data.ok ? data.error : "No se pudo enviar el mensaje.",
        );
      }
      setSent(form.name.trim());
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "No se pudo enviar el mensaje.",
      );
    }
  };

  const resetForm = () => {
    setSent(null);
    setForm(EMPTY_FORM);
    setStatus("idle");
    setError(null);
  };

  return (
    <main className="relative z-10 flex-1 animate-fade">
      {/* HERO */}
      <section className="mx-auto max-w-[1100px] px-[22px] pb-10 pt-20 text-center">
        <div className="mb-[18px] font-display text-[11px] uppercase tracking-[3px] text-amarillo [text-shadow:0_0_10px_rgba(245,255,0,.5)]">
          ▸ ACERCA DE
        </div>
        <h1 className="bg-gradient-to-b from-white to-cian bg-clip-text font-display text-[clamp(26px,5vw,52px)] tracking-wider text-transparent drop-shadow-[0_0_14px_rgba(0,245,255,.4)]">
          ACERCA DE ARCADE VAULT
        </h1>
        <p className="mx-auto mt-7 max-w-[720px] text-[15px] leading-[1.8] tracking-wide text-texto-tenue">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra
          misión es preservar y celebrar los arcades que definieron una
          generación, haciéndolos accesibles para todos, en cualquier lugar y
          sin costo.
        </p>

        <div className="mt-[52px] grid grid-cols-1 gap-[18px] md:grid-cols-3">
          {HIGHLIGHTS.map((h, i) => (
            <div
              key={h.text}
              className={`flex items-center gap-4 border border-foreground/10 bg-background/90 px-5 py-[18px] text-left transition-transform duration-200 hover:-translate-y-[3px] hover:border-current hover:shadow-[0_12px_28px_-14px_currentColor] ${h.color}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <HighlightIcon kind={h.icon} />
              <div className="font-display text-[10px] leading-[1.5] tracking-[.1em] text-foreground">
                {h.text}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DIVIDER */}
      <Reveal className="mx-auto max-w-[1200px] px-[22px] py-[60px]">
        <div aria-hidden className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-magenta to-transparent" />
          <div className="flex gap-1">
            {Array.from({ length: 24 }).map((_, i) => {
              const color =
                (i + 1) % 5 === 0
                  ? "#f5ff00"
                  : (i + 1) % 3 === 0
                    ? "#ff006e"
                    : "#00f5ff";
              return (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse"
                  style={{
                    background: color,
                    boxShadow: `0 0 6px ${color}`,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              );
            })}
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-magenta to-transparent" />
        </div>
      </Reveal>

      {/* CONTACT */}
      <Reveal className="mx-auto max-w-[1200px] px-[22px] pb-20">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_1.2fr] md:gap-10">
          <div>
            <div className="mb-3.5 font-display text-[11px] uppercase tracking-[3px] text-cian [text-shadow:0_0_10px_rgba(0,245,255,.5)]">
              ▸ CONTACTO
            </div>
            <h2 className="font-display text-[clamp(22px,3.5vw,36px)] tracking-wider text-cian [text-shadow:0_0_12px_rgba(0,245,255,.4)]">
              CONTÁCTANOS
            </h2>
            <p className="mb-6 mt-[18px] text-sm leading-[1.7] text-texto-tenue">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o
              simplemente quieres saludar? Escríbenos.
            </p>
            <div className="grid gap-2.5">
              <div className="flex items-center gap-2.5 font-display text-[9px] tracking-[.14em] text-texto-tenue">
                <span className="h-2 w-2 flex-none rounded-full bg-[#00ff88] shadow-[0_0_6px_#00ff88]" />
                RESPUESTA EN 24-48H
              </div>
              <div className="flex items-center gap-2.5 font-display text-[9px] tracking-[.14em] text-texto-tenue">
                <span className="h-2 w-2 flex-none rounded-full bg-amarillo shadow-[0_0_6px_#f5ff00]" />
                SUGERENCIAS BIENVENIDAS
              </div>
              <div className="flex items-center gap-2.5 font-display text-[9px] tracking-[.14em] text-texto-tenue">
                <span className="h-2 w-2 flex-none rounded-full bg-magenta shadow-[0_0_6px_#ff006e]" />
                SIN SPAM, JAMÁS
              </div>
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className={`relative border border-line bg-background/90 p-7 before:pointer-events-none before:absolute before:inset-1 before:border before:border-dashed before:border-cian/15 ${
              shake ? "animate-shake" : ""
            }`}
          >
            {!sent ? (
              <>
                <div className="grid gap-4">
                  <label className={labelCls}>
                    NOMBRE
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="px_kai"
                      className={inputCls}
                    />
                  </label>
                  <label className={labelCls}>
                    CORREO ELECTRÓNICO
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="jugador@vault.gg"
                      className={inputCls}
                    />
                  </label>
                  <label className={labelCls}>
                    MENSAJE
                    <textarea
                      rows={5}
                      value={form.msg}
                      onChange={(e) =>
                        setForm({ ...form, msg: e.target.value })
                      }
                      placeholder="Cuéntanos qué tienes en mente…"
                      className={`${inputCls} min-h-[110px] resize-y`}
                    />
                  </label>
                </div>

                {status === "error" && error ? (
                  <div className="mt-4 border border-magenta/40 bg-magenta/10 px-3.5 py-3 text-[13px] text-magenta">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="mt-6 w-full whitespace-nowrap border border-cian bg-cian/10 py-4 text-center font-display text-[13px] tracking-wider text-cian transition-colors hover:bg-cian hover:text-[#0a0a0f] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "sending" ? "ENVIANDO..." : "▶  ENVIAR MENSAJE"}
                </button>
              </>
            ) : (
              <div className="border border-[#00ff88] bg-black shadow-[0_0_22px_rgba(0,255,136,.25)]">
                <div className="flex items-center gap-2 border-b border-line bg-[#0a0a0f] px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
                  <span className="ml-2 font-display text-[9px] tracking-[.14em] text-texto-debil">
                    VAULT-OS // TERMINAL
                  </span>
                </div>
                <div className="px-[18px] pb-[22px] pt-[18px] text-[13px] leading-[1.8]">
                  <div className="text-[#00ff88]">
                    <span className="mr-2 text-cian">vault@arcade:~$</span>{" "}
                    ./send_message --to=team
                  </div>
                  <div className="text-texto-tenue">
                    [OK] Conectando con servidor…
                  </div>
                  <div className="text-texto-tenue">
                    [OK] Validando contenido…
                  </div>
                  <div className="text-texto-tenue">
                    [OK] Transmitiendo paquete…
                  </div>
                  <div className="mt-3 whitespace-pre-wrap font-bold text-[#00ff88] [text-shadow:0_0_6px_rgba(0,255,136,.45)]">
                    &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{" "}
                    {sent.toUpperCase()}.
                    <span className="animate-caret">_</span>
                  </div>
                  <div className="mt-[18px]">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="border border-foreground/20 px-4 py-2.5 font-display text-[10px] tracking-wider text-texto-tenue transition-colors hover:border-cian hover:text-cian"
                    >
                      ENVIAR OTRO MENSAJE
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </Reveal>
    </main>
  );
}
