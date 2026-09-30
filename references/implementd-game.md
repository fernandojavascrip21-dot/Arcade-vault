# Juegos de Arcade Vault

Fuente: tabla `games` de Supabase, contrastada con `components/games/`.

## Jugables (implementados)

| ID           | Título     | Categoría | Clásico de referencia | Motor                          |
| ------------ | ---------- | --------- | --------------------- | ------------------------------ |
| `asteroides` | ASTEROIDES | Espacio   | Asteroids             | `components/games/asteroids/`  |
| `bloques`    | BLOQUES    | Puzzle    | Tetris                | `components/games/bloques/`    |
| `rompemuros` | ROMPEMUROS | Acción    | Arkanoid              | `components/games/rompemuros/` |
| `serpiente`  | SERPIENTE  | Clásico   | Snake                 | `components/games/serpiente/`  |

### ASTEROIDES

- **Categoría:** Espacio
- **Descripción:** Sobrevive al campo de rocas a la deriva.
- **Detalle:** Inercia pura: cada empuje del motor te sigue arrastrando. Pulveriza las rocas grandes y esquiva los fragmentos que se dispersan. El hiperespacio te salva una vez, pero nunca sabes dónde reaparecerás.

### BLOQUES

- **Categoría:** Puzzle
- **Descripción:** Encaja las piezas que caen sin dejar huecos.
- **Detalle:** Las piezas bajan cada vez más rápido y solo tienes rotación y desplazamiento para colocarlas. Completa líneas horizontales para vaciar el tablero. Cuatro líneas de golpe valen el máximo de puntos.

### ROMPEMUROS

- **Categoría:** Acción
- **Descripción:** Destruye la muralla con la pala y la bola.
- **Detalle:** Clásico de rebotes: mueve la pala y rompe cada ladrillo de la muralla antes de perder las tres vidas. Cada nivel acelera la bola y reordena los bloques. Encadena impactos sin fallar para multiplicar la puntuación.

### SERPIENTE

- **Categoría:** Clásico
- **Descripción:** Crece sin morderte la cola.
- **Detalle:** Guía a la serpiente por la rejilla y come cada punto que aparece. Con cada bocado el cuerpo se alarga y el margen de error se reduce. Un solo choque contra el muro o contra ti mismo termina la partida.

## Solo en el catálogo (sin motor de juego todavía)

Existen como filas en `games`, pero no tienen implementación jugable en `components/games/`.

| ID          | Título    | Categoría | Descripción                                       |
| ----------- | --------- | --------- | ------------------------------------------------- |
| `invasores` | INVASORES | Espacio   | Defiende la base del enjambre orbital.            |
| `laberinto` | LABERINTO | Clásico   | Come todos los puntos y escapa de los guardianes. |
