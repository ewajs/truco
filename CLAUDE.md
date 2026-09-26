# Truco

Anotador de truco. Sitio estático en `site/` (HTML + CSS + ES modules, sin build ni
framework), publicado en GitHub Pages por `.github/workflows/pages.yml`. Ver README para
la estructura.

- Texto de la UI en español rioplatense (voseo: "Tocá", "Mantené"). Los comentarios del
  código también van en español.
- Arquitectura: evento → `dispatch(action)` (main.js) → `reduce(state, action)` (game.js)
  → guardar + `render(state)` de cada vista. Las vistas no modifican el estado.
- `game.js`, `hands.js`, `table.js`, `storage.js`, `share.js`, `view/matches.js` y
  `boardMetrics()` (view/layout.js) no tocan el DOM: mantenerlos así, se testean
  con `npm test` (Node, `node:test`).
- Cambios en la forma del estado: validar en `isValidGame()` y subir `VERSION`
  (storage.js). Todavía no migramos: lo guardado con otra versión o inválido se
  descarta (salvo opciones y mesa, que se completan solas). No cambiar `STORAGE_KEY`.
- Botones que disparan una acción del juego: `data-action` + su `case` en `actionFor()`.
- Diálogos y hojas: siempre con `createDialog()` (view/dialog.js), nada de manejar
  Escape o el foco a mano.
- Colores: solo variables de `:root` en styles.css (así funcionan los temas). Cada tema
  (`data-palette`) define `--felt`, `--panel`, `--ink`, `--muted`, `--accent*`, `--sun*`
  (mano) y `--pica*`; su variante oscura (`data-mode="dark"`) redefine `--felt`,
  `--panel`, `--ink`, `--muted` y `--pica*`. `--danger` (borrar, reiniciar) es rojo en
  todos los temas.
- Probar: `npm test`. Local: `npm start`.
- Agregar solo lo que la necesidad pida: nada de dependencias, herramientas, capas o
  abstracciones "por si acaso". Preferir código simple y robusto. Hoy no hay tests en el
  navegador (Playwright ni similares) ni dependencias de npm: no sumarlos sin que se pidan.

## Pull requests

Sucintos y al pie: el código lo mira quien revisa; el PR le dice qué mirar. Nada de
repetir el diff ni contar el proceso. Secciones:

- **Qué cambia**: 2 a 5 viñetas, contado desde el uso.
- **Qué mirar**: dónde está lo importante o lo delicado (archivo y función) y las
  decisiones discutibles.
- **Probado**: qué se probó (tests nuevos; a mano en el navegador, en qué tamaños y
  modos) y qué **no** (por ejemplo, un iPhone de verdad).
- **Capturas**: solo si se tocó algo visible de forma significativa o se sacaron capturas
  para validar. Van commiteadas en `docs/capturas/prs/<número>/` y se enlazan con su URL
  de raw.githubusercontent.com (con el hash del commit, así no se rompen).

## Capturas de referencia

`docs/capturas/iphone/` (iPhone 15, 393×852) y `docs/capturas/samsung/` (Galaxy S24,
360×780) muestran la intención del diseño: una partida normal a 30, de a 4 con nombres
(Juan, Pedro, Ana, Sofi), en claro y en oscuro. Las usa el README. Si un cambio toca lo
que se ve en ellas, se vuelven a sacar en el mismo PR: `tablero`, `tablero-oscuro`,
`aviso` (el pase automático), `mesa` (Ajustes → Partida), `opciones` y `pica-pica` (de a
6, tema Noche, oscuro). Los casos extremos (pantallas chicas, nombres largos, de a 8)
son para validar y van solo en la carpeta del PR.
