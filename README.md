# Anotador de truco

Anotador de truco con fósforos, pensado para el celular apoyado en la mesa.
Tocá la columna de un equipo para sumar, mantené apretado para borrar.

- Partidas a 15 o a 30 (malas y buenas), de a 2, 4, 6 u 8 jugadores
- Botones +2, +3 y +4 para anotar un truco o un envido de una
- Deshacer, contador de partidas ganadas y nombres editables
- Vibración y opción de mantener la pantalla encendida
- Todo se guarda en el navegador (`localStorage`)
- Se instala como app y anda sin conexión
- Compartir el anotador o la partida actual por link
- Muestra quién es mano y la pasa sola después de anotar (3 a 12 segundos), con un aviso
  (se puede apagar) para adelantarla, cancelarla o deshacerla
- Sigue las manos: número (se corrige tocándolo) y, de a 6 u 8, pica pica entre los 5 y los 25. Se puede apagar para solo contar puntos
- Se pueden ocultar los botones y usar solo tocar y mantener
- Ayuda corta con lo básico
- Cuatro temas (Paño, Madera, Noche y Argento), cada uno claro u oscuro; por defecto sigue al celular

## Correrlo local

Es un sitio estático, sin build ni framework.

```sh
npm start        # http://localhost:8000 (usa python3)
```

Hay que servirlo por HTTP porque usa módulos de JavaScript (abrir `index.html` con
doble click no anda).

## Tests

```sh
npm test         # reglas, guardado y dibujo de fósforos (Node 22+, sin dependencias)
```

## Cómo está armado

```
site/                   lo que se publica en GitHub Pages, tal cual
  index.html            todo el markup (la columna de un equipo es un <template>)
  css/styles.css
  sw.js                 service worker: primero la red, sin conexión usa la última copia
  manifest.webmanifest  datos para instalarla como app (nombre, íconos, colores)
  js/
    main.js             arranque: estado, dispatch() y conexión de las vistas
    game.js             estado, puntaje y reduce(state, action)
    hands.js            manos, pica pica y pase automático (lo usa reduce)
    storage.js          guardar/cargar en localStorage (valida; si algo no sirve, de cero)
    share.js            partida ⇄ link (#a=30&de=4&equipo1=…&puntos1=…)
    device.js           vibración y wake lock
    view/
      dialog.js         abrir/cerrar diálogos: Escape, tocar afuera, foco (una pila)
      scoreboard.js     columnas de los equipos
      matches.js        SVG de los fósforos
      layout.js         tamaño de los cuadrados según la pantalla
      gestures.js       tocar para sumar, mantener para borrar
      settings.js       hoja de ajustes
      winner.js         cartel de ganador
      share.js          diálogo de compartir y aviso al abrir una partida compartida
      install.js        invitación a instalar la app
      help.js           ayuda (carrusel)
      hand.js           chip con el número de mano y el pica pica
      mano-toast.js     aviso del pase automático (cuenta regresiva y deshacer)
      appearance.js     tema y modo oscuro (data-palette y data-mode en <html>)
tests/                  reglas, manos y pica pica, guardado, links, fósforos, tamaño del
                        tablero e invariantes con acciones al azar
```

El flujo es siempre el mismo:

```
evento ──▶ dispatch(action) ──▶ reduce(state, action) ──▶ nuevo estado ──▶ guardar + render
```

- **El estado** es un objeto plano (`createInitialState()` en `game.js`) y es la única
  fuente de verdad.
- **`reduce(state, action)`** es la única forma de cambiarlo. Es una función pura:
  devuelve un estado nuevo, o el mismo si la acción no cambia nada. Por eso las reglas
  se testean sin navegador.
- **Las vistas** dibujan el estado con `render(state)` y avisan lo que hace el usuario
  llamando a `dispatch()`. Nunca modifican el estado.
- En el HTML, los botones con `data-action` disparan una acción directamente (ver
  `actionFor()` en `main.js`); el resto tiene un `id` y lo maneja su vista.

### Agregar una feature

1. **Estado**: agregá el campo en `createInitialState()` y su validación en
   `isValidGame()` (storage.js), y subí `VERSION`. Todavía no migramos: lo guardado con
   otra versión se descarta. Las opciones nuevas no necesitan nada de esto.
2. **Regla**: agregá un `case` en `reduce()` y su test. Si es de manos o pica pica, va en
   `hands.js`. El test de invariantes (`tests/invariants.test.js`) prueba miles de
   acciones al azar: sumá la acción nueva a `randomAction()`.
3. **UI**: un botón con `data-action` (y su `case` en `actionFor()`), o un listener en la
   vista que llame a `dispatch()`. Dibujá lo nuevo en el `render(state)` de la vista.
4. **Opción on/off**: alcanza con la clave en `options` y un
   `<input type="checkbox" data-option="nombre">` en ajustes.

## Publicación

`.github/workflows/pages.yml` corre los tests en cada PR, y en cada push a `main`
además publica la carpeta `site/` en GitHub Pages.

Configuración del repo (una sola vez): **Settings → Pages → Source: GitHub Actions**, y
en **Settings → Environments → github-pages** la rama `main` tiene que poder deployar.
