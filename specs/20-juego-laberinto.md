# SPEC 20 — Motor del juego Laberinto

> **Status:** Aprovado
> **Depends on:** SPEC 06, SPEC 07, SPEC 15, SPEC 17
> **Date:** 2026-10-09
> **Objective:** Crear desde cero el motor del juego LABERINTO (recorrer un laberinto fijo comiendo puntos mientras cuatro guardianes con comportamiento propio te persiguen) e integrarlo en `/play/laberinto`.

---

## 1 — Por qué existe este spec

LABERINTO es el juego Clásico esencial (Pac-Man like) solicitado en el proyecto. Consiste en limpiar un mapa fijo de puntos, mientras se evita a cuatro enemigos con rutinas de inteligencia propias. El diseño se aborda desde cero con primitivas de canvas, respetando el contrato de arquitectura (`createLaberintoEngine(canvas, handlers)`, `LaberintoState`) establecido en los juegos anteriores (como Serpiente, Arkanoid, Rana y Bombardero).

---

## 2 — Scope

**In:**

- **Nuevo módulo `components/games/laberinto/engine.ts`**: motor completo en un único archivo, sin imágenes ni dependencias externas.
  - **Tablero fijo**: matriz estática de paredes, puntos y cápsulas.
  - **Jugador**: Avanza de manera continua con giro en cola.
  - **Túnel lateral**: conexión directa entre ambos extremos del tablero.
  - **Cuatro guardianes**: `cazador`, `emboscador`, `flanqueador` y `errante` (cada uno con lógica de persecución única).
  - **Cápsula de energía**: vuelve a los guardianes vulnerables y permite comerlos, devolviéndolos a su base como `ojos`.
  - **Rendimiento**: un único RAF, `dt` real con tope, paredes en canvas fuera de pantalla.
- **Nuevo componente `components/games/laberinto/laberinto-game.tsx`**: Wrapper de React usando refs para callbacks y sincronización de estado local/externo.
- **Integración en `app/play/[id]/play-room.tsx`**:
  - Renderizado condicional para `isLaberinto`.
- **Registro en base de datos**: Inserción de la partida (`scores`) en Supabase (Leaderboard y catálogo).
- **Documentación**: Actualizar los markdown en `references/` y `CLAUDE.md`.

**Not in:**

| Candidato                          | Destino   | Razón                                                   |
| ---------------------------------- | --------- | ------------------------------------------------------- |
| Controles táctiles móviles         | Follow-up | Se aborda después con el agente `mobile-porter`.        |
| Skins (colores, retro, neon)       | Follow-up | Se aborda después con el agente `skin-designer`.        |
| Auditoría de rendimiento adicional | Follow-up | Tarea para el agente `game-performance-booster`.        |
| Objetos de bonificación aleatorios | WON'T DO  | Descartado para mantener simplicidad mecánica.          |
| Vidas extra al alcanzar puntuación | WON'T DO  | Se ha optado por 3 vidas fijas durante toda la partida. |

**Constraints:**

- No modificar el esquema existente de `public.games` ni `public.scores`.
- No alterar los otros juegos integrados.

---

## 3 — Data model

El estado del motor exportado a React será sencillo, ya que el estado profundo (posiciones de entidades, laberinto restante) se mantendrá aislado internamente para evitar re-renders por frame.

```ts
// components/games/laberinto/engine.ts
export const LABERINTO_WIDTH = 1280;
export const LABERINTO_HEIGHT = 800;

export interface LaberintoState {
  score: number;
  lives: number;
  level: number;
  paused: boolean;
}

export interface LaberintoHandlers {
  onStateChange(state: LaberintoState): void; // Se emite solo cuando un campo cambia
  onGameOver(finalScore: number): void;
}

export interface LaberintoEngine {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  restart(): void;
}

export function createLaberintoEngine(
  canvas: HTMLCanvasElement,
  handlers: LaberintoHandlers,
): LaberintoEngine;
```

---

## 4 — Implementation plan

1. **Estructura base del motor**: Crear `components/games/laberinto/engine.ts` definiendo la matriz `MAZE`, posiciones iniciales y bucle de renderizado (`RAF`). Pintar paredes en un canvas secundario por rendimiento.
   - _Check_: El juego levanta sin errores mostrando el mapa básico dibujado sobre negro.
2. **Componente React**: Crear `laberinto-game.tsx` para montar el `canvas` e instanciar `createLaberintoEngine`.
   - _Check_: Componente expone métodos de `restart` y escucha callbacks correctamente.
