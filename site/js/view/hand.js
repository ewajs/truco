// Chip con el número de mano y si es de pica pica, y el popup para corregirlo.
//
// El chip se ve cuando la app sigue las manos ("Seguir las manos" en Opciones). En
// una redonda dice "Mano 7"; en pica pica cambia de color y muestra qué duelo se juega
// ("Mano 7 ⚔ 2/3"). Abajo, en orden de la mesa, quién es mano (el primero, con la mano)
// y quién da (el último, con el mazo): en una redonda y en un duelo de uno contra uno en
// una línea; en el pica pica de a 8, los cuatro del duelo en dos líneas. Tocarlo abre la corrección: quién es mano, número, tipo de mano y
// duelo.

import {
  picaPicaEnabled, isPicaPicaHand, duelsPerPicaPica, tracksHands, currentDeal, duelOffset,
} from '../hands.js';
import { shortPlayerName } from '../table.js';
import { createDialog } from './dialog.js';

export function createHandChip({ dispatch }) {
  const chip = document.getElementById('hand-chip');
  const number = document.getElementById('hand-number');
  const duel = document.getElementById('hand-duel');
  const players = document.getElementById('hand-players');
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

    const deal = currentDeal(state);
    renderPlayers(players, state, deal);
    const who = `, es mano ${state.players[deal.mano]} y da ${state.players[deal.dealer]}`;
    chip.setAttribute('aria-label', `${pica ? 'Pica pica, ' : ''}mano ${hand.number}${who}. Tocá para corregir`);

    if (wasPica !== null && pica !== wasPica) {
      chip.classList.remove('pop');
      void chip.offsetWidth; // forzar reflow para que la animación arranque de nuevo
      chip.classList.add('pop');
    }
    wasPica = pica;
  }

  return { render };
}

// Los que juegan, en orden de la mesa: el primero con la mano y el último con el mazo. En
// una redonda solo la mano y el que da; en un duelo, todos los del duelo (de a 2 por línea).
function renderPlayers(container, state, deal) {
  const seats = isPicaPicaHand(state) ? deal.seats : [deal.mano, deal.dealer];
  const lines = [];
  for (let i = 0; i < seats.length; i += 2) {
    const line = document.createElement('span');
    line.className = 'hand-line';
    seats.slice(i, i + 2).forEach(seat => {
      const icon = seat === deal.mano ? 'icon-mano' : seat === deal.dealer ? 'icon-mazo' : null;
      if (icon) line.insertAdjacentHTML('beforeend', `<svg class="hand-icon"><use href="#${icon}"/></svg>`);
      const name = document.createElement('span');
      name.textContent = shortPlayerName(state, seat);
      line.append(name);
    });
    lines.push(line);
  }
  container.replaceChildren(...lines);
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
  const manoOutput = document.getElementById('hand-editor-mano');
  let players = [];  // los nombres de los que juegan, en orden
  let draft = null; // { mano (lugar, el mismo que muestra el chip), number, pica, duel, duels }

  function open(state) {
    const pica = isPicaPicaHand(state);
    players = state.players.slice(0, state.playerCount);
    draft = {
      mano: currentDeal(state).mano,
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
    manoOutput.textContent = players[draft.mano];
    numberOutput.textContent = draft.number;
    minus.disabled = draft.number <= 1;
    kindButtons.forEach(button => {
      button.setAttribute('aria-checked', String((button.dataset.pica === 'true') === draft.pica));
    });
    // se oculta sin sacarlo, así el popup no cambia de alto al elegir redonda o pica pica
    duelsSection.classList.toggle('off', !draft.pica);
    duelSeg.querySelectorAll('[data-duel]').forEach(button => {
      button.setAttribute('aria-checked', String(Number(button.dataset.duel) === draft.duel));
    });
  }

  const moveMano = step => {
    draft.mano = (draft.mano + step + players.length) % players.length;
    update();
  };
  document.getElementById('hand-editor-prev').addEventListener('click', () => moveMano(-1));
  document.getElementById('hand-editor-next').addEventListener('click', () => moveMano(1));
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
    // en el pica pica se elige la mano del duelo: la de la mano está unos lugares antes
    const offset = draft.pica ? duelOffset(players.length, draft.duel - 1) : 0;
    dispatch({ type: 'setManoSeat', seat: (draft.mano - offset + players.length * 4) % players.length });
    dispatch({ type: 'setHand', number: draft.number, pica: draft.pica, duel: draft.duel });
    dialog.close();
  });
  document.getElementById('hand-editor-cancel').addEventListener('click', () => dialog.close());

  return { open };
}
