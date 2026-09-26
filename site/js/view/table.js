// La mesa, en Ajustes → Partida: los jugadores sentados alrededor, de qué equipo es cada
// uno (el fondo del lugar), en qué turno juega (Mano, Segundo… Pie) y quién da (el mazo).
//
// - Tocar un lugar lo elige: debajo de la mesa aparece su nombre para cambiarlo y
//   "Hacer mano", en el mismo lugar que la ayuda (así no salta nada).
// - Con uno elegido, tocar otro los cambia de lugar (y puede que de equipo).
// - "Tirar reyes" sortea los lugares y la mano.
// Todo se aplica en el momento, también a mitad de partida.

import { seatedPlayers, dealerSeat, drawTable, seatTurn } from '../table.js';

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
  const mesa = document.getElementById('mesa');
  const hint = document.getElementById('seat-hint');
  const legends = [0, 1].map(team => document.getElementById(`legend-${team}`));
  const editor = document.getElementById('seat-editor');
  const nameInput = document.getElementById('seat-name');
  const manoButton = document.getElementById('seat-mano');
  let current = null;
  let selected = null; // lugar elegido, o null
  let seats = [];      // botones de los lugares, en orden

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
      const turn = seatTurn(state, seat);
      button.querySelector('.seat-name').textContent = name;
      button.querySelector('.seat-turn').textContent = turn;
      button.dataset.team = team;
      button.dataset.role = seat === state.manoSeat ? 'mano' : seat === dealer ? 'mazo' : '';
      button.setAttribute('aria-pressed', String(seat === selected));
      const deals = seat === dealer ? ', da' : '';
      button.setAttribute('aria-label', `${name}, ${state.teams[team].name}, ${turn}${deals}`);
    });
    legends.forEach((legend, team) => { legend.textContent = state.teams[team].name; });

    // la ayuda y el editor comparten el mismo lugar
    hint.hidden = selected !== null;
    editor.hidden = selected === null;
    if (selected !== null) {
      if (document.activeElement !== nameInput) nameInput.value = players[selected].name;
      const isMano = selected === state.manoSeat;
      manoButton.disabled = isMano;
      manoButton.textContent = isMano ? 'Es mano' : 'Hacer mano';
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
      button.innerHTML = '<span class="seat-name"></span><span class="seat-turn"></span>'
        + '<svg class="seat-icon icon-mano" aria-hidden="true"><use href="#icon-mano"/></svg>'
        + '<svg class="seat-icon icon-mazo" aria-hidden="true"><use href="#icon-mazo"/></svg>';
      mesa.append(button);
      return button;
    });
  }

  return { render };
}
