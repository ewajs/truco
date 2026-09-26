// La mesa: los jugadores sentados alrededor, de qué equipo es cada uno, quién es mano y
// quién da. Se abre con el botón de la mesa, arriba al lado de "Truco".
//
// - Tocar un lugar lo elige: abajo aparece su nombre para cambiarlo y "Es mano".
// - Con uno elegido, tocar otro los cambia de lugar (y puede que de equipo).
// - "Tirar reyes" sortea los lugares y la mano.
// Todo se aplica en el momento (también a mitad de partida); "Listo" solo cierra.

import { seatedPlayers, dealerSeat, drawTable } from '../table.js';
import { createDialog } from './dialog.js';

const DRAW_MS = 500; // cuánto dura la animación de tirar reyes (ver .mesa.drawn en CSS)

// Dónde va cada lugar (x, y en % de la mesa), en el orden en que se juega: el primero
// abajo y los siguientes hacia la derecha, como pasa la mano. Así los compañeros quedan
// enfrentados y cada uno tiene un rival a cada lado.
const SPOTS = {
  2: [[50, 90], [50, 10]],
  4: [[50, 90], [86, 50], [50, 10], [14, 50]],
  6: [[50, 92], [85, 70], [85, 30], [50, 8], [15, 30], [15, 70]],
  8: [[50, 94], [86, 75], [86, 50], [86, 25], [50, 6], [14, 25], [14, 50], [14, 75]],
};

export function createTable({ dispatch }) {
  const dialog = createDialog(document.getElementById('table'));
  const mesa = document.getElementById('mesa');
  const hint = document.getElementById('table-hint');
  const editor = document.getElementById('seat-editor');
  const nameInput = document.getElementById('seat-name');
  const manoButton = document.getElementById('seat-mano');
  let current = null;
  let selected = null; // lugar elegido, o null
  let seats = [];      // botones de los lugares, en orden

  document.getElementById('open-table').addEventListener('click', () => {
    selected = null;
    render(current);
    dialog.open({ focus: document.getElementById('table-done') });
  });
  document.getElementById('table-done').addEventListener('click', () => dialog.close());

  document.getElementById('table-draw').addEventListener('click', () => {
    selected = null;
    dispatch({ type: 'setTable', ...drawTable(current) });
    mesa.classList.remove('drawn');
    void mesa.offsetWidth; // reiniciar la animación
    mesa.classList.add('drawn');
    setTimeout(() => mesa.classList.remove('drawn'), DRAW_MS);
  });

  mesa.addEventListener('click', event => {
    const seat = event.target.closest('[data-seat]');
    if (!seat) return;
    const index = Number(seat.dataset.seat);
    if (selected === null || selected === index) {
      selected = selected === index ? null : index;
      render(current);
      return;
    }
    const other = selected;
    selected = null;
    dispatch({ type: 'swapSeats', a: other, b: index });
  });

  nameInput.addEventListener('change', () => {
    if (selected !== null) dispatch({ type: 'renamePlayer', seat: selected, name: nameInput.value });
  });
  nameInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') nameInput.blur();
  });
  manoButton.addEventListener('click', () => {
    if (selected !== null) dispatch({ type: 'setManoSeat', seat: selected });
  });

  function render(state) {
    current = state;
    const players = seatedPlayers(state);
    if (seats.length !== players.length) buildSeats(players.length);
    if (selected !== null && selected >= players.length) selected = null;

    const dealer = dealerSeat(state);
    players.forEach(({ seat, name, team }) => {
      const button = seats[seat];
      button.querySelector('.seat-name').textContent = name;
      button.querySelector('.seat-team').textContent = state.teams[team].name;
      button.dataset.team = team;
      button.dataset.role = seat === state.manoSeat ? 'mano' : seat === dealer ? 'mazo' : '';
      button.setAttribute('aria-pressed', String(seat === selected));
      const role = seat === state.manoSeat ? ', es mano' : seat === dealer ? ', da' : '';
      button.setAttribute('aria-label', `${name}, ${state.teams[team].name}${role}`);
    });

    editor.hidden = selected === null;
    hint.textContent = selected === null
      ? 'Tocá un lugar para editarlo, o dos para cambiarlos.'
      : 'Tocá otro lugar para cambiarlos de lugar.';
    if (selected !== null) {
      if (document.activeElement !== nameInput) nameInput.value = players[selected].name;
      manoButton.disabled = selected === state.manoSeat;
    }
  }

  // Los lugares alrededor de la mesa (ver SPOTS).
  function buildSeats(count) {
    seats.forEach(button => button.remove());
    mesa.dataset.count = count;
    seats = SPOTS[count].map(([x, y], seat) => {
      const button = document.createElement('button');
      button.className = 'seat';
      button.dataset.seat = seat;
      button.style.setProperty('--x', `${x}%`);
      button.style.setProperty('--y', `${y}%`);
      button.style.setProperty('--i', seat);
      button.innerHTML = '<span class="seat-name"></span><span class="seat-team"></span>'
        + '<svg class="seat-icon icon-mano" aria-hidden="true"><use href="#icon-mano"/></svg>'
        + '<svg class="seat-icon icon-mazo" aria-hidden="true"><use href="#icon-mazo"/></svg>';
      mesa.append(button);
      return button;
    });
  }

  return { render };
}
