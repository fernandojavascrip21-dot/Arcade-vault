# SPEC 13 — Controles táctiles para smartphone

> **Status:** Aprovado
> **Depends on:** SPEC 06, SPEC 08, SPEC 09, SPEC 10, SPEC 11
> **Date:** 2026-09-30
> **Objective:** Añadir bajo el CRT de `/play/[id]` un "Arcade Universal Controller" táctil (D-pad, deslizador y botones de acción, con el estilo de `references/source-assets/smarphone-controllers/`) que se muestra solo en dispositivos táctiles y hace jugables en el móvil los cuatro juegos reales, enviando eventos de teclado sintéticos a los motores existentes.

---

## 1 — Por qué existe este spec

Los cuatro juegos jugables (`asteroides`, `bloques`, `rompemuros`, `serpiente`) solo responden al teclado (y Rompemuros también al ratón). En un smartphone no hay teclado, así que hoy la sala `/play/[id]` es inutilizable en el móvil: el spec 11 dejó los "controles táctiles/móviles" fuera de alcance de forma explícita.

La maqueta de referencia (`references/source-assets/smarphone-controllers/Gemini_Generated_Image_l4glgbl4glgbl4gl.jpeg`) muestra un panel "Arcade Universal Controller" debajo del juego: un D-pad octogonal con anillo, un deslizador y un grupo de 4 botones redondos, todo en cian neón sobre panel oscuro. Este spec toma ese estilo visual, pero **sin las pestañas laterales**: el modo del control se elige solo según `game.id`, y cada juego ve únicamente los controles que usa.

Todos los motores escuchan `keydown`/`keyup` en `window`. Por eso el control despacha `KeyboardEvent` sintéticos con el mismo `code`/`key` que ya entienden: los motores no cambian, salvo un único método nuevo en Rompemuros para desplazar la pala con el deslizador.

---

## 2 — Scope

**In:**

- **Componente nuevo `components/touch-controller/touch-controller.tsx`** (client component): panel "ARCADE UNIVERSAL CONTROLLER" con tres piezas opcionales: **D-pad**, **deslizador horizontal** y **botones de acción**. Recibe el `layout` del juego y solo pinta lo que ese layout declara.
- **Configuración por juego en `components/touch-controller/layouts.ts`** (datos puros, sin React), con este mapeo:
  | Juego                                                                                                                                                      | D-pad                                    | Deslizador               | Botones de acción                  |
  | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------ | ---------------------------------- |
  | `asteroides`                                                                                                                                               | ← → rotar, ↑ impulso (↓ oculto/inactivo) | —                        | DISPARO (`Space`), BOMBA (`KeyB`)  |
  | `bloques`                                                                                                                                                  | ← → mover, ↓ bajar (↑ inactivo)          | —                        | ROTAR (`ArrowUp`), CAÍDA (`Space`) |
  | `rompemuros`                                                                                                                                               | —                                        | pala (arrastre relativo) | LANZAR (`Space`)                   |
  | `serpiente`                                                                                                                                                | ← ↑ ↓ →                                  | —                        | —                                  |
  | La dificultad de Rompemuros se sigue eligiendo tocando el canvas (el `click` sintético del toque ya funciona hoy); el botón de silencio del canvas, igual. |
