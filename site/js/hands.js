// Manos, Pica Pica y pase automático de la mano. Funciones puras: se testean con Node.
// game.js las usa desde reduce(); este módulo no depende de game.js.
//
// Pasar la mano la corre al lugar siguiente de la mesa (ver table.js), y con eso al otro
// equipo.
//
// Cada pase de mano (el automático o tocando el badge) marca que terminó una mano, salvo
// que no haya habido puntos desde el pase anterior: en truco toda mano da puntos, así que
// eso es alguien corrigiendo quién es mano. Entonces solo cambia la mano, sin contar.
//
// De a 6 u 8, entre los 5 y los 25 puntos se alterna una mano redonda y una de Pica Pica.
// En el Pica Pica cada pase es un duelo terminado; la mano termina (y recién ahí pasa)
// cuando se jugaron todos los duelos.

import { nextMano, teamOfSeat } from './table.js';

export const PICA_PICA_FROM = 5;   // el Pica Pica arranca cuando alguien llega a 5…
export const PICA_PICA_UNTIL = 25; // …y se termina cuando alguien llega a 25

// Mano número `number`. `pica`: si es de Pica Pica; `duels`: duelos del Pica Pica ya
// jugados; `startScores`: puntajes al empezar la mano o el último duelo.
export function newHand(startScores, number = 1, pica = false) {
  return { number, pica, duels: 0, startScores };
}

// ---- Consultas ----

// Si la app sigue las manos. Si no, solo cuenta puntos: no hay mano, número, pase
// automático ni Pica Pica.
export function tracksHands(state) {
  return state.options.trackHands;
}

// Si se muestran los badges de mano/mazo.
export function showsMano(state) {
  return tracksHands(state) && state.options.showMano;
}

// El Pica Pica se juega de a 6 u 8, si está activado y se siguen las manos.
export function picaPicaEnabled(state) {
  return tracksHands(state) && state.options.picaPica && state.playerCount >= 6;
}

// Duelos de un Pica Pica. De a 6: cada uno contra el de enfrente (3 duelos de uno contra
// uno). De a 8: dos partidas de dos contra dos.
export function duelsPerPicaPica(playerCount) {
  return playerCount === 8 ? 2 : 3;
}

// Si la mano actual se muestra como Pica Pica.
export function isPicaPicaHand(state) {
  return picaPicaEnabled(state) && state.hand.pica;
}

// Quiénes juegan lo que se está jugando ahora: { mano, dealer, seats } (lugares de la mesa,
// ver table.js). En una redonda juegan todos: es mano el lugar de la mano y da el
// anterior. En el Pica Pica, el duelo actual:
// - de a 6, cada uno contra el de enfrente: el primer duelo es el de la mano y después
//   siguen en orden (siempre te toca el mismo rival);
// - de a 8, la mesa se parte en dos grupos de a 4 seguidos desde la mano, cada uno con
//   dos de cada equipo: primero juega el grupo de la mano.
// En cada duelo es mano el que viene primero en la ronda y da el último.
export function currentDeal(state) {
  const count = state.playerCount;
  const seat = offset => (state.manoSeat + offset) % count;
  const range = (from, length) => Array.from({ length }, (_, i) => seat(from + i));
  if (!isPicaPicaHand(state)) {
    return { mano: seat(0), dealer: seat(count - 1), seats: range(0, count) };
  }
  const first = duelOffset(count, state.hand.duels);
  if (count === 8) return { mano: seat(first), dealer: seat(first + 3), seats: range(first, 4) };
  return { mano: seat(first), dealer: seat(first + 3), seats: [seat(first), seat(first + 3)] };
}

// Cuántos lugares después de la mano arranca el duelo `duels` (desde 0) del Pica Pica.
export function duelOffset(playerCount, duels) {
  return (playerCount === 8 ? 4 : 1) * duels;
}

// ---- Acciones (las llama reduce() en game.js) ----

