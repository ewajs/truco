# Anotador de truco

Anotador de truco con fósforos, pensado para el celular apoyado en la mesa.
Tocá la columna de un equipo para sumar, mantené apretado para borrar.

- Partidas a 15 o a 30 (malas y buenas)
- Botones +2, +3 y +4 para anotar truco o envido de una
- Deshacer, contador de partidas ganadas y nombres editables
- Vibración y opción de mantener la pantalla encendida
- Todo se guarda en el navegador (`localStorage`)

## Correrlo local

Es un sitio estático sin build. Como usa módulos de JavaScript, hay que servirlo
por HTTP (abrir `index.html` con doble click no funciona):

```sh
npm start          # python3 -m http.server 8000
# abrir http://localhost:8000
```

## Tests

Las reglas del juego (`js/game.js`, `js/state.js`) son funciones puras y se testean
con el runner de Node, sin dependencias:

```sh
npm test
```

## Publicación en GitHub Pages

El workflow `.github/workflows/pages.yml` corre los tests y publica el sitio en cada
push a `main`. En los PRs solo corre los tests.

Configuración inicial (una sola vez): en el repo, **Settings → Pages → Build and
deployment → Source: GitHub Actions**.

## Estructura

```
index.html            Markup de la app (barra, cartel de ganador, hoja de ajustes)
css/styles.css        Estilos y tema claro/oscuro
js/main.js            Punto de entrada: arma `app` y conecta eventos con acciones
js/state.js           Estado por defecto, carga/guardado y migraciones (normalize)
js/game.js            Reglas: sumar, restar, deshacer, ganador, malas/buenas
js/matches.js         Dibujo SVG de los fósforos
js/layout.js          Tamaño de los cuadrados según el alto disponible
js/platform.js        Vibración y wake lock
js/ui/teams.js        Columnas de los equipos
js/ui/settings.js     Hoja de ajustes
js/ui/win.js          Cartel de ganador
js/ui/gestures.js     Long press para borrar
tests/                Tests de las reglas
```

### Cómo agregar una feature

1. **Estado nuevo**: agregalo a `DEFAULT_STATE` en `js/state.js`. `normalize()` completa
   los valores que falten en partidas guardadas, así que no hace falta cambiar la clave
   de `localStorage`.
2. **Regla nueva**: función pura en `js/game.js` que recibe el estado, lo modifica y
   devuelve un resultado (o `null` si no hubo cambio). Agregá su test en `tests/`.
3. **Acción**: sumala a `app.actions` en `js/main.js` (llama a la regla, vibra y hace
   `app.commit()`, que guarda y re-renderiza).
4. **UI**: los botones declaran `data-act="..."` (y `data-t` para el equipo); el
   `switch` de `js/main.js` los despacha. Para una opción on/off alcanza con agregar
   un `<input type="checkbox" data-opt="nombre">` en ajustes y la clave en `opts`.
