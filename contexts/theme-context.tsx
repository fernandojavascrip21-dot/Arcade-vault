"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = "arcadevault.theme.v1";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readDomTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

// El valor real ya lo fija, antes de hidratar, el script inline de
// app/layout.tsx: para cuando este componente se hidrata en el cliente,
// document.documentElement.dataset.theme ya es el correcto, así que el
// inicializador perezoso de useState lo lee directamente sin necesitar un
// efecto posterior (evita el parpadeo del ícono del interruptor).
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document === "undefined" ? "dark" : readDomTheme(),
  );

  // Solo sincroniza el DOM con el estado ya conocido por React (no llama a
  // setTheme): cubre el remount de Strict Mode en desarrollo, que limpia el
  // atributo que el script anti-flash había fijado antes de hidratar.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // localStorage puede no estar disponible (modo privado, cuotas, etc.).
      }
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  }
  return ctx;
}
