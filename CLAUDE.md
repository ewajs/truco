# Truco

Anotador de truco. Sitio estático (HTML + CSS + ES modules), sin build ni dependencias,
publicado en GitHub Pages con `.github/workflows/pages.yml`.

- Texto de la UI en español rioplatense (voseo: "Tocá", "Mantené").
- `js/game.js` y `js/state.js` no tocan el DOM: mantenerlos así para poder testearlos
  con `npm test` (Node, `node:test`).
- Flujo: evento → `app.actions.*` (main.js) → regla en game.js → `app.commit()`.
- Cambios de forma del estado: migrar en `normalize()`, no cambiar `STORAGE_KEY`.
- Si agregás archivos que el sitio necesita en la raíz, sumalos al paso "Armar el sitio"
  del workflow (se copian explícitamente a `_site/`).
- Probar local con `npm start` (hay que servir por HTTP por los módulos).
