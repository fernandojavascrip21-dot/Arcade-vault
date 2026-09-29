# Sugerencias de juegos — Arcade Vault

## Semáforo

| Señal | Estado del juego                    | Puntuación por criterio (1–5) | Total (máx. 40) |
| ----- | ----------------------------------- | ----------------------------- | --------------- |
| 🟢    | Jugable / Recomendado               | 4–5 · buen encaje             | 36–40 · fuerte  |
| 🟡    | En catálogo sin motor / Alternativa | 3 · aceptable, con reservas   | 32–35 · posible |
| 🔴    | Descartado                          | 1–2 · problema o bloqueo      | ≤ 31 · débil    |

Criterios (1–5 cada uno): C1 contrato técnico · C2 puntuación · C3 controles · C4 ritmo arcade ·
C5 estética · C6 catálogo · C7 esfuerzo (5 = bajo) · C8 propiedad intelectual.

## Resumen

| Estado         | Juegos | Qué significa                                                      |
| -------------- | ------ | ------------------------------------------------------------------ |
| ✅ Hechos      | 4      | Jugables en la plataforma (motor en `components/games/`).          |
| ⏳ Pendientes  | 4      | Aprobados, en orden de prioridad; el siguiente pasa a `/add-game`. |
| ❌ Descartados | 3      | Evaluados y rechazados; no se vuelven a proponer.                  |
| 💡 Sugerencias | 19     | Propuestas nuevas del `game-planner`, aún sin aprobar.             |

## To-do de juegos

Fuente de los hechos: `references/implementd-game.md` (tabla `games` de Supabase contrastada con
`components/games/`). `[x]` = jugable en la plataforma · `[ ]` = pendiente, en orden de prioridad.

### ✅ Hechos

- [x] 🟢 **ASTEROIDES** (`asteroides`) · Espacio · Asteroids — Sobrevive al campo de rocas a la deriva. · `components/games/asteroids/`
- [x] 🟢 **BLOQUES** (`bloques`) · Puzzle · Tetris — Encaja las piezas que caen sin dejar huecos. · `components/games/bloques/`
- [x] 🟢 **ROMPEMUROS** (`rompemuros`) · Acción · Arkanoid — Destruye la muralla con la pala y la bola. · `components/games/rompemuros/`
- [x] 🟢 **SERPIENTE** (`serpiente`) · Clásico · Snake — Crece sin morderte la cola. · `components/games/serpiente/`

### ⏳ Pendientes

- [ ] 🟢 **1. INVASORES** (`invasores`) · Espacio · 39/40 · recomendado — Defiende la base del enjambre orbital. Ya en catálogo (sin migración); reutiliza disparos de ASTEROIDES y rejilla de ROMPEMUROS. → `/add-game invasores`
- [ ] 🟡 **2. CIEMPIÉS** (`ciempies`) · Acción · 36/40 · alternativa — Detén al ciempiés antes de que llegue al suelo. Necesita fila nueva en `games`; no justo después de INVASORES. → `/add-game ciempies`
- [ ] 🟡 **3. BOMBARDERO** (`bombardero`) · Acción · 34/40 · alternativa — Arrasa la ciudad antes de tocar tierra. La ciudad debe generarse de forma procedural en cada partida para evitar repetición; fila nueva en `games`. → `/add-game bombardero`
- [ ] 🟡 **4. LABERINTO** (`laberinto`) · Clásico · 33/40 · alternativa — Come todos los puntos y escapa de los guardianes. Ya en catálogo; esfuerzo alto (IA de guardianes). → `/add-game laberinto`

### ❌ Descartados

- 🔴 ~~DEFENSA~~ (`defensa`) · 34/40 — apuntar con teclado es lento.
- 🔴 ~~RANA~~ (`rana`) · 33/40 — satura Clásico y la puntuación depende del tiempo.
- 🔴 ~~RAQUETA~~ (`raqueta`) · 31/40 — duplica ROMPEMUROS; marcador no apto para rankings.

### 💡 Sugerencias del game-planner (sin aprobar)

Propuestas nuevas, ordenadas por puntuación. Ninguna está en la tabla `games`: todas necesitan
migración. Para aprobar una, muévela a **Pendientes**; para rechazarla, a **Descartados**.
La puntuación la dio un agente distinto por enfoque, así que entre grupos es orientativa.

