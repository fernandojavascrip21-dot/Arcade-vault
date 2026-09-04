"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useSession } from "@/contexts/session-context";

const inputCls =
  "border border-cian/30 bg-cian/5 px-3.5 py-3.5 text-[15px] text-[#e6f2f5] focus:border-cian focus:shadow-[0_0_20px_rgba(0,245,255,.4)]";
const labelCls =
  "grid gap-2 text-xs uppercase tracking-[2px] text-[#8b98a3]";

export default function AuthPage() {
  const router = useRouter();
  const { login, playGuest } = useSession();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [user, setUser] = useState("");

  const registering = tab === "register";

  // Demo local: no hay backend. Iniciar sesión, crear cuenta y los botones
  // sociales hacen lo mismo: sesión simulada con el nombre introducido.
  const submit = () => {
    const name = (user || "JUGADOR_01").toUpperCase().slice(0, 14);
    login(name);
    router.push("/");
  };

  const guest = () => {
    playGuest();
    router.push("/");
  };

  return (
    <main className="relative z-10 grid flex-1 animate-fade place-items-center px-5 pb-20 pt-12">
      <div className="grid w-full max-w-[430px] gap-[22px] border border-cian/30 bg-[rgba(10,11,18,.95)] px-7 py-9 shadow-[0_0_60px_rgba(0,245,255,.16)]">
        <div className="animate-flicker text-center font-display text-base tracking-wider text-cian">
          ARCADE<span className="text-magenta">VAULT</span>
        </div>

        <div className="grid grid-cols-2 border border-white/12">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`px-2 py-3.5 text-center font-display text-[9px] ${
              registering
                ? "text-[#6f7d88]"
                : "bg-cian/12 text-cian"
            }`}
          >
            INICIAR SESIÓN
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={`px-2 py-3.5 text-center font-display text-[9px] ${
              registering
                ? "bg-magenta/12 text-magenta"
                : "text-[#6f7d88]"
            }`}
          >
            CREAR CUENTA
          </button>
        </div>

        <div className="grid gap-4">
          <label className={labelCls}>
            Usuario
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="jugador_01"
              className={inputCls}
            />
          </label>
          {registering ? (
            <label className={labelCls}>
              Correo electrónico
              <input
                type="email"
                placeholder="tu@correo.com"
                className={inputCls}
              />
            </label>
          ) : null}
          <label className={labelCls}>
            Contraseña
            <input type="password" placeholder="••••••••" className={inputCls} />
          </label>
        </div>

        <button
          type="button"
          onClick={submit}
          className="whitespace-nowrap border border-cian bg-cian p-4 text-center font-display text-[11px] text-[#0a0a0f] transition-shadow hover:shadow-[0_0_30px_rgba(0,245,255,.6)] active:scale-95"
        >
          {registering ? "CREAR CUENTA" : "ENTRAR AL VAULT"}
        </button>

        <button
          type="button"
          onClick={guest}
          className="text-center text-[13px] uppercase tracking-[2px] text-amarillo hover:[text-shadow:0_0_14px_rgba(245,255,0,.7)]"
        >
          Jugar como invitado
        </button>

        <div className="flex items-center gap-3 text-[11px] tracking-[2px] text-[#333c45]">
          <div className="h-px flex-1 bg-white/10" />
          <span className="whitespace-nowrap">O CONTINÚA CON</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={submit}
            className="border border-white/16 p-3.5 text-center text-[13px] tracking-wide text-[#cdd8de] transition-colors hover:border-cian hover:text-cian active:scale-95"
          >
            Google
          </button>
          <button
            type="button"
            onClick={submit}
            className="border border-white/16 p-3.5 text-center text-[13px] tracking-wide text-[#cdd8de] transition-colors hover:border-cian hover:text-cian active:scale-95"
          >
            GitHub
          </button>
        </div>

        <p className="text-[11px] leading-relaxed text-[#3b454e]">
          {"// Demo local. Aquí conectaría el backend real (REST o Supabase) para sesiones y puntuaciones sincronizadas."}
        </p>
      </div>
    </main>
  );
}
