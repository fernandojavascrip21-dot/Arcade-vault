"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// Anima la aparición de una sección al hacer scroll hasta ella. `visible` pasa
// a true una sola vez (y se queda) cuando el elemento referenciado entra en
// el viewport; si ya está visible al montar, IntersectionObserver lo reporta
// de inmediato, así que no hace falta un caso especial para eso.
export function useReveal<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  visible: boolean;
} {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, visible };
}
