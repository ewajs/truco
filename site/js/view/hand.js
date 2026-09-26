// Chip con el número de mano y si es de pica pica, y el popup para corregirlo.
//
// El chip se ve cuando la app sigue las manos ("Seguir las manos" en Opciones). En
// una redonda dice "Mano 7"; en pica pica se pinta de rojo y muestra qué duelo se juega
// ("Pica pica 2/3"). Tocarlo abre la corrección: número, tipo de mano y duelo.

import { picaPicaEnabled, isPicaPicaHand, duelsPerPicaPica, tracksHands } from '../hands.js';
import { createDialog } from './dialog.js';

export function createHandChip({ dispatch }) {
  const chip = document.getElementById('hand-chip');
  const number = document.getElementById('hand-number');
  const duel = document.getElementById('hand-duel');
  const editor = createHandEditor({ dispatch });
  let current = null;
  let wasPica = null;

  chip.addEventListener('click', () => editor.open(current));

  function render(state) {
    current = state;
    chip.hidden = !tracksHands(state);
    if (chip.hidden) return;

    const pica = isPicaPicaHand(state);
    const { hand } = state;
    number.textContent = `Mano ${hand.number}`;
    duel.textContent = pica ? `${hand.duels + 1}/${duelsPerPicaPica(state.playerCount)}` : '';
    chip.classList.toggle('pica', pica);
    chip.setAttribute('aria-label', `${pica ? 'Pica pica, ' : ''}mano ${hand.number}. Tocá para corregir`);

    if (wasPica !== null && pica !== wasPica) {
      chip.classList.remove('pop');
      void chip.offsetWidth; // forzar reflow para que la animación arranque de nuevo
      chip.classList.add('pop');
    }
    wasPica = pica;
  }

  return { render };
}

// Popup de corrección. Trabaja sobre un borrador y recién "Listo" lo aplica.
function createHandEditor({ dispatch }) {
  const dialog = createDialog(document.getElementById('hand-editor'));
  const numberOutput = document.getElementById('hand-editor-number');
  const minus = document.getElementById('hand-editor-minus');
  const picaSection = document.getElementById('hand-editor-pica');
  const kindButtons = picaSection.querySelectorAll('[data-pica]');
  const duelsSection = document.getElementById('hand-editor-duels');
  const duelSeg = document.getElementById('hand-editor-duel');
  let draft = null; // { number, pica, duel, duels (cuántos hay) }

  function open(state) {
    const pica = isPicaPicaHand(state);
    draft = {
      number: state.hand.number,
      pica,
      duel: pica ? state.hand.duels + 1 : 1,
      duels: duelsPerPicaPica(state.playerCount),
    };
    picaSection.hidden = !picaPicaEnabled(state);
    duelSeg.replaceChildren(...Array.from({ length: draft.duels }, (_, i) => {
      const button = document.createElement('button');
      button.setAttribute('role', 'radio');
      button.dataset.duel = i + 1;
      button.textContent = i + 1;
      return button;
    }));
    update();
    dialog.open({ focus: document.getElementById('hand-editor-save') });
  }

  function update() {
    numberOutput.textContent = draft.number;
    minus.disabled = draft.number <= 1;
    kindButtons.forEach(button => {
      button.setAttribute('aria-checked', String((button.dataset.pica === 'true') === draft.pica));
    });
    duelsSection.hidden = !draft.pica;
    duelSeg.querySelectorAll('[data-duel]').forEach(button => {
      button.setAttribute('aria-checked', String(Number(button.dataset.duel) === draft.duel));
    });
  }

  minus.addEventListener('click', () => { draft.number = Math.max(1, draft.number - 1); update(); });
  document.getElementById('hand-editor-plus').addEventListener('click', () => { draft.number += 1; update(); });
  kindButtons.forEach(button => button.addEventListener('click', () => {
    draft.pica = button.dataset.pica === 'true';
    update();
  }));
  duelSeg.addEventListener('click', event => {
    const button = event.target.closest('[data-duel]');
    if (!button) return;
    draft.duel = Number(button.dataset.duel);
    update();
  });

  document.getElementById('hand-editor-save').addEventListener('click', () => {
    dispatch({ type: 'setHand', number: draft.number, pica: draft.pica, duel: draft.duel });
    dialog.close();
  });
  document.getElementById('hand-editor-cancel').addEventListener('click', () => dialog.close());

  return { open };
}
