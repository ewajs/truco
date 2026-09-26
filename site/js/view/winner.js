// Cartel de ganador: se abre solo cuando un equipo llega al puntaje de la partida.
// Sus botones (Revancha, Deshacer) usan data-action y los maneja main.js.

import { winner } from '../game.js';
import { createDialog } from './dialog.js';

export function createWinnerDialog() {
  // Se cierra solo cuando cambia la partida (Revancha o Deshacer): Escape y tocar afuera
  // no hacen nada.
  const dialog = createDialog(document.getElementById('winner'), {
    onDismiss: () => {},
    dismissOnBackdrop: false,
  });
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

    if (shouldOpen) dialog.open({ focus: rematch });
    else dialog.close();
  }

  return { render };
}
