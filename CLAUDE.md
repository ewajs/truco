# Truco

Anotador de truco. Sitio estático en `site/` (HTML + CSS + ES modules, sin build ni
framework), publicado en GitHub Pages por `.github/workflows/pages.yml`. Ver README para
la estructura.

- Texto de la UI en español rioplatense (voseo: "Tocá", "Mantené"). Los comentarios del
  código también van en español.
- Arquitectura: evento → `dispatch(action)` (main.js) → `reduce(state, action)` (game.js)
  → guardar + `render(state)` de cada vista. Las vistas no modifican el estado.
- `game.js`, `storage.js`, `share.js` y `view/matches.js` no tocan el DOM: mantenerlos así, se testean
  con `npm test` (Node, `node:test`).
- Cambios en la forma del estado: subir `VERSION` y migrar en `fromSaved()` (storage.js).
  No cambiar `STORAGE_KEY`.
- Botones que disparan una acción del juego: `data-action` + su `case` en `actionFor()`.
- Probar: `npm test`. Local: `npm start`.
- Agregar solo lo que la necesidad pida: nada de dependencias, herramientas, capas o
  abstracciones "por si acaso". Preferir código simple y robusto. Hoy no hay tests en el
  navegador (Playwright ni similares) ni dependencias de npm: no sumarlos sin que se pidan.
