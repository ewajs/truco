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
import { autoManoAfter, noticeDelay, showsMano } from './hands.js';
import { load, save } from './storage.js';
import { VIBRATION, vibrate, createWakeLock } from './device.js';
import { createScoreboard } from './view/scoreboard.js';
import { attachBoardGestures } from './view/gestures.js';
import { createSettings } from './view/settings.js';
import { createWinnerDialog } from './view/winner.js';
import { createShareDialog, createSharedGameOffer } from './view/share.js';
import { setupInstall } from './view/install.js';
import { createHelp } from './view/help.js';
import { createHandChip } from './view/hand.js';
import { createAppearance } from './view/appearance.js';
import { createManoToast } from './view/mano-toast.js';
import { createTable } from './view/table.js';
import { gameFromHash } from './share.js';

let state = load();

function dispatch(action) {
  const previous = state;
  state = reduce(state, action);
  if (state === previous) return; // la acción no cambió nada

  manoToast.hideDone(); // el "Deshacer" del último pase ya no corresponde
  save(state);
  giveFeedback(previous, state);
  render();
  scheduleManoPass(action, previous);
}

// Pase automático de la mano: qué hacer y cuándo avisar lo deciden autoManoAfter() y
// noticeDelay() (hands.js); acá se manejan los timers y el aviso.
let autoMano = null;   // pase pendiente (ver autoManoAfter)
let manoTimer = null;  // cuándo pasa
let toastTimer = null; // cuándo aparece el aviso
let lastPass = null;   // { mano, manoSeat, hand } de antes del último pase automático, para deshacerlo

function scheduleManoPass(action, previous) {
  const { pending, restart } = autoManoAfter(autoMano, action, previous, state);
  autoMano = pending;
  if (!pending || restart) stopManoWait();
  if (!restart) return;

  const wait = state.options.autoManoSeconds * 1000;
  const deadline = Date.now() + wait;
  toastTimer = setTimeout(() => {
    if (!state.options.autoManoNotice || winner(state) !== null) return;
    manoToast.countdown(state, reduce(state, { type: 'passMano' }), deadline);
  }, noticeDelay(wait));
  manoTimer = setTimeout(passManoNow, wait);
}

function stopManoWait() {
  clearTimeout(manoTimer);
  clearTimeout(toastTimer);
  manoToast.hideCountdown();
}

// Se acabó la espera o tocaron "Ya".
function passManoNow() {
  autoMano = null;
  stopManoWait();
  if (winner(state) !== null) return;
  const before = state;
  dispatch({ type: 'passMano' });
  lastPass = { mano: before.mano, manoSeat: before.manoSeat, hand: before.hand };
  if (state.options.autoManoNotice) manoToast.done(before, state);
}

// "Cancelar": no pasa esta vez. El próximo punto arranca otra espera.
function cancelManoPass() {
  autoMano = null;
  stopManoWait();
}

// ---- Vistas ----

const appearance = createAppearance();
const manoToast = createManoToast({
  onNow: passManoNow,
  onCancel: cancelManoPass,
  onUndo: () => dispatch({ type: 'restoreHand', ...lastPass }),
});
const settings = createSettings({ dispatch });
const winnerDialog = createWinnerDialog();
const handChip = createHandChip({ dispatch });
const table = createTable({ dispatch });
const shareDialog = createShareDialog();
const sharedGameOffer = createSharedGameOffer({
  onAccept: game => dispatch({ type: 'loadGame', game }),
});
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
  appearance.render(state);
  document.body.classList.toggle('hide-nums', !state.options.showNumbers);
  document.body.classList.toggle('no-quick', !state.options.quickButtons);
  document.body.classList.toggle('no-buttons', !state.options.showButtons);
  document.body.classList.toggle('hide-mano', !showsMano(state));
  undoButton.disabled = state.history.length === 0;
  scoreboard.render(state);
  settings.render(state);
  winnerDialog.render(state);
  handChip.render(state);
  table.render(state);
  shareDialog.render(state);
  wakeLock.setEnabled(state.options.keepAwake);
}

// Vibración y aviso para lectores de pantalla cuando cambia un puntaje o la mano.
function giveFeedback(previous, next) {
  if (next.mano !== previous.mano && showsMano(next)) {
    announcer.textContent = `Es mano ${next.teams[next.mano].name}`;
  }

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
    case 'setPlayerCount': return { type: 'setPlayerCount', count: Number(button.dataset.count) };
    case 'passMano': return { type: 'passMano' };
    default: throw new Error(`data-action desconocida: ${button.dataset.action}`);
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (button) dispatch(actionFor(button));
});

// Si se abrió un link con una partida compartida, ofrecer cargarla.
function offerSharedGame() {
  const game = gameFromHash(location.hash);
  if (game) sharedGameOffer.offer(game, state);
}
window.addEventListener('hashchange', offerSharedGame);

render();
offerSharedGame();
setupInstall();
createHelp();
navigator.serviceWorker?.register('sw.js');
