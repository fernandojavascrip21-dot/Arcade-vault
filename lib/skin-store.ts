import { useSyncExternalStore } from "react";

// Store genérico de la skin elegida por juego (preferencia solo de cliente,
// sin Supabase). Generaliza el patrón del store de Bloques en
// app/play/[id]/play-room.tsx: se lee con useSyncExternalStore y el snapshot
// de servidor/hidratación es siempre el default, así que el valor real de
// localStorage llega tras montar sin desajuste de hidratación. No leer
// localStorage en un inicializador de useState ni hacer setState en un
// efecto de montaje (error de hidratación + react-hooks/set-state-in-effect).
export interface SkinStore<T extends string> {
  subscribe(notify: () => void): () => void;
  read(): T;
  write(next: T): void;
  serverSnapshot(): T;
}

export function createSkinStore<T extends string>(
  storageKey: string,
  skins: ReadonlyArray<{ id: T }>,
  fallback: T,
): SkinStore<T> {
  let memory: T = fallback;
  const listeners = new Set<() => void>();
  const isValid = (value: string | null): value is T =>
    skins.some((s) => s.id === value);

  return {
    subscribe(notify) {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    read() {
      try {
        const stored = localStorage.getItem(storageKey);
        return isValid(stored) ? stored : memory;
      } catch {
        return memory;
      }
    },
    write(next) {
      memory = next;
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // localStorage puede no estar disponible (modo privado, cuotas, etc.).
      }
      listeners.forEach((notify) => notify());
    },
    serverSnapshot: () => fallback,
  };
}

export function useSkin<T extends string>(store: SkinStore<T>): T {
  return useSyncExternalStore(
    store.subscribe,
    store.read,
    store.serverSnapshot,
  );
}
