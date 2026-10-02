# Skins de los juegos de Arcade Vault

Fuente: `components/games/*/engine.ts` y `app/play/[id]/play-room.tsx`, contrastados con los specs
de cada juego. Lo mantiene el agente `skin-designer` (`.claude/agents/skin-designer.md`): se
actualiza cada vez que se añade, renombra o quita una skin, o se integra un juego nuevo.

**Requisito:** todo juego tiene al menos `clasico` (CLÁSICO, default), `retro` (RETRO) y `neon`
(NEÓN), con contraste ≥ 3:1 contra el fondo de la skin en modo oscuro.

Última revisión: 2026-09-30

## Resumen

| ID           | Motor                          | Skins actuales                     | Default   | Faltan                                                        | Selector en PlayRoom | Estado |
| ------------ | ------------------------------ | ---------------------------------- | --------- | ------------------------------------------------------------- | -------------------- | ------ |
| `asteroides` | `components/games/asteroids/`  | `clasico`, `retro`, `neon`         | `clasico` | —                                                             | Sí                   | 🟢     |
| `bloques`    | `components/games/bloques/`    | `retro`, `neon`, `pastel`, `pixel` | `retro`   | `clasico` (renombrar `retro`→`clasico` y crear `retro` nuevo) | Sí                   | 🟡     |
| `rompemuros` | `components/games/rompemuros/` | `clasico`, `retro`, `neon`         | `clasico` | —                                                             | Sí                   | 🟢     |
| `serpiente`  | `components/games/serpiente/`  | `clasico`, `retro`, `neon`         | `clasico` | —                                                             | Sí                   | 🟢     |

Leyenda: 🟢 cumple · 🟡 parcial · 🔴 sin skins.

## Detalle por juego

### ASTEROIDES

- **Skins:** `clasico` (CLÁSICO, default — aspecto original), `retro` (RETRO, fósforo verde +
  scanlines), `neon` (NEÓN, glow). Paletas en `SKIN_PALETTES` y glow/scanlines en
  `SKIN_RENDERERS` de `components/games/asteroids/engine.ts`; `setSkin()` redibuja incluso en
  pausa.
- **Selector:** chips SKIN del menú ⋮ OPCIONES de `PlayRoom` (`skinControl`, `isAsteroids`),
  store genérico `lib/skin-store.ts` (`createSkinStore` + `useSkin`, snapshot de servidor
  `"clasico"`).
- **Clave localStorage:** `arcadevault.asteroides.skin.v1`
- **Spec:** `specs/06-juego-asteroides-real.md` §8 (addendum "skins visuales", 2026-09-30).
- **Nota:** en CLÁSICO nave/asteroides/balas comparten `#fff` (original); se distinguen por forma.

### BLOQUES

- **Skins:** `retro` (RETRO, default), `neon` (NEÓN), `pastel` (PASTEL), `pixel` (PIXEL ART).
- **Clave localStorage:** `arcadevault.bloques.skin.v1`
- **Spec:** `specs/08-juego-tetris-real.md` §8 (addendum "skins visuales").
- **Pendiente:** la `retro` actual pasa a ser `clasico` (default); diseñar un `retro` nuevo
  (fósforo/CRT). `pastel` y `pixel` se conservan como extras.

### ROMPEMUROS

- **Skins:** `clasico` (CLÁSICO, default — spritesheet original sin cambios), `retro` (RETRO,
  fósforo verde en 5 intensidades + scanlines), `neon` (NEÓN, glow). Paletas en `SKIN_PALETTES`
  y trazo en `SKIN_RENDERERS` de `components/games/rompemuros/engine.ts` (RETRO/NEÓN dibujan
  formas con los mismos tamaños que los sprites); `setSkin()` redibuja incluso en pausa.
- **Selector:** chips SKIN del menú ⋮ OPCIONES de `PlayRoom` (`skinControl`,
  `isRompemuros`), store genérico `lib/skin-store.ts` (snapshot de servidor `"clasico"`).
- **Clave localStorage:** `arcadevault.rompemuros.skin.v1`
- **Spec:** `specs/10-juego-arkanoid-real.md` §8 (addendum "skins visuales", 2026-09-30).
- **Nota:** en CLÁSICO el ladrillo gris del spritesheet (`#323142`) queda en 1.65:1 sobre
  negro; se acepta porque CLÁSICO no altera el original.

### SERPIENTE

- **Skins:** `clasico` (CLÁSICO, default — damero verde y sprite de fruta originales), `retro`
  (RETRO, fósforo ámbar en 3 intensidades + scanlines; fruta como forma), `neon` (NEÓN, cuerpo
  cian, cabeza amarilla, fruta magenta, con glow). Paletas en `SKIN_PALETTES` y trazo en
  `SKIN_RENDERERS` (`body`/`head`/`fruit`) de `components/games/serpiente/engine.ts`;
  `setSkin()` redibuja incluso en pausa.
- **Selector:** chips SKIN del menú ⋮ OPCIONES de `PlayRoom` (`skinControl`,
  `isSerpiente`), store genérico `lib/skin-store.ts` (snapshot de servidor `"clasico"`).
- **Clave localStorage:** `arcadevault.serpiente.skin.v1`
- **Spec:** `specs/11-juego-serpiente-real.md` §8 (addendum "skins visuales", 2026-09-30).
- **Nota:** en CLÁSICO el círculo de fallback de la fruta (solo si `fruits.png` no carga) llega
  a 2.20:1 en su peor tono (`hsl(240,80%,55%)`); se acepta porque CLÁSICO no altera el original.

## Contrastes medidos (modo oscuro)

Peor caso por skin (color jugable vs. fondo de la skin). Lo completa `skin-designer` al
implementar.

| Juego        | Skin      | Peor color                                 | Fondo     | Contraste                                |
| ------------ | --------- | ------------------------------------------ | --------- | ---------------------------------------- |
| `asteroides` | `clasico` | `#0ff` (HUD)                               | `#000`    | 16.75:1                                  |
| `asteroides` | `retro`   | `#1f9e45` (asteroide)                      | `#020a04` | 5.76:1                                   |
| `asteroides` | `neon`    | `#ff2d95` (asteroide)                      | `#05050a` | 5.87:1                                   |
| `rompemuros` | `clasico` | `#323142` (ladrillo gris, sprite original) | `#000`    | 1.65:1 (excepción: original sin cambios) |
| `rompemuros` | `retro`   | `#177a31` (ladrillo cian/gris)             | `#030a05` | 3.68:1                                   |
| `rompemuros` | `neon`    | `#ff006e` (ladrillo magenta)               | `#05050a` | 5.30:1                                   |
| `serpiente`  | `clasico` | fallback fruta `hsl(240,80%,55%)`          | `#0e2014` | 2.20:1 (excepción: original sin cambios) |
| `serpiente`  | `retro`   | `#b37000` (cuerpo)                         | `#0f0a02` | 4.92:1                                   |
| `serpiente`  | `neon`    | `#ff2d95` (fruta)                          | `#0a0a14` | 5.68:1                                   |
