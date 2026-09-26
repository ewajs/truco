// Reglas del anotador. Funciones puras sobre el estado: no tocan el DOM ni guardan.
// Las acciones devuelven un resultado (o null si no hubo cambio) para que la UI
// decida qué animar, vibrar o anunciar.

import { HISTORY_LIMIT, DEFAULT_STATE, TARGETS } from './state.js';

export const TEAMS = [0, 1];

export function winner(s){
  if(s.scores[0] >= s.target) return 0;
  if(s.scores[1] >= s.target) return 1;
  return null;
}

export function isEmpty(s){ return s.scores[0] + s.scores[1] === 0; }

function pushHistory(s, entry){
  s.history.push(entry);
  if(s.history.length > HISTORY_LIMIT) s.history.shift();
}

// Suma n puntos al equipo t. Devuelve { t, from, to, won } o null.
export function add(s, t, n){
  if(winner(s) !== null) return null;
  const from = s.scores[t];
  const to = Math.min(s.target, from + n);
  if(to === from) return null;
  s.scores[t] = to;
  pushHistory(s, { t, d: to - from });
  const won = to >= s.target;
  if(won) s.wins[t]++;
  return { t, from, to, won };
}

// Resta un punto al equipo t. Devuelve { t } o null.
export function sub(s, t){
  if(s.scores[t] === 0 || winner(s) !== null) return null;
  s.scores[t]--;
  pushHistory(s, { t, d: -1 });
  return { t };
}

// Deshace el último movimiento (y la partida ganada, si la había). Devuelve { t } o null.
export function undo(s){
  const h = s.history.pop();
  if(!h) return null;
  const w = winner(s);
  s.scores[h.t] = Math.max(0, Math.min(s.target, s.scores[h.t] - h.d));
  if(w !== null && winner(s) === null) s.wins[w] = Math.max(0, s.wins[w] - 1);
  return { t: h.t };
}

export function newGame(s){
  s.scores = [0, 0];
  s.history = [];
}

export function clearWins(s){ s.wins = [0, 0]; }

// Cambia a cuántos puntos se juega. Si había puntos, empieza una partida nueva.
export function setTarget(s, v){
  if(!TARGETS.includes(v) || v === s.target) return false;
  s.target = v;
  if(!isEmpty(s)) newGame(s);
  return true;
}

export function setName(s, t, v){
  s.names[t] = v.trim() || DEFAULT_STATE.names[t];
}

// Texto de cuánto le falta a un equipo ("En malas, faltan 12").
export function standing(s, t){
  const T = s.target, sc = s.scores[t];
  if(sc >= T) return 'Ganó';
  if(T === 30) return (sc < 15 ? 'En malas, faltan ' : 'En buenas, faltan ') + (T - sc);
  return `Faltan ${T - sc}`;
}

export function winsLabel(n){
  if(!n) return '';
  return n === 1 ? '1 ganada' : `${n} ganadas`;
}
