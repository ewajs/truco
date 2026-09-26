// Gestos sobre el tablero: tocar suma (lo maneja el click), mantener borra.
// Long press: borra uno, espera un toque y después sigue borrando cada medio segundo.

import { winner } from '../game.js';
import { BUZZ } from '../platform.js';

const HOLD_MS = 450;     // cuánto hay que mantener para el primer borrado
const PAUSE_MS = 800;    // pausa antes de empezar a repetir
const REPEAT_MS = 500;   // ritmo de borrado continuo
const MOVE_TOLERANCE = 14;

export function createBoardGestures(root, app){
  let suppressClick = false;
  let hold = null;

  function stopHold(){
    if(!hold) return;
    clearTimeout(hold.timer); clearInterval(hold.interval);
    hold.board.classList.remove('holding', 'erasing');
    hold = null;
  }
  function eraseTick(){
    if(!hold) return;
    const t = hold.t;
    if(app.state.scores[t] === 0 || winner(app.state) !== null){ stopHold(); return; }
    app.actions.sub(t);
    if(app.state.scores[t] === 0) stopHold();
  }

  root.addEventListener('pointerdown', e => {
    const board = e.target.closest('.board');
    if(!board || (e.pointerType === 'mouse' && e.button !== 0)) return;
    stopHold();
    suppressClick = false;
    const r = board.getBoundingClientRect();
    board.style.setProperty('--px', (e.clientX - r.left) + 'px');
    board.style.setProperty('--py', (e.clientY - r.top) + 'px');
    const t = +board.dataset.t;
    hold = { board, t, x: e.clientX, y: e.clientY, timer: null, interval: null };
    if(app.state.scores[t] > 0 && winner(app.state) === null) board.classList.add('holding');
    hold.timer = setTimeout(() => {
      if(!hold) return;
      suppressClick = true;             // este gesto ya no suma
      if(app.state.scores[t] === 0){ stopHold(); return; }
      board.classList.remove('holding');
      board.classList.add('erasing');
      app.buzz(BUZZ.hold);
      eraseTick();
      if(!hold) return;
      hold.timer = setTimeout(() => {
        if(!hold) return;
        eraseTick();
        if(hold) hold.interval = setInterval(eraseTick, REPEAT_MS);
      }, PAUSE_MS);
    }, HOLD_MS);
  });
  root.addEventListener('pointermove', e => {
    if(hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > MOVE_TOLERANCE){
      if(hold.board.classList.contains('erasing')) return; // ya borrando: seguir aunque el dedo se corra un poco
      stopHold();
    }
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => root.addEventListener(ev, e => {
    if(ev === 'pointerleave' && hold && hold.board.contains(e.relatedTarget)) return;
    stopHold();
  }));
  window.addEventListener('blur', stopHold);
  root.addEventListener('contextmenu', e => { if(e.target.closest('.board')) e.preventDefault(); });

  root.addEventListener('keydown', e => {
    const b = e.target.closest('.board');
    if(b && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); app.actions.add(+b.dataset.t, 1); }
  });

  // true si el click que sigue a un long press no debe sumar
  function consumeSuppressedClick(){
    const s = suppressClick;
    suppressClick = false;
    return s;
  }

  return { consumeSuppressedClick };
}