| #   | Señal | Juego (slug)                    | Enfoque     | Total | Frase de catálogo                                              | Riesgo principal                                       |
| --- | ----- | ------------------------------- | ----------- | ----- | -------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | 🟢    | **AUTOPISTA** (`autopista`)     | Carreras    | 39    | Esquiva el tráfico a toda velocidad.                           | Monotonía; necesita variedad de tráfico.               |
| 2   | 🟢    | **CORREDOR** (`corredor`)       | Casual      | 38    | Salta y agáchate: la pista nunca termina.                      | Se parece al dino de Chrome; protagonista propio.      |
| 3   | 🟢    | **ESCALADOR** (`escalador`)     | Plataformas | 37    | Sube la torre de vigas esquivando los barriles.                | Física del salto; evitar parecido con Donkey Kong.     |
| 4   | 🟢    | **TORRE** (`torre`)             | Casual      | 37    | Apila sin fallar y llega al cielo.                             | Se parece a BLOQUES; partidas muy cortas.              |
| 5   | 🟢    | **ARENA** (`arena`)             | Acción      | 36    | Sobrevive a las oleadas en la arena cerrada.                   | Mover y disparar a dos manos cuesta aprender.          |
| 6   | 🟢    | **EXCAVADOR** (`excavador`)     | Clásico     | 36    | Abre túneles bajo tierra y revienta a los intrusos.            | Tierra excavable y rocas que caen.                     |
| 7   | 🟢    | **ALETEO** (`aleteo`)           | Casual      | 36    | Un aleteo más… y otro, y otro.                                 | Clon de Flappy Bird; casi igual que CAVERNA.           |
| 8   | 🟡    | **DESFILADERO** (`desfiladero`) | Acción      | 35    | Abre paso a tiros por el cañón enemigo.                        | Se solapa con INVASORES; jefes suben el esfuerzo.      |
| 9   | 🟡    | **ESQUÍ** (`esqui`)             | Deportes    | 35    | Baja la montaña entre banderas y pinos.                        | La nieve blanca se ve mal en tema claro.               |
| 10  | 🟡    | **FUSIÓN** (`fusion`)           | Puzle       | 35    | Combina fichas iguales hasta que no quede hueco.               | Partidas largas sin reloj; necesita presión de tiempo. |
| 11  | 🟡    | **COLUMNAS** (`columnas`)       | Puzle       | 35    | Alinea tres gemas del mismo color antes de que lleguen arriba. | Se parece a BLOQUES; el nombre es marca de Sega.       |
| 12  | 🟡    | **PIRÁMIDE** (`piramide`)       | Puzle       | 35    | Salta por los cubos y píntalos todos antes de que te atrapen.  | Saltar en diagonal con flechas confunde.               |
| 13  | 🟡    | **CAVERNA** (`caverna`)         | Casual      | 35    | Vuela por la cueva sin rozar las paredes.                      | Casi igual que ALETEO; elegir solo uno.                |
| 14  | 🟡    | **ESQUIVA** (`esquiva`)         | Acción      | 34    | Esquiva la lluvia de proyectiles el mayor tiempo posible.      | Puntúa por tiempo, como RANA.                          |
| 15  | 🟡    | **JOYAS** (`joyas`)             | Puzle       | 33    | Intercambia joyas y encadena combos contra el reloj.           | Esfuerzo medio-alto; torpe con teclado.                |
| 16  | 🟡    | **TUBERÍAS** (`tuberias`)       | Puzle       | 33    | Conecta la tubería antes de que el fluido te alcance.          | Reglas y niveles complejos; cuesta explicarlo.         |
| 17  | 🔴    | **BURBUJAS** (`burbujas`)       | Plataformas | 33    | Encierra a los monstruos en burbujas y hazlas estallar.        | Esfuerzo alto; mejor después de ESCALADOR.             |
| 18  | 🔴    | **SECUENCIA** (`secuencia`)     | Puzle       | 32    | Repite la secuencia de luces sin fallar ni una.                | Marcador bajo y ritmo lento.                           |
| 19  | 🔴    | **MINERO** (`minero`)           | Clásico     | 29    | Recoge el oro y atrapa a los guardias en fosos.                | Niveles a mano; se solapa con LABERINTO.               |

**Antes de aprobar:**

- El catálogo solo tiene Acción, Clásico, Espacio y Puzzle. Si entran varios de Carreras o Casual,
  decidir si se crea una categoría nueva ("Carreras" o "Habilidad") o si van en Acción.
- ALETEO y CAVERNA son casi el mismo juego: quedarse con uno.
- TORRE y COLUMNAS se parecen a BLOQUES; DESFILADERO se parece a INVASORES.
