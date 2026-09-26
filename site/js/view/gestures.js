// Gestos sobre un tablero de fósforos:
//   - tocar (o Enter/Espacio) → onTap()
//   - mantener apretado       → borra un punto, espera un momento y sigue borrando
//                               cada medio segundo hasta que se suelta

const HOLD_MS = 450;    // cuánto hay que mantener para el primer borrado
const PAUSE_MS = 800;   // pausa antes de empezar a repetir
const REPEAT_MS = 500;  // ritmo de borrado continuo
const MOVE_TOLERANCE_PX = 14;

export function attachBoardGestures(board, { onTap, onErase, onEraseStart, canErase }) {
  let hold = null;           // { x, y, timer, interval, erasing }
  let ignoreNextClick = false; // el click que llega al soltar un long press no suma

  function startHold(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    stopHold();
    ignoreNextClick = false;

    const rect = board.getBoundingClientRect();
    board.style.setProperty('--px', `${event.clientX - rect.left}px`);
    board.style.setProperty('--py', `${event.clientY - rect.top}px`);

    hold = { x: event.clientX, y: event.clientY, erasing: false };
    if (canErase()) board.classList.add('holding');
    hold.timer = setTimeout(startErasing, HOLD_MS);
  }

  function startErasing() {
    ignoreNextClick = true;
    if (!canErase()) return stopHold();

    hold.erasing = true;
    board.classList.replace('holding', 'erasing');
    onEraseStart();
    eraseOne();
    hold.timer = setTimeout(() => {
      eraseOne();
      if (hold) hold.interval = setInterval(eraseOne, REPEAT_MS);
    }, PAUSE_MS);
  }

  function eraseOne() {
    if (!hold) return;
    onErase();
    if (!canErase()) stopHold();
  }

  function stopHold() {
    if (!hold) return;
    clearTimeout(hold.timer);
    clearInterval(hold.interval);
    board.classList.remove('holding', 'erasing');
    hold = null;
  }

  function cancelIfMoved(event) {
    if (!hold || hold.erasing) return; // ya borrando: seguir aunque el dedo se corra un poco
    const distance = Math.hypot(event.clientX - hold.x, event.clientY - hold.y);
    if (distance > MOVE_TOLERANCE_PX) stopHold();
  }

  board.addEventListener('pointerdown', startHold);
  board.addEventListener('pointermove', cancelIfMoved);
  board.addEventListener('pointerup', stopHold);
  board.addEventListener('pointercancel', stopHold);
  board.addEventListener('pointerleave', stopHold);
  window.addEventListener('blur', stopHold);
  board.addEventListener('contextmenu', event => event.preventDefault());

  board.addEventListener('click', () => {
    if (ignoreNextClick) {
      ignoreNextClick = false;
      return;
    }
    onTap();
  });

  board.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onTap();
    }
  });
}