3. **Integración en PlayRoom**: Modificar `play-room.tsx` añadiendo el caso para `isLaberinto`.
   - _Check_: Visitar `/play/laberinto` muestra el canvas ajustado a la pantalla.
4. **Jugador**: Implementar movimiento continuo del jugador, bloqueo con paredes y túneles laterales.
   - _Check_: El jugador navega el laberinto, respeta paredes y sale por el túnel para reaparecer al otro lado.
5. **Coleccionables y Puntuación**: Implementar consumo de puntos normales y transición al siguiente nivel (`level++`, velocidad incrementada) al vaciar el tablero.
   - _Check_: Comer puntos suma al marcador; limpiar el mapa inicia el siguiente nivel.
6. **Movimiento y fases de guardianes**: Implementar las rutinas de movimiento y alternancia entre fases (dispersión/persecución).
   - _Check_: Los guardianes salen de la base, rondan las esquinas y luego buscan activamente al jugador usando heurísticas básicas.
7. **Colisiones y Vidas**: Tocar un guardián en estado normal resta vida. A cero vidas, desencadenar el estado `GAME OVER`.
   - _Check_: Jugador muere, la partida se detiene un instante y se reanuda perdiendo una vida en el HUD. Si vidas = 0, se emite evento de fin.
8. **Mecánica de Cápsula de poder**: Al comer una píldora, guardianes pasan a estado vulnerable (huyen). Al chocarlos, se los come. Vuelven como "ojos" a la base y regeneran.
   - _Check_: Al volverse azules se los puede devorar por puntos extra; los ojos navegan rápido hacia la base.
9. **Finalización y Persistencia**: Asegurar el envío del puntaje al guardar partida (`public.scores`).
   - _Check_: "Guardar puntuación" funciona y el ranking se actualiza en el modal.

---

## 5 — Acceptance criteria

- [ ] (Manual) El jugador no puede atravesar paredes. El túnel lo teletransporta al otro extremo.
- [ ] (Manual) Los controles reaccionan suavemente permitiendo un "giro en cola" fluido antes del cruce.
- [ ] (Manual) Se dibujan 4 guardianes, cada uno siguiendo comportamientos consistentes y lógicos de persecución/dispersión.
- [ ] (Manual) Comer píldoras de poder cambia el estado de guardianes, permitiendo comerlos.
- [ ] (Manual) Los guardianes comidos regresan visualmente a la base y reviven.
- [ ] (Manual) Limpiar el tablero sube de nivel, incrementando la velocidad de los enemigos.
- [ ] (Manual) Al perder 3 vidas, el juego muestra la pantalla de Fin del Juego del sistema (HUD), no un texto dibujado en el canvas.
- [ ] (Manual) Presionar `Esc` o el botón de pausa pausa los relojes internos y el dibujado.
- [ ] (Técnico) Solo se usa un `requestAnimationFrame` sin fugas de memoria al cambiar de juego.

---

## 6 — Decisiones tomadas y descartadas

- **Sí**: Laberinto de mapa estático y fijo; la dificultad escala subiendo la velocidad enemiga y reduciendo tiempo de vulnerabilidad. _Motivo_: Complejidad predecible y diseño probado.
- **Sí**: Conservar 3 vidas sin mecánicas de vidas extra. _Motivo_: Recomendado en la fase de análisis.
- **No**: Elementos bonus dinámicos y frutas. _Motivo_: Descartado por añadir reglas complejas adicionales no centrales.
- **Sí**: Lógica de movimiento en intersecciones por centros matemáticos en vez de píxel por píxel libre. _Motivo_: Evita errores de clipping contra las paredes.
- **Sí**: Dibujado con API Canvas puro y colores de una paleta rígida. _Motivo_: Prepara el terreno para el posterior agente `skin-designer`.

---

## 7 — Riesgos identificados

- **Movimiento inconsistente a diferentes fps**: Mitigado limitando el `dt` a 50ms máximos y escalando avances matemáticamente.
- **Enemigos atascados o rebotando**: Mitigado asegurando que la IA siempre prohíbe invertir el sentido (giros de 180 grados) por sí sola salvo tras un cambio explícito de fase (dispersión/cápsula).

---

## Lo que no está en este spec

Este documento solo cubre la lógica y el motor base. Adaptaciones móviles (táctiles), personalización de temas de colores (skins) y posibles micro-optimizaciones, han sido agendadas como `Follow-Up` y deben ser implementadas secuencialmente invocando a los agentes especialistas después de cerrar este desarrollo.
