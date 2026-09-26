// La mesa: quién se sienta dónde y dónde está la mano. Funciones puras: se testean con Node.
// No depende de game.js (game.js y hands.js la usan).
//
// Los lugares se numeran en el orden en que se juega (la mano va pasando al siguiente).
// Los equipos se alternan: los lugares pares son del primer equipo y los impares del
// segundo, así cada uno queda con un rival a cada lado y el compañero enfrente, como en
// la mesa de verdad. Cambiar a dos jugadores de lugar puede cambiarlos de equipo.
//
// `players` tiene siempre MAX_PLAYERS nombres y se juega con los primeros `playerCount`:
// al cambiar de a cuántos se juega no se pierde ningún nombre. `manoSeat` es el lugar
// que es mano ahora; el que da (mezcla) es el anterior. El equipo que es mano
// (`state.mano`) siempre es el del lugar `manoSeat`.

export const MAX_PLAYERS = 8;
export const MAX_PLAYER_NAME_LENGTH = 14;

export function defaultPlayerName(seat) {
  return `Jugador ${seat + 1}`;
}

export function defaultPlayers() {
  return Array.from({ length: MAX_PLAYERS }, (_, seat) => defaultPlayerName(seat));
}

// Nombre sin espacios de más; vacío vuelve al nombre por defecto del lugar.
export function cleanPlayerName(name, seat) {
  return name.trim().slice(0, MAX_PLAYER_NAME_LENGTH) || defaultPlayerName(seat);
}

export function teamOfSeat(seat) {
  return seat % 2;
}

// Si les pusieron nombre a los jugadores (si no, todos se llaman "Jugador N" y no vale la
// pena mostrarlos).
export function hasPlayerNames(state) {
  return state.players.slice(0, state.playerCount)
    .some((name, seat) => name !== defaultPlayerName(seat));
}

// Cómo nombrar al lugar `seat` en un aviso: el jugador, o su equipo si nadie cargó nombres.
export function seatLabel(state, seat) {
  return hasPlayerNames(state) ? state.players[seat] : state.teams[teamOfSeat(seat)].name;
}

// Los que están jugando, en orden: [{ seat, name, team }].
export function seatedPlayers(state) {
  return state.players.slice(0, state.playerCount)
    .map((name, seat) => ({ seat, name, team: teamOfSeat(seat) }));
}

// El que da: el anterior a la mano (el último en jugar).
export function dealerSeat(state) {
  return (state.manoSeat - 1 + state.playerCount) % state.playerCount;
}

const TURNS = ['Mano', 'Segundo', 'Tercero', 'Cuarto', 'Quinto', 'Sexto'];

// En qué turno juega el lugar `seat` en esta mano: "Mano", "Segundo", "Tercero"… y
// "Pie" los dos últimos, que son los últimos de cada equipo en jugar (de a 2, el que
// no es mano).
export function seatTurn(state, seat) {
  const order = (seat - state.manoSeat + state.playerCount) % state.playerCount;
  return order > 0 && order >= state.playerCount - 2 ? 'Pie' : TURNS[order];
}

// La mano pasa al lugar siguiente (y con eso, al otro equipo).
export function nextMano(state) {
  const manoSeat = (state.manoSeat + 1) % state.playerCount;
  return { manoSeat, mano: teamOfSeat(manoSeat) };
}

// Al cambiar de a cuántos se juega: si el lugar de la mano ya no está, la mano queda en
// el primer lugar del mismo equipo.
export function fitManoSeat(manoSeat, playerCount) {
  return manoSeat < playerCount ? manoSeat : teamOfSeat(manoSeat);
}

// ---- Acciones (las llama reduce() en game.js) ----

// { type: 'renamePlayer', seat, name }
export function renamePlayer(state, { seat, name }) {
  if (!isSeat(state, seat)) return state;
  const clean = cleanPlayerName(name, seat);
  if (clean === state.players[seat]) return state;
  return { ...state, players: state.players.map((old, i) => (i === seat ? clean : old)) };
}

// { type: 'swapSeats', a, b }: dos jugadores cambian de lugar. La mano sigue a la
// persona: si uno de los dos era mano, sigue siéndolo en su lugar nuevo.
export function swapSeats(state, { a, b }) {
  if (!isSeat(state, a) || !isSeat(state, b) || a === b) return state;
  const players = [...state.players];
  [players[a], players[b]] = [players[b], players[a]];
  const manoSeat = state.manoSeat === a ? b : state.manoSeat === b ? a : state.manoSeat;
  return { ...state, players, manoSeat, mano: teamOfSeat(manoSeat) };
}

// { type: 'setManoSeat', seat }
export function setManoSeat(state, { seat }) {
  if (!isSeat(state, seat) || seat === state.manoSeat) return state;
  return { ...state, manoSeat: seat, mano: teamOfSeat(seat) };
}

// { type: 'setTable', players, manoSeat }: la mesa entera de una (tirar reyes).
// `players` son los que están jugando, en orden; los lugares que sobran no se tocan.
export function setTable(state, { players, manoSeat }) {
  if (players.length !== state.playerCount || !isSeat(state, manoSeat)) return state;
  const all = state.players.map((old, seat) => (seat < players.length ? players[seat] : old));
  return { ...state, players: all, manoSeat, mano: teamOfSeat(manoSeat) };
}

// ---- Tirar reyes ----

// Sortea la mesa: los que están jugando en un orden al azar y un lugar al azar como mano.
// `random` es como Math.random (en los tests, uno con semilla). Devuelve lo que necesita
// la acción setTable. Por ahora es un sorteo directo; más adelante se puede animar como
// una tirada de cartas que termine en el mismo resultado.
export function drawTable(state, random = Math.random) {
  const players = state.players.slice(0, state.playerCount);
  for (let i = players.length - 1; i > 0; i--) { // Fisher-Yates
    const j = Math.floor(random() * (i + 1));
    [players[i], players[j]] = [players[j], players[i]];
  }
  return { players, manoSeat: Math.floor(random() * players.length) };
}

function isSeat(state, seat) {
  return Number.isInteger(seat) && seat >= 0 && seat < state.playerCount;
}
