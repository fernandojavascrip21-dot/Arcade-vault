# Sugerencias de juegos — Arcade Vault

## Semáforo

| Señal | Estado del juego                    | Puntuación por criterio (1–5) | Total (máx. 40) |
| ----- | ----------------------------------- | ----------------------------- | --------------- |
| 🟢    | Jugable / Recomendado               | 4–5 · buen encaje             | 36–40 · fuerte  |
| 🟡    | En catálogo sin motor / Alternativa | 3 · aceptable, con reservas   | 32–35 · posible |
| 🔴    | Descartado                          | 1–2 · problema o bloqueo      | ≤ 31 · débil    |

## To-do de juegos

Fuente de los hechos: `references/implementd-game.md` (tabla `games` de Supabase contrastada con
`components/games/`). `[x]` = jugable en la plataforma · `[ ]` = pendiente, en orden de prioridad.

### ✅ Hechos

- [x] 🟢 **ASTEROIDES** (`asteroides`) · Espacio · Asteroids — Sobrevive al campo de rocas a la deriva. · `components/games/asteroids/`
- [x] 🟢 **BLOQUES** (`bloques`) · Puzzle · Tetris — Encaja las piezas que caen sin dejar huecos. · `components/games/bloques/`
- [x] 🟢 **ROMPEMUROS** (`rompemuros`) · Acción · Arkanoid — Destruye la muralla con la pala y la bola. · `components/games/rompemuros/`
- [x] 🟢 **SERPIENTE** (`serpiente`) · Clásico · Snake — Crece sin morderte la cola. · `components/games/serpiente/`

### ⏳ Pendientes

- [ ] 🟢 **1. INVASORES** (`invasores`) · Espacio · 39/40 · recomendado — Defiende la base del enjambre orbital. Ya en catálogo (sin migración). → `/add-game invasores`
- [ ] 🟡 **2. CIEMPIÉS** (`ciempies`) · Acción · 36/40 · alternativa — Detén al ciempiés antes de que llegue al suelo. Necesita fila nueva en `games`; no justo después de INVASORES. → `/add-game ciempies`
- [ ] 🟡 **3. LABERINTO** (`laberinto`) · Clásico · 33/40 · alternativa — Come todos los puntos y escapa de los guardianes. Ya en catálogo; esfuerzo alto (IA de guardianes). → `/add-game laberinto`

### ❌ Descartados

- 🔴 ~~DEFENSA~~ (`defensa`) · 34/40 — apuntar con teclado es lento.
- 🔴 ~~RANA~~ (`rana`) · 33/40 — satura Clásico y la puntuación depende del tiempo.
- 🔴 ~~RAQUETA~~ (`raqueta`) · 31/40 — duplica ROMPEMUROS; marcador no apto para rankings.
