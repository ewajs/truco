// Aviso del pase automático de la mano. Va arriba, sobre el encabezado: lejos de los
// tableros y los botones de sumar, que es donde está el dedo. Tiene dos formas, cada una
// con un título y abajo el detalle (los textos salen de passNotice() en hands.js):
//   - countdown(): "Terminando Mano 7…" y los puntos de la mano, con cancelar y "ya", y
//     una barra abajo que se vacía
//   - done(): "Mano 8" y quién es mano y quién da, con deshacer y cerrar, unos segundos
// Solo muestra: cuándo aparece y qué hace cada botón lo decide main.js.

import { passNotice } from '../hands.js';

const DONE_MS = 4000; // cuánto queda a la vista el aviso de la mano nueva

export function createManoToast({ onNow, onCancel, onUndo }) {
  const toast = document.getElementById('mano-toast');
  const title = document.getElementById('mano-toast-title');
  const detail = document.getElementById('mano-toast-detail');
  const bar = document.getElementById('mano-toast-bar');
  const nowButton = document.getElementById('mano-toast-now');
  const cancelButton = document.getElementById('mano-toast-cancel');
  const undoButton = document.getElementById('mano-toast-undo');
  let mode = null; // 'countdown', 'done' o null (oculto)
  let doneTimer = null;

  nowButton.addEventListener('click', onNow);
  // la cruz cancela el pase pendiente, o cierra el aviso de la mano nueva
  cancelButton.addEventListener('click', () => (mode === 'done' ? hide() : onCancel()));
  undoButton.addEventListener('click', onUndo);

  function show(nextMode, notice) {
    clearTimeout(doneTimer);
    mode = nextMode;
    toast.dataset.mode = nextMode;
    title.textContent = notice.title;
    detail.textContent = notice.detail;
    nowButton.hidden = nextMode !== 'countdown';
    undoButton.hidden = nextMode !== 'done';
    cancelButton.setAttribute('aria-label', nextMode === 'done' ? 'Cerrar' : 'Cancelar el pase');
    if (toast.hidden) {
      toast.hidden = false;
      void toast.offsetWidth; // aplicar el estado inicial para que se vea la entrada
    }
    toast.classList.add('show');
  }

  function hide() {
    if (!mode) return;
    clearTimeout(doneTimer);
    mode = null;
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      if (!mode) toast.hidden = true; // salvo que se haya vuelto a mostrar mientras salía
    }, { once: true });
  }

  return {
    // `before` y `after`: el estado ahora y cómo va a quedar con el pase.
    // `deadline`: cuándo pasa (Date.now() de ese momento).
    countdown(before, after, deadline) {
      show('countdown', passNotice(before, after).coming);
      bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
        duration: Math.max(0, deadline - Date.now()),
        easing: 'linear',
        fill: 'forwards',
      });
    },

    done(before, after) {
      show('done', passNotice(before, after).done);
      doneTimer = setTimeout(hide, DONE_MS);
    },

    hideCountdown() {
      if (mode === 'countdown') hide();
    },

    hideDone() {
      if (mode === 'done') hide();
    },
  };
}