- **Teclado sintético** (`components/touch-controller/synthetic-keys.ts`): `pressKey(code)` / `releaseKey(code)` despachan `new KeyboardEvent("keydown"|"keyup", { code, key, bubbles: true, cancelable: true })` sobre `window`, con `key` derivado del `code` (`ArrowUp`→`"ArrowUp"`, `Space`→`" "`, `KeyB`→`"b"`), porque Serpiente lee `e.key` y el resto `e.code`. `releaseAll()` suelta todas las teclas que el control tenga pulsadas.
- **D-pad por zona**: una única zona táctil octogonal; la dirección se calcula por el ángulo del dedo respecto al centro (4 sectores de 90°, zona muerta central del 20 % del radio). Deslizar el dedo a otro sector suelta la tecla anterior y pulsa la nueva (útil en Serpiente). Las direcciones inactivas del layout no emiten nada y se pintan atenuadas.
- **Autorepeat DAS/ARR solo en Bloques** para ←, → y ↓: primer `keydown` al tocar, repetición tras **170 ms** cada **50 ms** mientras se mantiene. ROTAR y CAÍDA no repiten. En el resto de juegos, mantener pulsado = una sola `keydown` hasta la `keyup` (Asteroides y Rompemuros ya leen estado de teclas).
- **Deslizador de la pala** (Rompemuros): pista horizontal a todo el ancho del panel que funciona **en relativo, como un trackpad**: tocar no mueve la pala; arrastrar la desplaza desde su posición real `Δx_dedo / ancho_pista × 1.5` del ancho del campo (sensibilidad **1.5×**), vía `rompemurosGameRef.current.movePaddleBy(delta)`. El pulgar del deslizador muestra la posición real de la pala (la que devuelve `movePaddleBy`).
- **Lanzar con toque corto en la pista**: tocar y soltar la pista sin arrastrar (**< 200 ms** y **< 8 px** de movimiento) emite `Space` (keydown + keyup) y lanza la bola, con háptica. El botón LANZAR se mantiene como alternativa.
- **Método nuevo en el motor de Rompemuros**: `movePaddleBy(delta: number): number` en `RompemurosEngine` → `paddle.x = clamp(paddle.x + delta * GAME_WIDTH, 0, GAME_WIDTH - paddle.w)`; devuelve la posición del centro de la pala como fracción 0..1 del ancho. No mueve nada si `paused || finished` (mismo criterio que `handleMouseMove`), pero devuelve la posición actual. `rompemuros-game.tsx` lo expone por `useImperativeHandle` junto a `restart()`.
- **Multitáctil**: Pointer Events con `setPointerCapture` por pieza; D-pad y botones pueden pulsarse a la vez (p. ej. girar + disparar en Asteroides). `pointerup`, `pointercancel` y `lostpointercapture` sueltan la tecla de esa pieza.
- **Seguridad de teclas pegadas**: `releaseAll()` al desmontar el control, al pasar `paused` a `true`, al abrirse el modal de fin de partida, en `window` `blur` y en `document` `visibilitychange` (oculto).
- **Háptica**: `navigator.vibrate?.(10)` en cada pulsación inicial (no en repeticiones DAS/ARR ni en el deslizador). Donde no existe (iOS) no hace nada.
- **Anti-gestos del navegador** en el panel: `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, `onContextMenu` prevenido; así no hay scroll, zoom por doble toque ni menú contextual al mantener.
- **Visibilidad "auto + toggle"**:
  - Detección táctil con `matchMedia("(pointer: coarse)")`.
  - Preferencia en `localStorage` clave `arcadevault.touch-controls.v1` con valores `"on"` | `"off"`; ausente = automático (visible si `pointer: coarse`).
  - Ambos leídos con `useSyncExternalStore` (snapshot de servidor/hidratación = oculto), igual que la skin de Bloques: sin `localStorage` en inicializadores de `useState` ni `setState` en efectos de montaje.
  - Botón **MANDO** en la barra superior de `PlayRoom` (junto a PAUSA/FIN), visible solo en dispositivos con `pointer: coarse` y solo en los 4 juegos reales; alterna mostrar/ocultar y persiste `"on"`/`"off"`.
- **Integración en `app/play/[id]/play-room.tsx`**: el control se renderiza debajo de la `CrtFrame` solo para `isAsteroids || isBloques || isRompemuros || isSerpiente` y si la visibilidad resuelve a visible. Cuando está visible, se **oculta** la línea de ayuda de teclado (`"← → ROTAR · …"`); la etiqueta `ARCADE VAULT CRT-19` se mantiene.
- **Estilo visual** según la maqueta: panel con borde y glow cian, título "ARCADE UNIVERSAL CONTROLLER" en `font-display`, D-pad octogonal con anillo exterior y flechas, botones de acción redondos con icono + etiqueta corta (DISPARO, BOMBA, ROTAR, CAÍDA, LANZAR), estado pulsado con glow intensificado y `scale(0.94)`. Objetivos táctiles ≥ 56 px. Colores **solo con tokens** (`--cian`, `--magenta`, `--amarillo`…) para que funcione en tema claro y oscuro (spec 09) con contraste ≥ 3:1. Se diseña con `/frontend-design` (regla del proyecto).
- **Orientación**: diseñado para vertical. En horizontal se muestra igual, apilado bajo el CRT (con scroll de página si no cabe).

**Out of scope (para specs futuros):**

- Layout horizontal/landscape con controles a los lados del CRT, o pantalla completa.
- Compactar la barra superior (HUD, SKIN, PAUSA/FIN/SALIR) para móvil.
- Pestañas manuales de modo como las de la maqueta, remapeo de botones o ajustes de tamaño/opacidad del control.
- Gestos sobre el canvas (swipe para Serpiente, arrastrar la pala sobre el canvas) — más allá del `click` que ya existe.
- Soporte de Gamepad API / mandos físicos Bluetooth.
- Controles para juegos del catálogo que aún usan el simulador de `PlayRoom`.
- Cambios en mecánicas, puntuaciones, Supabase, skins o `saveScoreAction`.
- Sonidos de pulsación.

---

## 3 — Modelo de datos

No hay datos de dominio nuevos ni cambios en Supabase. Estructuras de cliente:

```ts
// components/touch-controller/layouts.ts
export type KeyCode =
  "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space" | "KeyB";

