// Manos, pica pica y pase automático de la mano. Funciones puras: se testean con Node.
// game.js las usa desde reduce(); este módulo no depende de game.js.
//
// Pasar la mano la corre al lugar siguiente de la mesa (ver table.js), y con eso al otro
// equipo.
//
// Cada pase de mano (el automático o tocando el badge) marca que terminó una mano, salvo
// que no haya habido puntos desde el pase anterior: en truco toda mano da puntos, así que
// eso es alguien corrigiendo quién es mano. Entonces solo cambia la mano, sin contar.
//
// De a 6 u 8, entre los 5 y los 25 puntos se alterna una mano redonda y una de pica pica.
// En el pica pica cada pase es un duelo terminado; la mano termina (y recién ahí pasa)
// cuando se jugaron todos los duelos.

import { nextMano } from './table.js';

export const PICA_PICA_FROM = 5;   // el pica pica arranca cuando alguien llega a 5…
export const PICA_PICA_UNTIL = 25; // …y se termina cuando alguien llega a 25

// Mano número `number`. `pica`: si es de pica pica; `duels`: duelos del pica pica ya
// jugados; `startScores`: puntajes al empezar la mano o el último duelo.
export function newHand(startScores, number = 1, pica = false) {
  return { number, pica, duels: 0, startScores };
}

// ---- Consultas ----

// Si la app sigue las manos. Si no, solo cuenta puntos: no hay mano, número, pase
// automático ni pica pica.
export function tracksHands(state) {
  return state.options.trackHands;
}

// Si se muestran los badges de mano/mazo.
export function showsMano(state) {
  return tracksHands(state) && state.options.showMano;
}

// El pica pica se juega de a 6 u 8, si está activado y se siguen las manos.
export function picaPicaEnabled(state) {
  return tracksHands(state) && state.options.picaPica && state.playerCount >= 6;
}

// Duelos de un pica pica. De a 6: cada uno contra el de enfrente (3 duelos de uno contra
// uno). De a 8: dos partidas de dos contra dos.
export function duelsPerPicaPica(playerCount) {
  return playerCount === 8 ? 2 : 3;
}

// Si la mano actual se muestra como pica pica.
export function isPicaPicaHand(state) {
  return picaPicaEnabled(state) && state.hand.pica;
}

// ---- Acciones (las llama reduce() en game.js) ----

// { type: 'passMano' }: terminó la mano o un duelo del pica pica.
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
// conteo automático pifió: número, si es pica pica y en qué duelo va (desde 1). Reemplaza
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

// Qué dice el aviso según lo que hace el pase (`before` → `after`): pasar la mano, o
// terminar un duelo del pica pica (ahí la mano no cambia hasta que se juegan todos).
// `coming` se muestra durante la espera; `done`, después del pase.
export function passNotice(before, after) {
  if (after.mano === before.mano) {
    const total = duelsPerPicaPica(before.playerCount);
    return {
      coming: `Fin del duelo ${before.hand.duels + 1}/${total}`,
      done: `Pica pica: duelo ${after.hand.duels + 1}/${total}`,
    };
  }
  const name = after.teams[after.mano].name;
  return {
    coming: `Mano para ${name}`,
    done: isPicaPicaHand(after) ? `Es mano ${name} · Pica pica` : `Es mano ${name}`,
  };
}

function scoreKey(state) {
  return state.teams.map(team => team.score).join('-');
}
