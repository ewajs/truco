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
//   { type: 'setPlayers', players }      de a cuántos se juega (no toca los puntos)
//   { type: 'rename', team, name }
//   { type: 'setOption', option, value }
//   { type: 'loadGame', game }           cargar una partida compartida por link (ver share.js)
//   { type: 'passMano' }                 terminó la mano (o un duelo del pica pica); ver passMano()

export const TARGETS = [15, 30];
export const PLAYERS = [2, 4, 6, 8]; // de a 8 no existe, pero se juega igual
export const POINTS_PER_GROUP = 5; // cada cuadrado de fósforos vale 5
export const HISTORY_LIMIT = 300;
export const DEFAULT_NAMES = ['Nosotros', 'Ellos'];
export const MAX_NAME_LENGTH = 14;
export const PICA_PICA_FROM = 5;  // el pica pica arranca cuando alguien llega a 5…
export const PICA_PICA_UNTIL = 25; // …y se termina cuando alguien llega a 25

export function createInitialState() {
  return {
    target: 30,
    players: 4, // de a cuántos se juega: por ahora solo se muestra, no cambia el puntaje
    teams: DEFAULT_NAMES.map(name => ({ name, score: 0, wins: 0 })),
    history: [], // [{ team, delta }], para deshacer
    mano: 0, // equipo que es mano en esta ronda
    hand: newHand([0, 0]), // la mano que se está jugando (ver passMano)
    options: {
      showNumbers: true,
      showButtons: true,  // −, +1 y los rápidos; sin botones se usa tocar y mantener
      quickButtons: true, // +2, +3 y +4 (solo si showButtons)
      showMano: true,
      autoMano: true,     // pasar la mano sola después de anotar (solo si showMano)
      picaPica: true,     // de a 6 u 8: alternar manos redondas y de pica pica
      vibrate: true,
      keepAwake: false,
    },
  };
}

// Mano número `number`. `pica`: si es de pica pica; `duels`: duelos del pica pica ya
// jugados; `startScores`: puntajes al empezar la mano o el último duelo.
export function newHand(startScores, number = 1, pica = false) {
  return { number, pica, duels: 0, startScores };
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

// El pica pica se juega de a 6 u 8, si está activado.
export function picaPicaEnabled(state) {
  return state.options.picaPica && state.players >= 6;
}

// Duelos de un pica pica. De a 6: cada uno contra el de enfrente (3 duelos de uno contra
// uno). De a 8: dos partidas de dos contra dos.
export function duelsPerPicaPica(players) {
  return players === 8 ? 2 : 3;
}

// Si la mano actual se muestra como pica pica.
export function isPicaPicaHand(state) {
  return picaPicaEnabled(state) && state.hand.pica;
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
    case 'setPlayers': return setPlayers(state, action.players);
    case 'rename': return rename(state, action.team, action.name);
    case 'setOption': return { ...state, options: { ...state.options, [action.option]: action.value } };
    case 'loadGame': return loadGame(state, action.game);
    case 'passMano': return passMano(state);
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
  return { ...updateTeams(state, () => ({ score: 0 })), history: [], hand: newHand([0, 0]) };
}

function setTarget(state, target) {
  if (!TARGETS.includes(target) || target === state.target) return state;
  return { ...newGame(state), target };
}

function setPlayers(state, players) {
  if (!PLAYERS.includes(players) || players === state.players) return state;
  return { ...state, players };
}

// "Dos contra dos"
export function playersLabel(players) {
  const perTeam = ['Uno', 'Dos', 'Tres', 'Cuatro'][players / 2 - 1];
  return `${perTeam} contra ${perTeam.toLowerCase()}`;
}

function rename(state, team, name) {
  const clean = cleanName(name, team);
  if (clean === state.teams[team].name) return state;
  return updateTeam(state, team, () => ({ name: clean }));
}

// `game` ya viene validado por share.js: { target, players?, teams: [{ name, score, wins }] }.
// Las opciones se conservan; el historial arranca de cero. Links viejos no traen players.
function loadGame(state, game) {
  return {
    ...state,
    target: game.target,
    players: game.players ?? state.players,
    teams: game.teams.map(team => ({ ...team })),
    history: [],
    hand: newHand(game.teams.map(team => team.score)),
  };
}

// ---- Manos y pica pica ----
//
// Cada pase de mano (el automático o tocando el badge) marca que terminó una mano, salvo
// que no haya habido puntos desde el pase anterior: en truco toda mano da puntos, así que
// eso es alguien corrigiendo quién es mano. Entonces solo cambia la mano, sin contar.
//
// De a 6 u 8, entre los 5 y los 25 puntos se alterna una mano redonda y una de pica pica.
// En el pica pica cada pase es un duelo terminado; la mano termina (y recién ahí pasa)
// cuando se jugaron todos los duelos.
function passMano(state) {
  const scores = state.teams.map(team => team.score);
  const played = scores.some((score, i) => score !== state.hand.startScores[i]);
  if (!played) return { ...state, mano: 1 - state.mano };

  if (isPicaPicaHand(state)) {
    const duels = state.hand.duels + 1;
    if (duels < duelsPerPicaPica(state.players)) {
      return { ...state, hand: { ...state.hand, duels, startScores: scores } };
    }
  }

  const nextIsPica = picaPicaEnabled(state) && !state.hand.pica && inPicaPicaZone(scores);
  return { ...state, mano: 1 - state.mano, hand: newHand(scores, state.hand.number + 1, nextIsPica) };
}

// Alguien llegó a 5 y nadie a 25.
function inPicaPicaZone(scores) {
  const highest = Math.max(...scores);
  return highest >= PICA_PICA_FROM && highest < PICA_PICA_UNTIL;
}

// ---- Pase automático de la mano ----
//
// Decide qué hacer con el pase automático después de cada acción. El timer vive en
// main.js; esto solo dice si hay un pase pendiente y si hay que reiniciar la espera.
//
// - Sumar arranca la espera, o la reinicia si ya había una: así se anotan tranquilos el
//   envido y el truco de la misma mano y la mano pasa recién cuando terminan.
// - Restar o deshacer son correcciones: reinician la espera pendiente pero nunca
//   arrancan una nueva (si la mano ya pasó, corregir un tap de más no la vuelve a pasar).
//   Si con correcciones se vuelve a los puntajes de antes de la mano, se cancela.
// - Pasar la mano a mano, empezar otra partida o apagar la opción cancelan lo pendiente.
//
// `pending` es null (nada pendiente) o { handStart } con los puntajes de antes del primer
// punto de la mano. Devuelve { pending, restart }.
export function autoManoAfter(pending, action, before, after) {
  // Con pica pica hace falta detectar el fin de cada mano aunque la mano no se muestre.
  const enabled = after.options.autoMano && (after.options.showMano || picaPicaEnabled(after));
  const cancels = ['passMano', 'newGame', 'setTarget', 'loadGame'].includes(action.type);
  if (!enabled || cancels) return { pending: null, restart: false };

  if (action.type === 'add') {
    return { pending: pending ?? { handStart: scoreKey(before) }, restart: true };
  }

  const isCorrection = action.type === 'subtract' || action.type === 'undo';
  if (isCorrection && pending) {
    if (scoreKey(after) === pending.handStart) return { pending: null, restart: false };
    return { pending, restart: true };
  }

  return { pending, restart: false };
}

function scoreKey(state) {
  return state.teams.map(team => team.score).join('-');
}
