// Aviso del pase automático de la mano. Va arriba, sobre el encabezado: lejos de los
// tableros y los botones de sumar, que es donde está el dedo. Tiene dos formas:
//   - countdown(): "Mano para Ellos" con los segundos en un anillo que se vacía, "Cancelar" y "Ya"
//   - done(): "Es mano Ellos" con "Deshacer", unos segundos
// Solo muestra: cuándo aparece y qué hace cada botón lo decide main.js.

import { duelsPerPicaPica, isPicaPicaHand } from '../hands.js';

const DONE_MS = 4000; // cuánto queda a la vista el "Es mano…"

export function createManoToast({ onNow, onCancel, onUndo }) {
  const toast = document.getElementById('mano-toast');
  const text = document.getElementById('mano-toast-text');
  const count = document.getElementById('mano-toast-count');
  const ring = document.getElementById('mano-toast-ring');
  const nowButton = document.getElementById('mano-toast-now');
  const cancelButton = document.getElementById('mano-toast-cancel');
  const undoButton = document.getElementById('mano-toast-undo');
  let mode = null; // 'countdown', 'done' o null (oculto)
  let tick = null;
  let doneTimer = null;

  nowButton.addEventListener('click', onNow);
  cancelButton.addEventListener('click', onCancel);
  undoButton.addEventListener('click', onUndo);

  function show(nextMode, message) {
    clearInterval(tick);
    clearTimeout(doneTimer);
    mode = nextMode;
    toast.dataset.mode = nextMode;
    text.textContent = message;
    nowButton.hidden = cancelButton.hidden = nextMode !== 'countdown';
    undoButton.hidden = nextMode !== 'done';
    if (toast.hidden) {
      toast.hidden = false;
      void toast.offsetWidth; // aplicar el estado inicial para que se vea la entrada
    }
    toast.classList.add('show');
  }

  function hide() {
    if (!mode) return;
    clearInterval(tick);
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
      show('countdown', describe(before, after).coming);
      const update = () => {
        count.textContent = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
      };
      update();
      tick = setInterval(update, 200);
      ring.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 1 }], {
        duration: Math.max(0, deadline - Date.now()),
        easing: 'linear',
        fill: 'forwards',
      });
    },

    done(before, after) {
      show('done', describe(before, after).done);
      count.textContent = '';
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

// Qué dice el aviso según lo que hace el pase: pasar la mano, o terminar un duelo del
// pica pica (ahí la mano no cambia hasta que se juegan todos).
function describe(before, after) {
  if (after.mano === before.mano) {
    const total = duelsPerPicaPica(before.playerCount);
    return {
      coming: `Fin del duelo ${before.hand.duels + 1}/${total}`,
      done: `Pica pica: duelo ${after.hand.duels + 1}/${total}`,
    };
  }
  const name = after.teams[after.mano].name;
  return {
    coming: `Mano para ${name}`,
    done: isPicaPicaHand(after) ? `Es mano ${name} · Pica pica` : `Es mano ${name}`,
  };
}