// { type: 'passMano' }: terminó la mano o un duelo del Pica Pica.
export function passMano(state) {
  const scores = state.teams.map(team => team.score);
  const played = scores.some((score, i) => score !== state.hand.startScores[i]);
  if (!played) return { ...state, ...nextMano(state) };

  if (isPicaPicaHand(state)) {
    const duels = state.hand.duels + 1;
    if (duels < duelsPerPicaPica(state.playerCount)) {
      return { ...state, hand: { ...state.hand, duels, startScores: scores } };
    }
  }

  const nextIsPica = picaPicaEnabled(state) && !state.hand.pica && inPicaPicaZone(scores);
  return { ...state, ...nextMano(state), hand: newHand(scores, state.hand.number + 1, nextIsPica) };
}

// { type: 'setHand', number, pica, duel }: corrección a mano de la mano actual, por si el
// conteo automático pifió: número, si es Pica Pica y en qué duelo va (desde 1). Reemplaza
// la mano actual sin tocar los puntos ni quién es mano. Los valores fuera de rango se
// ajustan al más cercano.
export function setHand(state, { number, pica, duel }) {
  const isPica = Boolean(pica) && picaPicaEnabled(state);
  const maxDuel = isPica ? duelsPerPicaPica(state.playerCount) : 1;
  const hand = {
    ...state.hand,
    number: Math.max(1, Math.round(number) || 1),
    pica: isPica,
    duels: isPica ? Math.min(maxDuel, Math.max(1, Math.round(duel) || 1)) - 1 : 0,
  };
  const same = hand.number === state.hand.number && hand.pica === state.hand.pica
    && hand.duels === state.hand.duels;
  return same ? state : { ...state, hand };
}

// { type: 'restoreHand', mano, manoSeat, hand }: vuelve a quién era mano y a la mano de
// antes de un pase (el "Deshacer" del aviso del pase automático). Los puntos no se tocan.
export function restoreHand(state, { mano, manoSeat, hand }) {
  return { ...state, mano, manoSeat, hand };
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
  const enabled = tracksHands(after) && after.options.autoMano;
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

// Cuándo aparece el aviso del pase: a mitad de la espera, y a lo sumo NOTICE_MAX_MS
// después del último punto. Así no molesta mientras se sigue anotando y tampoco tarda en
// avisar si la espera es larga.
export const NOTICE_MAX_MS = 3000;

export function noticeDelay(waitMs) {
  return Math.min(waitMs / 2, NOTICE_MAX_MS);
}

// Qué dice el aviso según lo que hace el pase (`before` → `after`), en dos líneas:
// { title, detail }. `coming` se muestra durante la espera: qué mano termina y cómo le
// fue a cada uno en ella (los puntos de esa mano, o de ese duelo en el Pica Pica).
// `done`, después del pase: qué se juega ahora y quién es mano y quién da.
export function passNotice(before, after) {
  return { coming: endingNotice(before), done: startingNotice(after) };
}

function endingNotice(state) {
  const title = `Terminando Mano ${state.hand.number}…`;
  const points = team => state.teams[team].score - state.hand.startScores[team];
  if (!isPicaPicaHand(state)) {
    return { title, detail: state.teams.map((team, i) => `${team.name} ${points(i)}`).join(' | ') };
  }
  // los del duelo, de a un equipo por lado (como en el tablero)
  const byTeam = [0, 1].map(team => currentDeal(state).seats
    .filter(seat => teamOfSeat(seat) === team)
    .map(seat => state.players[seat]));
  if (state.playerCount === 8) {
    return { title, detail: byTeam.map(names => names.join(' y ')).join(' / ') };
  }
  return { title, detail: byTeam.map(([name], team) => `${name} ${points(team)}`).join(' | ') };
}

function startingNotice(state) {
  const { hand, players } = state;
  const deal = currentDeal(state);
  let title = `Mano ${hand.number}`;
  let detail = `${players[deal.mano]} es mano. ${players[deal.dealer]} da.`;
  if (isPicaPicaHand(state)) {
    title += ` | Pica Pica | Duelo ${hand.duels + 1}/${duelsPerPicaPica(state.playerCount)}`;
    const others = deal.seats.filter(seat => seat !== deal.mano && seat !== deal.dealer);
    if (others.length) detail += ` Juegan ${others.map(seat => players[seat]).join(' y ')}`;
  }
  return { title, detail };
}

function scoreKey(state) {
  return state.teams.map(team => team.score).join('-');
}