export type DpadDirection = "up" | "down" | "left" | "right";

export type ActionIcon = "fire" | "bomb" | "rotate" | "drop" | "launch";

export type TouchAction = {
  id: string; // "fire", "bomb", "rotate", "drop", "launch"
  label: string; // "DISPARO", "BOMBA", "ROTAR", "CAÍDA", "LANZAR"
  code: KeyCode;
  icon: ActionIcon;
};

export type TouchLayout = {
  dpad?: Partial<Record<DpadDirection, KeyCode>>; // direcciones ausentes = inactivas
  repeat?: { delayMs: number; intervalMs: number; codes: KeyCode[] }; // DAS/ARR
  paddleSlider?: boolean;
  actions: TouchAction[];
};

export const TOUCH_LAYOUTS: Record<
  "asteroides" | "bloques" | "rompemuros" | "serpiente",
  TouchLayout
>;
// bloques.repeat = { delayMs: 170, intervalMs: 50, codes: ["ArrowLeft", "ArrowRight", "ArrowDown"] }
```

```ts
// components/touch-controller/touch-controller.tsx
type TouchControllerProps = {
  layout: TouchLayout;
  disabled: boolean; // paused || modal de fin abierto → releaseAll + sin emitir
  // solo si layout.paddleSlider: delta en fracción del ancho del campo → centro de la pala 0..1
  onPaddleMove?: (delta: number) => number | undefined;
};
```

```ts
// components/games/rompemuros/engine.ts — añadido a RompemurosEngine
movePaddleBy(delta: number): number; // delta en fracción del ancho; devuelve el centro 0..1
```

Persistencia (solo navegador):

| Clave `localStorage`            | Valores           | Ausente                                    |
| ------------------------------- | ----------------- | ------------------------------------------ |
| `arcadevault.touch-controls.v1` | `"on"` \| `"off"` | automático: visible si `(pointer: coarse)` |

---

## 4 — Plan de implementación

1. Crear `components/touch-controller/layouts.ts` con los tipos y `TOUCH_LAYOUTS` de los 4 juegos, y `components/touch-controller/synthetic-keys.ts` con `pressKey`, `releaseKey`, `releaseAll` (conjunto interno de teclas pulsadas, `key` derivado del `code`). Sin UI todavía; `npm run lint` pasa.
2. Añadir `movePaddleBy(delta)` a `RompemurosEngine` y exponerlo en `rompemuros-game.tsx` vía `useImperativeHandle`. El juego en escritorio no cambia.
3. Crear `components/touch-controller/touch-controller.tsx` (usando `/frontend-design`): panel, D-pad por zona angular con zona muerta y cambio de sector, botones de acción con Pointer Events y `setPointerCapture`, deslizador horizontal relativo (1.5×) con toque corto para lanzar, DAS/ARR según `layout.repeat`, háptica, anti-gestos y `releaseAll()` en `disabled`, desmontaje, `blur` y `visibilitychange`. Estilos solo con tokens de tema.
4. Crear el hook de visibilidad (en `components/touch-controller/use-touch-controls.ts`): `useSyncExternalStore` para `(pointer: coarse)` y para la clave `arcadevault.touch-controls.v1` (con fallback en memoria si `localStorage` falla); devuelve `{ isCoarse, visible, toggle }`. Snapshot de servidor: `isCoarse = false`, `visible = false`.
5. Integrar en `app/play/[id]/play-room.tsx`: botón MANDO en la barra superior (solo `isCoarse` y juego real), `<TouchController>` bajo la `CrtFrame` con el layout de `game.id`, `disabled={paused || modal de fin abierto}`, `onPaddleMove` → `rompemurosGameRef.current?.movePaddleBy` para Rompemuros; ocultar la línea de ayuda de teclado cuando el control es visible.
6. Verificar en móvil real o emulación táctil (DevTools / Playwright con `hasTouch` y viewport ~390×844) los 4 juegos de principio a fin (jugar, pausar, fin de partida, guardar, JUGAR DE NUEVO) en tema oscuro y claro; verificar escritorio sin cambios. Ejecutar `npm run lint` y `npm run build`.
7. Actualizar `CLAUDE.md` (sección Games: control táctil, clave `localStorage`, `movePaddleBy`) y marcar este spec como `Implementado`.

---

## 5 — Criterios de aceptación

- [ ] En un viewport táctil (`pointer: coarse`), `/play/asteroides`, `/play/bloques`, `/play/rompemuros` y `/play/serpiente` muestran el panel "ARCADE UNIVERSAL CONTROLLER" debajo del CRT.
- [ ] En escritorio (ratón, `pointer: fine`) no aparece ni el panel ni el botón MANDO, y los 4 juegos se juegan con teclado/ratón exactamente como antes.
- [ ] Cada juego muestra solo las piezas de su fila en la tabla de mapeo (§2); las direcciones inactivas del D-pad se ven atenuadas y no emiten teclas.
- [ ] Asteroides: mantener ← o → rota de forma continua, ↑ impulsa, DISPARO dispara y BOMBA lanza la bomba nova; girar y disparar a la vez funciona (multitáctil).
- [ ] Bloques: un toque en ← / → mueve una columna; mantenerlo repite tras ~170 ms cada ~50 ms; ↓ baja con repetición; ROTAR rota una vez por toque; CAÍDA hace caída dura una vez por toque.
- [ ] Rompemuros: la dificultad se elige tocando el canvas; tocar el deslizador no mueve la pala; arrastrar la desplaza desde donde está (1.5× el recorrido del dedo relativo a la pista) sin saltos; el pulgar refleja la posición real de la pala; un toque corto en la pista lanza la bola; LANZAR también la lanza.
- [ ] Serpiente: las 4 direcciones del D-pad giran la serpiente; deslizar el dedo de un sector a otro cambia de dirección sin levantarlo.
- [ ] Ninguna tecla queda "pegada": al pausar, al abrirse el modal de fin, al cambiar de pestaña o al levantar el dedo fuera del botón, el juego deja de recibir la acción.
- [ ] Mantener pulsado o hacer doble toque en el panel no provoca scroll, zoom ni menú contextual.
- [ ] El botón MANDO oculta/muestra el panel y la elección sobrevive a recargar la página (`arcadevault.touch-controls.v1`).
- [ ] Con el panel visible, la línea de ayuda de teclado bajo el CRT no se muestra; con el panel oculto, sí.
- [ ] En Android con vibración disponible, cada pulsación inicial produce una vibración corta; en iOS no hay errores en consola.
- [ ] El panel es legible y con contraste ≥ 3:1 en tema oscuro y en tema claro.
- [ ] No hay errores de hidratación en consola al cargar `/play/[id]` en móvil ni en escritorio.
- [ ] Ningún archivo `engine.ts` cambia salvo `components/games/rompemuros/engine.ts` (solo `movePaddleBy`).
- [ ] `npm run lint` y `npm run build` pasan sin errores.

---

## 6 — Decisiones tomadas y descartadas

- **Teclado sintético en lugar de una API virtual por motor.** Los 4 motores ya escuchan `keydown`/`keyup` en `window`; despachar `KeyboardEvent` con el mismo `code`/`key` los hace jugables sin tocarlos. Descartado: añadir `press/release(action)` a cada motor (más limpio a largo plazo, pero toca 4 motores y 4 wrappers).
- **Excepción única: `movePaddleBy` en Rompemuros.** El arrastre de la pala no se puede expresar con teclas (solo darían velocidad fija). Descartado: botones ←/→ (impreciso) y arrastrar sobre el canvas (el dedo tapa la pala y choca con el `click` que lanza/elige dificultad).
- **Deslizador relativo (trackpad) en lugar de absoluto** (cambio del 2026-09-30, durante la implementación): con el mapeo absoluto 1:1 la pala saltaba a donde caía el dedo y era impreciso. `movePaddleBy` parte de la posición real de la pala, así que sigue sincronizado aunque se use el teclado o se reinicie la partida. Descartado: que el control guarde su propia posición y siga usando `setPaddleX` (se desincroniza al reiniciar). `setPaddleX` se elimina.
- **Sensibilidad 1.5×**: recorrer 2/3 de la pista cruza todo el campo; descartados 1× (demasiado recorrido de dedo) y 2× (demasiado brusco).
- **Lanzar con toque corto en la pista** (< 200 ms, < 8 px): el mismo pulgar mueve y lanza, sin cruzar al botón LANZAR, que se mantiene como alternativa. Descartado: solo agrandar LANZAR.
- **Deslizador horizontal**, no vertical como en la maqueta: la pala se mueve en horizontal, así que el arrastre es intuitivo.
- **Universal con modo automático por `game.id`**, sin las pestañas laterales de la maqueta: el juego ya se conoce, elegir modo a mano sería un paso inútil y propenso a errores.
- **Visibilidad por `(pointer: coarse)` + toggle MANDO persistido.** Descartado: por ancho de pantalla (mostraría el control en ventanas estrechas de escritorio y lo ocultaría en tablets) y solo automático (sin forma de ocultarlo con teclado Bluetooth).
- **`useSyncExternalStore` con snapshot de servidor oculto**, mismo patrón que la skin de Bloques, para evitar errores de hidratación y la regla `react-hooks/set-state-in-effect`.
- **DAS/ARR solo en Bloques (170 ms / 50 ms).** Asteroides y Rompemuros leen estado de teclas (mantener = keydown hasta keyup); Serpiente no necesita repetición.
- **D-pad por zona angular** en vez de 4 botones independientes: permite deslizar entre direcciones, esencial en Serpiente.
- **Tokens de tema** en lugar de neón oscuro fijo: el sitio soporta tema claro (spec 09) y todo el color va por tokens.
- **Háptica sutil (`vibrate(10)`)** opcional: ayuda en Android, es inocua donde no existe.
- **Solo vertical** en este spec; el layout horizontal y compactar el HUD móvil quedan para specs futuros.
- **Se oculta la ayuda de teclado** cuando el panel está visible: en móvil no aplica y los botones llevan su propia etiqueta.

---

## 7 — Riesgos identificados

- **Eventos sintéticos no confiables (`isTrusted = false`).** Si algún motor filtrara por `isTrusted`, ignoraría el control. Hoy ninguno lo hace; el paso 6 lo verifica en los 4 juegos.
- **Teclas pegadas** si se pierde un `pointerup` (notificación del sistema, cambio de app). Mitigación: `pointercancel`, `lostpointercapture`, `blur`, `visibilitychange` y `disabled` llaman a `releaseAll()`.
- **Espacio vertical en móvil**: barra superior + CRT 16:10 + panel pueden no caber en pantallas bajas, obligando a scroll durante la partida. Aceptado en este spec (el panel bloquea el scroll táctil sobre sí mismo); compactar el HUD queda para otro spec.
- **Detección `(pointer: coarse)`**: dispositivos híbridos (portátil táctil) pueden reportar `fine` y no mostrar el control automáticamente; el toggle MANDO solo aparece con `coarse`, así que en ese caso no hay forma de activarlo. Aceptado; se puede revisar si aparece el caso.
- **iOS Safari**: sin `navigator.vibrate` y con gestos agresivos de zoom; se depende de `touch-action: none` en el panel.

---

## Lo que **no** entra en este spec

- Layout horizontal, pantalla completa o controles a los lados del CRT.
- Compactar la barra superior para móvil.
- Pestañas de modo, remapeo o personalización del control.
- Gestos sobre el canvas y Gamepad API.
- Cambios en mecánicas, puntuaciones, skins o Supabase.
