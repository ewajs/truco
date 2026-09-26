// Punto de entrada.
//
// Cómo fluye todo:
//
//   evento del usuario ──▶ dispatch(action) ──▶ reduce(state, action) ──▶ nuevo estado
//                                                                        │
//                                   guardar · vibrar · anunciar · render ◀┘
//
// `state` es la única fuente de verdad. Las vistas nunca lo modifican: solo lo dibujan
// y avisan lo que hizo el usuario llamando a dispatch().

import { reduce, winner } from './game.js';
import { load, save } from './storage.js';
import { VIBRATION, vibrate, createWakeLock } from './device.js';
import { createScoreboard } from './view/scoreboard.js';
import { attachBoardGestures } from './view/gestures.js';
import { createSettings } from './view/settings.js';
import { createWinnerDialog } from './view/winner.js';

let state = load();

function dispatch(action) {
  const previous = state;
  state = reduce(state, action);
  if (state === previous) return; // la acción no cambió nada

  save(state);
  giveFeedback(previous, state);
  render();
}

// ---- Vistas ----

const settings = createSettings({ dispatch });
const winnerDialog = createWinnerDialog();
const scoreboard = createScoreboard(document.getElementById('teams'), {
  onNameClick: team => settings.open(team),
});
const undoButton = document.getElementById('undo-button');
const announcer = document.getElementById('announcer');
const wakeLock = createWakeLock();

scoreboard.boards.forEach((board, team) => {
  attachBoardGestures(board, {
    onTap: () => dispatch({ type: 'add', team, points: 1 }),
    onErase: () => dispatch({ type: 'subtract', team }),
    onEraseStart: () => state.options.vibrate && vibrate(VIBRATION.holdStart),
    canErase: () => state.teams[team].score > 0 && winner(state) === null,
  });
});

function render() {
  document.body.classList.toggle('hide-nums', !state.options.showNumbers);
  document.body.classList.toggle('no-quick', !state.options.quickButtons);
  undoButton.disabled = state.history.length === 0;
  scoreboard.render(state);
  settings.render(state);
  winnerDialog.render(state);
  wakeLock.setEnabled(state.options.keepAwake);
}

// Vibración y aviso para lectores de pantalla cuando cambia un puntaje.
function giveFeedback(previous, next) {
  const changed = next.teams.findIndex((team, i) => team.score !== previous.teams[i].score);
  if (changed === -1) return;

  const team = next.teams[changed];
  announcer.textContent = `${team.name} ${team.score}`;

  if (!next.options.vibrate) return;
  if (winner(previous) === null && winner(next) !== null) vibrate(VIBRATION.win);
  else if (team.score > previous.teams[changed].score) vibrate(VIBRATION.point);
  else vibrate(VIBRATION.erase);
}

// ---- Botones con data-action ----

// Traduce un botón con data-action (ver index.html) a una acción del juego.
function actionFor(button) {
  const column = button.closest('[data-team]');
  const team = column ? Number(column.dataset.team) : null;

  switch (button.dataset.action) {
    case 'add': return { type: 'add', team, points: Number(button.dataset.points) };
    case 'subtract': return { type: 'subtract', team };
    case 'undo': return { type: 'undo' };
    case 'newGame': return { type: 'newGame' };
    case 'setTarget': return { type: 'setTarget', target: Number(button.dataset.target) };
    default: throw new Error(`data-action desconocida: ${button.dataset.action}`);
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (button) dispatch(actionFor(button));
});

render();
