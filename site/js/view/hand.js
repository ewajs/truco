// Chip con el número de mano y si es de pica pica. Solo se muestra cuando hay pica pica
// (de a 6 u 8 con la opción activada): en una redonda dice "Mano 7"; en pica pica se
// pinta del color de acento y muestra qué duelo se juega ("Pica pica 2/3").

import { picaPicaEnabled, isPicaPicaHand, duelsPerPicaPica } from '../game.js';

export function createHandChip() {
  const chip = document.getElementById('hand-chip');
  const number = document.getElementById('hand-number');
  const duel = document.getElementById('hand-duel');
  let wasPica = null;

  function render(state) {
    chip.hidden = !picaPicaEnabled(state);
    if (chip.hidden) return;

    const pica = isPicaPicaHand(state);
    const { hand } = state;
    number.textContent = `Mano ${hand.number}`;
    duel.textContent = pica ? `${hand.duels + 1}/${duelsPerPicaPica(state.players)}` : '';
    chip.classList.toggle('pica', pica);

    if (wasPica !== null && pica !== wasPica) {
      chip.classList.remove('pop');
      void chip.offsetWidth; // forzar reflow para que la animación arranque de nuevo
      chip.classList.add('pop');
    }
    wasPica = pica;
  }

  return { render };
}
