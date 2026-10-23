"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { signOutAction } from "@/app/auth/actions";
import type { AuthState, SessionValue } from "@/lib/interfaces/session";
import { createClient } from "@/lib/supabase/client";

// Foto de la cuenta: Google la guarda como `picture`, GitHub como `avatar_url`.
function readAvatarUrl(metadata: Record<string, unknown> | undefined) {
  const url = metadata?.avatar_url ?? metadata?.picture;
  return typeof url === "string" && url.startsWith("https://") ? url : null;
}

const NO_SESSION: AuthState = {
  userId: null,
  email: null,
  avatarUrl: null,
  playerName: null,
  profileLoaded: false,
};

const SessionContext = createContext<SessionValue | null>(null);

// El nombre del jugador se recuerda en localStorage (spec 12). Si el
// almacenamiento no está disponible (modo privado, bloqueado), se conserva en
// memoria mientras dure la pestaña.
const STORAGE_KEY = "arcade-vault:player-name";

let memoryName: string | null = null;
const listeners = new Set<() => void>();

function readName(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryName;
  } catch {
    return memoryName;
  }
}

function writeName(name: string | null) {
  memoryName = name;
  try {
    if (name === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Sin almacenamiento: queda solo en memoria.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

async function fetchPlayerName(userId: string): Promise<string | null> {
  const { data } = await createClient()
    .from("profiles")
    .select("player_name")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.player_name ?? null;
}

// Sesión real de Supabase (spec 21) más el invitado de localStorage (spec 12).
export function SessionProvider({ children }: { children: ReactNode }) {
  // En el servidor (y en la hidratación) no hay nombre; el cliente lo lee tras
  // montar sin provocar desajuste.
  const guestName = useSyncExternalStore(subscribe, readName, () => null);
  const [isGuestFlag, setIsGuestFlag] = useState(false);
  const [auth, setAuth] = useState<AuthState>(NO_SESSION);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async (userId: string) => {
      let playerName: string | null = null;
      try {
        playerName = await fetchPlayerName(userId);
      } catch {
        // Sin perfil legible: se trata como sesión sin nombre.
      }
      if (cancelled) return;
      setAuth((prev) =>
        prev.userId === userId
          ? { ...prev, playerName, profileLoaded: true }
          : prev,
      );
    };

    // INITIAL_SESSION se emite al suscribirse. No se llama a Supabase dentro
    // del callback (riesgo de bloqueo): se difiere con setTimeout.
    const { data } = createClient().auth.onAuthStateChange(
      (_event, session) => {
        const userId = session?.user.id ?? null;
        if (!userId) {
          setAuth(NO_SESSION);
          return;
        }
        setAuth((prev) =>
          prev.userId === userId
            ? prev
            : {
                userId,
                email: session?.user.email ?? null,
                avatarUrl: readAvatarUrl(session?.user.user_metadata),
                playerName: null,
                profileLoaded: false,
              },
        );
        setTimeout(() => void loadProfile(userId), 0);
      },
    );

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  // Relee la sesión de las cookies (el cliente no se entera de los accesos por
  // Server Action, que terminan en una navegación suave) y el perfil.
  const syncSession = useCallback(async () => {
    const { data } = await createClient().auth.getSession();
    const userId = data.session?.user.id ?? null;
    const email = data.session?.user.email ?? null;
    const avatarUrl = readAvatarUrl(data.session?.user.user_metadata);
    if (!userId) {
      setAuth((prev) => (prev.userId === null ? prev : NO_SESSION));
      return;
    }
    let playerName: string | null = null;
    try {
      playerName = await fetchPlayerName(userId);
    } catch {}
    setAuth((prev) =>
      prev.userId === userId &&
      prev.playerName === playerName &&
      prev.profileLoaded
        ? prev
        : { userId, email, avatarUrl, playerName, profileLoaded: true },
    );
  }, []);

  const pathname = usePathname();
  useEffect(() => {
    // Diferido: no se actualiza estado de forma síncrona dentro del efecto.
    const id = setTimeout(() => void syncSession(), 0);
    return () => clearTimeout(id);
  }, [pathname, syncSession]);

  const refreshProfile = syncSession;

  const setName = useCallback((name: string) => {
    writeName(name);
    setIsGuestFlag(false);
  }, []);

  const playGuest = useCallback(() => {
    writeName(null);
    setIsGuestFlag(true);
  }, []);

  const logout = useCallback(async () => {
    writeName(null);
    setIsGuestFlag(false);
    try {
      await signOutAction(); // invalida la sesión y borra las cookies
    } catch {}
    try {
      await createClient().auth.signOut({ scope: "local" }); // limpia el cliente
    } catch {}
    setAuth(NO_SESSION);
  }, []);

  const isAuthenticated = auth.userId !== null && auth.playerName !== null;
  const needsPlayerName =
    auth.userId !== null && auth.profileLoaded && auth.playerName === null;
  const user = auth.playerName ?? guestName;
  const isGuest = !isAuthenticated && isGuestFlag;

  const email = auth.email;
  const avatarUrl = auth.avatarUrl;

  const value = useMemo<SessionValue>(
    () => ({
      user,
      email,
      avatarUrl,
      isAuthenticated,
      needsPlayerName,
      isGuest,
      setName,
      playGuest,
      logout,
      refreshProfile,
    }),
    [
      user,
      email,
      avatarUrl,
      isAuthenticated,
      needsPlayerName,
      isGuest,
      setName,
      playGuest,
      logout,
      refreshProfile,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession debe usarse dentro de <SessionProvider>");
  }
  return ctx;
}
