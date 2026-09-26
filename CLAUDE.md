# Truco

Anotador de truco. Sitio estático en `site/` (HTML + CSS + ES modules, sin build ni
framework), publicado en GitHub Pages por `.github/workflows/pages.yml`. El README es
para quien lo usa (presentación y manual); lo de desarrollo está acá.

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
  abstracciones "por si acaso". Preferir código simple y robusto. No hay tests en el
  navegador y la única dependencia es Playwright, de desarrollo y solo para las capturas
  (ver abajo): no sumar más sin que se pidan.

## Cómo está armado

```
site/                   lo que se publica en GitHub Pages, tal cual
  index.html            todo el markup (la columna de un equipo es un <template>)
  css/styles.css
  sw.js                 service worker: primero la red, sin conexión usa la última copia
  manifest.webmanifest  datos para instalarla como app
  js/
    main.js             arranque: estado, dispatch(), timers del pase y conexión de las vistas
    game.js             estado, puntaje y reduce(state, action)
    hands.js            manos, pica pica, duelos y pase automático (lo usa reduce)
    table.js            la mesa: lugares, equipos, turnos y tirar reyes (lo usa reduce)
    storage.js          guardar/cargar en localStorage (valida; si algo no sirve, de cero)
    share.js            partida ⇄ link (#a=30&de=4&equipo1=…&jugador1=…&mano=1)
    device.js           vibración y wake lock
    view/               una vista por archivo: dialog (abrir/cerrar, pila), scoreboard,
                        matches (SVG de fósforos), layout, gestures, settings, winner,
                        share, install, help, hand (chip y corrección), mano-toast,
                        table (la mesa), appearance (tema y modo)
tests/                  node:test: reglas, manos, pica pica, mesa, guardado, links,
                        fósforos, tamaño del tablero e invariantes con acciones al azar
scripts/capturas.mjs    capturas de referencia (ver abajo)
docs/capturas/          capturas: de referencia (iphone/, samsung/) y de cada PR (prs/<n>/)
```

El flujo es siempre el mismo:

```
evento ──▶ dispatch(action) ──▶ reduce(state, action) ──▶ nuevo estado ──▶ guardar + render
```

- El estado es un objeto plano (`createInitialState()` en `game.js`), la única fuente de
  verdad. `reduce()` es pura: devuelve un estado nuevo, o el mismo si no cambia nada.
- Las vistas dibujan con `render(state)` y avisan con `dispatch()`.
- En el HTML, los botones con `data-action` disparan una acción directo (`actionFor()` en
  `main.js`); el resto tiene un `id` y lo maneja su vista.

### Agregar una feature

1. **Estado**: el campo en `createInitialState()`, su validación en `isValidGame()` y
   subir `VERSION` (salvo opciones y mesa, ver arriba).
2. **Regla**: un `case` en `reduce()` y su test. Si es de manos o pica pica, en
   `hands.js`; si es de la mesa, en `table.js`. Sumar la acción a `randomAction()` en
   `tests/invariants.test.js`.
3. **UI**: un botón con `data-action` o un listener que llame a `dispatch()`, y dibujarlo
   en el `render(state)` de la vista.
4. **Opción**: on/off alcanza con la clave en `options` y un
   `<input type="checkbox" data-option="nombre">`; con varios valores, sumarla a
   `OPTION_CHOICES` y usar botones `data-choice` + `data-value`.

### Publicación

`pages.yml` corre `npm test` en cada PR (sin `npm install`: los tests no tienen
dependencias) y en cada push a `main` publica `site/`. En el repo: **Settings → Pages →
Source: GitHub Actions**, y en **Settings → Environments → github-pages** la rama `main`
tiene que poder deployar.

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

## Capturas

`npm run capturas` saca las de referencia en `docs/capturas/iphone/` (iPhone 15, 393×852)
y `docs/capturas/samsung/` (Galaxy S24, 360×780): muestran la intención del diseño, con
una partida normal, no los casos extremos. Las usa el README. Las escenas están
declaradas en `SCENES` (`scripts/capturas.mjs`); para sumar una, agregala ahí.

```sh
npm install                         # una vez: instala playwright (dependencia de desarrollo)
npx playwright install chromium     # una vez, si no hay un Chromium de Playwright
npm run capturas                    # todas
npm run capturas -- mesa aviso      # algunas
npm run capturas -- --out docs/capturas/prs/23 mesa   # para un PR
```

- Si un cambio toca lo que se ve en ellas, se vuelven a sacar en el mismo PR.
- Los casos extremos (pantallas chicas, nombres largos, de a 8) son para validar y van
  solo en la carpeta del PR.
- En el entorno de Claude Code en la nube npm no llega al registro; Playwright y Chromium
  ya están instalados: `mkdir -p node_modules && ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright`.
  Tampoco llega a Google Fonts, así que las capturas salen con las fuentes de reemplazo
  salvo que se habiliten `fonts.googleapis.com` y `fonts.gstatic.com` en el entorno.
