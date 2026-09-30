# Skins de los juegos de Arcade Vault

Fuente: `components/games/*/engine.ts` y `app/play/[id]/play-room.tsx`, contrastados con los specs
de cada juego. Lo mantiene el agente `skin-designer` (`.claude/agents/skin-designer.md`): se
actualiza cada vez que se añade, renombra o quita una skin, o se integra un juego nuevo.

**Requisito:** todo juego tiene al menos `clasico` (CLÁSICO, default), `retro` (RETRO) y `neon`
(NEÓN), con contraste ≥ 3:1 contra el fondo de la skin en modo oscuro.

Última revisión: 2026-09-30

## Resumen

| ID           | Motor                          | Skins actuales                     | Default | Faltan                                                        | Selector en PlayRoom | Estado |
| ------------ | ------------------------------ | ---------------------------------- | ------- | ------------------------------------------------------------- | -------------------- | ------ |
| `asteroides` | `components/games/asteroids/`  | —                                  | —       | `clasico`, `retro`, `neon`                                    | No                   | 🔴     |
| `bloques`    | `components/games/bloques/`    | `retro`, `neon`, `pastel`, `pixel` | `retro` | `clasico` (renombrar `retro`→`clasico` y crear `retro` nuevo) | Sí                   | 🟡     |
| `rompemuros` | `components/games/rompemuros/` | —                                  | —       | `clasico`, `retro`, `neon`                                    | No                   | 🔴     |
| `serpiente`  | `components/games/serpiente/`  | —                                  | —       | `clasico`, `retro`, `neon`                                    | No                   | 🔴     |

Leyenda: 🟢 cumple · 🟡 parcial · 🔴 sin skins.

## Detalle por juego

### ASTEROIDES

- **Skins:** ninguna. Colores hard-coded en el motor (p. ej. `#0ff`, fondo `#000`).
- **Clave localStorage:** — (prevista: `arcadevault.asteroides.skin.v1`)
- **Spec:** `specs/06-juego-asteroides-real.md` (sin addendum de skins).

### BLOQUES

- **Skins:** `retro` (RETRO, default), `neon` (NEÓN), `pastel` (PASTEL), `pixel` (PIXEL ART).
- **Clave localStorage:** `arcadevault.bloques.skin.v1`
- **Spec:** `specs/08-juego-tetris-real.md` §8 (addendum "skins visuales").
- **Pendiente:** la `retro` actual pasa a ser `clasico` (default); diseñar un `retro` nuevo
  (fósforo/CRT). `pastel` y `pixel` se conservan como extras.

### ROMPEMUROS

- **Skins:** ninguna.
- **Clave localStorage:** — (prevista: `arcadevault.rompemuros.skin.v1`)
- **Spec:** `specs/10-juego-arkanoid-real.md` (sin addendum de skins).

### SERPIENTE

- **Skins:** ninguna. Fondo en damero `#0b1a10` / `#0e2014`.
- **Clave localStorage:** — (prevista: `arcadevault.serpiente.skin.v1`)
- **Spec:** `specs/11-juego-serpiente-real.md` (sin addendum de skins).

## Contrastes medidos (modo oscuro)

Peor caso por skin (color jugable vs. fondo de la skin). Lo completa `skin-designer` al
implementar.

| Juego | Skin | Peor color | Fondo | Contraste |
| ----- | ---- | ---------- | ----- | --------- |
| —     | —    | —          | —     | —         |
