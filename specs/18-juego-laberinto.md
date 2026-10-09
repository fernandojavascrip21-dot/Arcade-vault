# SPEC 18 — Motor del juego Laberinto

> **Status:** Draft
> **Depends on:** SPEC 06, SPEC 07, SPEC 15
> **Date:** 2026-10-09
> **Objective:** Crear desde cero el motor del juego Laberinto (estilo Pac-Man clásico con 4 fantasmas, píldoras de poder y mapa estático) e integrarlo en `/play/laberinto`, con su fila nueva `laberinto` en la tabla `games` y carátula de catálogo.

---

## 1 — Por qué existe este spec

LABERINTO es un juego Clásico esencial solicitado por el usuario, mencionado en `references/games-suggestion-all.md` (33/40). El juego consiste en comer puntos, evitar guardianes y comer píldoras de poder.
Se ha decidido simplificar la IA de los guardianes (uno persigue, tres aleatorios) y utilizar un mapa estático clásico para mantener el alcance manejable y directo. El movimiento es continuo al pulsar una dirección hasta chocar contra la pared.

Todo el dibujado se realizará mediante primitivas de canvas, siguiendo la arquitectura de los juegos anteriores (como Serpiente, Arkanoid, Rana y Bombardero) sin dependencias de assets externos.

---

## 2 — Scope

**In:**

| Candidato | Destino | Razón |
| --------- | ----------- | ----------------- |
| Motor del juego (`engine.ts`) con mapa clásico | IN | Es el núcleo del juego |
| Wrapper de React (`laberinto-game.tsx`) | IN | Integración en la app |
| Rama en `play-room.tsx` | IN | Permite jugar en la plataforma |
| Fila en BD Supabase (`public.games`) | IN | Para el catálogo y leaderboard |

**Not in:**

| Candidato | Destino | Razón |
| --------- | ----------- | ----------------- |
| Controles táctiles móviles | mobile-porter | El agente `mobile-porter` lo añadirá automáticamente después |
| Imágenes y sonidos externos | WON'T DO | Todo se dibuja con primitivas de canvas como el resto de juegos |

**Constraints:**
- No modificar el esquema existente de `public.games`, solo insertar una nueva fila.
- No modificar el componente genérico de `PlayRoom` más allá de añadir el bloque `case 'laberinto'`.

---

## 3 — Data model

### Estado del motor (Local)

El motor exportará `createLaberintoEngine(canvas, handlers)`. Su estado interno manejará:

```typescript
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

type Entity = {
  x: number;
  y: number;
  dir: Direction;
  nextDir: Direction; // Para pre-pulsaciones antes de cruces
};

type Ghost = Entity & {
  type: 'CHASER' | 'RANDOM_1' | 'RANDOM_2' | 'RANDOM_3';
  state: 'NORMAL' | 'VULNERABLE' | 'EATEN';
};

export type LaberintoState = {
  status: 'IDLE' | 'PLAYING' | 'GAME_OVER' | 'LEVEL_TRANSITION';
  score: number;
  lives: number;
  level: number;
  player: Entity;
  ghosts: Ghost[];
  map: number[][]; // 0: vacio, 1: pared, 2: punto, 3: pildora
  powerModeTime: number; // Tiempo restante de invulnerabilidad
};
```

---

## 4 — Implementation plan

1. **Crear base del motor y mapa**
   - Archivo: `components/games/laberinto/engine.ts`.
   - Definir la matriz del mapa estático (ej. 28x31 casillas) y constantes de dibujo.
   - Implementar el bucle `requestAnimationFrame`, `start()`, `stop()`.
   - *Check:* El canvas se dibuja negro y no falla.

2. **Dibujar el laberinto estático**
   - Dibujar paredes (líneas azules), puntos pequeños (blancos) y píldoras (grandes parpadeantes).
   - *Check:* El mapa se renderiza correctamente con todos sus elementos.

3. **Mecánica del Jugador (Pac-Man)**
   - Añadir la entidad del jugador, dibujado como círculo amarillo con boca abierta/cerrada.
   - Implementar teclado para guardar la `nextDir`.
   - Mover al jugador de forma continua en las intersecciones; si choca, se detiene.
   - *Check:* El jugador se mueve por los pasillos correctamente, sin atravesar paredes.

