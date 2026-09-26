// Cartel de ganador: se abre solo cuando un equipo llega al puntaje de la partida.
// Sus botones (Revancha, Deshacer) usan data-action y los maneja main.js.

import { winner } from '../game.js';

export function createWinnerDialog() {
  const dialog = document.getElementById('winner');
  const title = document.getElementById('winner-title');
  const summary = document.getElementById('winner-summary');
  const rematch = document.getElementById('rematch');

  function render(state) {
    const team = winner(state);
    const shouldOpen = team !== null;

    if (shouldOpen) {
      const [left, right] = state.teams;
      title.textContent = `Ganó ${state.teams[team].name}`;
      summary.textContent = `Partidas ganadas: ${left.name} ${left.wins}, ${right.name} ${right.wins}`;
    }

    const isOpen = dialog.classList.contains('open');
    if (shouldOpen === isOpen) return;
    dialog.classList.toggle('open', shouldOpen);
    if (shouldOpen) setTimeout(() => rematch.focus({ preventScroll: true }), 50);
  }

  return { render };
}
