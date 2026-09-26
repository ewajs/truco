// Reglas del anotador de truco.
//
// Todo el estado de la partida vive en un objeto plano. La única forma de cambiarlo es
// `reduce(state, action)`, que devuelve un estado NUEVO (o el mismo objeto si la acción
// no cambia nada). No toca el DOM, así que se testea directo con Node.
//
// Acciones:
//   { type: 'add', team, points }        sumar puntos
//   { type: 'subtract', team }           restar un punto
//   { type: 'undo' }                     deshacer el último cambio de puntos
//   { type: 'newGame' }                  puntos a cero (conserva las ganadas)
//   { type: 'clearWins' }                ganadas a cero
//   { type: 'setTarget', target }        jugar a 15 o a 30 (reinicia si había puntos)
//   { type: 'rename', team, name }
//   { type: 'setOption', option, value }
//   { type: 'loadGame', game }           cargar una partida compartida por link (ver share.js)
//   { type: 'passMano' }                 la mano pasa al otro equipo

export const TARGETS = [15, 30];
export const POINTS_PER_GROUP = 5; // cada cuadrado de fósforos vale 5
export const HISTORY_LIMIT = 300;
export const DEFAULT_NAMES = ['Nosotros', 'Ellos'];
export const MAX_NAME_LENGTH = 14;

export function createInitialState() {
  return {
    target: 30,
    teams: DEFAULT_NAMES.map(name => ({ name, score: 0, wins: 0 })),
    history: [], // [{ team, delta }], para deshacer
    mano: 0, // equipo que es mano en esta ronda
    options: {
      showNumbers: true,
      showButtons: true,  // −, +1 y los rápidos; sin botones se usa tocar y mantener
      quickButtons: true, // +2, +3 y +4 (solo si showButtons)
      showMano: true,
      autoMano: true,     // pasar la mano sola después de anotar (solo si showMano)
      vibrate: true,
      keepAwake: false,
    },
  };
}

// ---- Consultas ----

export function winner(state) {
  const index = state.teams.findIndex(team => team.score >= state.target);
  return index === -1 ? null : index;
}

export function isFresh(state) {
  return state.teams.every(team => team.score === 0);
}

// A 30 se juega en "malas" (0 a 15) y "buenas" (15 a 30).
export function hasBuenas(target) {
  return target === 30;
}

export function groupCount(target) {
  return target / POINTS_PER_GROUP;
}

// "En malas, faltan 12" · "Faltan 5" · "Ganó"
export function standing(state, team) {
  const { target } = state;
  const { score } = state.teams[team];
  const left = target - score;
  if (left <= 0) return 'Ganó';
  if (!hasBuenas(target)) return `Faltan ${left}`;
  return score < target / 2 ? `En malas, faltan ${left}` : `En buenas, faltan ${left}`;
}

// Nombre sin espacios de más; vacío vuelve al nombre por defecto del equipo.
export function cleanName(name, team) {
  return name.trim().slice(0, MAX_NAME_LENGTH) || DEFAULT_NAMES[team];
}

// ---- Reducer ----

export function reduce(state, action) {
  switch (action.type) {
    case 'add': return addPoints(state, action.team, action.points);
    case 'subtract': return subtractPoint(state, action.team);
    case 'undo': return undo(state);
    case 'newGame': return newGame(state);
    case 'clearWins': return updateTeams(state, () => ({ wins: 0 }));
    case 'setTarget': return setTarget(state, action.target);
    case 'rename': return rename(state, action.team, action.name);
    case 'setOption': return { ...state, options: { ...state.options, [action.option]: action.value } };
    case 'loadGame': return loadGame(state, action.game);
    case 'passMano': return { ...state, mano: 1 - state.mano };
    default: throw new Error(`Acción desconocida: ${action.type}`);
  }
}

// Devuelve un estado con los equipos actualizados. `change(team, index)` devuelve los
// campos que cambian (o nada para dejar el equipo igual).
function updateTeams(state, change) {
  const teams = state.teams.map((team, index) => ({ ...team, ...change(team, index) }));
  return { ...state, teams };
}

function updateTeam(state, teamIndex, change) {
  return updateTeams(state, (team, index) => (index === teamIndex ? change(team) : {}));
}

function addPoints(state, team, points) {
  if (winner(state) !== null) return state;
  const delta = Math.min(points, state.target - state.teams[team].score); // no pasarse
  if (delta <= 0) return state;

  let next = updateTeam(state, team, t => ({ score: t.score + delta }));
  next = pushHistory(next, { team, delta });
  if (winner(next) !== null) next = updateTeam(next, team, t => ({ wins: t.wins + 1 }));
  return next;
}

function subtractPoint(state, team) {
  if (winner(state) !== null || state.teams[team].score === 0) return state;
  const next = updateTeam(state, team, t => ({ score: t.score - 1 }));
  return pushHistory(next, { team, delta: -1 });
}

function undo(state) {
  const last = state.history.at(-1);
  if (!last) return state;

  let next = updateTeam(state, last.team, t => ({ score: t.score - last.delta }));
  next = { ...next, history: state.history.slice(0, -1) };

  // Si lo que se deshace es el punto que ganó la partida, se descuenta la ganada.
  const previousWinner = winner(state);
  if (previousWinner !== null && winner(next) === null) {
    next = updateTeam(next, previousWinner, t => ({ wins: Math.max(0, t.wins - 1) }));
  }
  return next;
}

function pushHistory(state, entry) {
  return { ...state, history: [...state.history, entry].slice(-HISTORY_LIMIT) };
}

function newGame(state) {
  return { ...updateTeams(state, () => ({ score: 0 })), history: [] };
}

function setTarget(state, target) {
  if (!TARGETS.includes(target) || target === state.target) return state;
  return { ...newGame(state), target };
}

function rename(state, team, name) {
  const clean = cleanName(name, team);
  if (clean === state.teams[team].name) return state;
  return updateTeam(state, team, () => ({ name: clean }));
}

// `game` ya viene validado por share.js: { target, teams: [{ name, score, wins }] }.
// Las opciones se conservan; el historial arranca de cero.
function loadGame(state, game) {
  return { ...state, target: game.target, teams: game.teams.map(team => ({ ...team })), history: [] };
}