4. **Comer puntos y ganar niveles**
   - Detectar colisión con puntos y píldoras, actualizar mapa y sumar `score`.
   - Si se comen todos los puntos y píldoras, pasar a `LEVEL_TRANSITION` (breve pausa), aumentar `level` y restaurar los puntos y posiciones.
   - *Check:* Al limpiar el mapa, el nivel aumenta y los puntos reaparecen.

5. **Añadir a los Guardianes (Fantasmas)**
   - Dibujar a los 4 fantasmas en su posición central inicial.
   - Implementar su movimiento continuo.
   - IA: uno de ellos persigue la coordenada actual del jugador en intersecciones; los otros 3 eligen una dirección válida al azar en cada cruce.
   - *Check:* Los fantasmas se mueven solos y no atraviesan paredes.

6. **Mecánica de vidas y colisiones**
   - Si un fantasma choca con el jugador (en estado `NORMAL`), se resta vida, y se re-centran posiciones (pausa breve). Si `lives == 0`, pasar a `GAME_OVER`.
   - *Check:* Tocar a un fantasma quita vida y reposiciona las entidades sin reiniciar los puntos.

7. **Mecánica de Píldoras de Poder**
   - Al comer una píldora (tipo 3), los fantasmas cambian a `VULNERABLE` (azules) por un tiempo límite en milisegundos.
   - Si el jugador choca con uno `VULNERABLE`, el fantasma muere (`EATEN`) y vuelve a la base, y se suman puntos extra.
   - *Check:* Comer píldoras permite comer fantasmas, y estos vuelven a la normalidad pasado el tiempo.

8. **Wrapper de React y PlayRoom**
   - Archivo: `components/games/laberinto/laberinto-game.tsx`.
   - Envolver el `engine.ts` y sincronizar vidas, nivel y puntuación con los callbacks.
   - Modificar `app/play/[id]/play-room.tsx` para importar y renderizar `<LaberintoGame />`.
   - *Check:* La URL `/play/laberinto` muestra el juego y actualiza el HUD externo.

9. **Registro en base de datos**
   - Crear el script de migración SQL o insertar directamente en Supabase: `insert into public.games (id, title, category, description, long_description, thumbnail_url) values ('laberinto', 'Laberinto', 'Clásico', ...)`
   - *Check:* Laberinto aparece en el catálogo principal y tiene leaderboard.

---

## 5 — Acceptance criteria

- [ ] El mapa de laberinto está estático, definido por matriz, y no se sobrepone visualmente.
- [ ] El personaje principal se mueve continuamente en una dirección hasta chocar.
- [ ] Hay 4 fantasmas; uno persigue activamente al jugador en cruces, tres vagan aleatoriamente.
- [ ] Comer puntos suma puntuación y vacía la celda correspondiente del mapa.
- [ ] Comer todos los puntos reinicia el laberinto, recoloca los personajes y sube de nivel.
- [ ] Hay 4 píldoras de poder en las esquinas que vuelven azules (vulnerables) a los fantasmas por un tiempo limitado.
- [ ] El jugador tiene 3 vidas. Perder una vida recoloca a los personajes sin repoblar los puntos ya comidos.
- [ ] El juego está integrado en `/play/laberinto` y usa el HUD y estado genérico de `PlayRoom`.
- [ ] La fila `laberinto` existe en `public.games` de Supabase.

---

## 6 — Decisions taken and discarded

- **Descartado:** Mapas procedurales. *Razón:* Aumentaría masivamente la complejidad para garantizar mapas cerrados, jugables y justos. El mapa clásico repetido incrementando velocidad cumple con la experiencia arcade.
- **Descartado:** IA compleja de "Pac-Man" donde cada fantasma tiene su cuadrante. *Razón:* Simplificación aceptada por el usuario (uno persigue, tres aleatorios) para mantener el esfuerzo bajo.
- **Descartado:** Movimiento por pulsación repetida. *Razón:* En laberintos es injugable. Se adoptó el sistema de "pre-dirección", donde el personaje guarda el giro y lo ejecuta al llegar al siguiente cruce.

---

## 7 — Identified risks

- **Ghost clipping:** Si las velocidades entre personajes difieren y se actualizan por `x,y` continuo, pueden atravesar paredes al girar. *Mitigación:* Forzar a que los giros de entidades (jugador y fantasmas) solo ocurran al estar alineados (snap) perfectamente al centro de las celdas de la cuadrícula, y usar la cuadrícula para detecciones.

---

## 8 — What is not in this spec

- Controles táctiles (gestionado posteriormente por `mobile-porter`).
- Carga de imágenes externas o assets de sonido. Todo es dibujado por código.
