// Guardado de la partida en localStorage.
//
// La clave no cambia entre versiones: si cambia la forma del estado, se agrega una
// migración en fromSaved() para que nadie pierda la partida que tenía guardada.

import { createInitialState, TARGETS, PLAYERS } from './game.js';

export const STORAGE_KEY = 'truco-anotador-v1';
const VERSION = 2;

export function load(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) return fromSaved(JSON.parse(raw));
  } catch {
    // sin storage o JSON roto: arrancar de cero
  }
  return createInitialState();
}

export function save(state, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, ...state }));
  } catch {
    // modo privado o sin espacio: seguir sin guardar
  }
}

// Convierte lo guardado (de cualquier versión) en un estado válido.
export function fromSaved(saved) {
  const data = saved.version === VERSION ? saved : migrateFromV1(saved);
  const initial = createInitialState();
  return {
    target: TARGETS.includes(data.target) ? data.target : initial.target,
    players: PLAYERS.includes(data.players) ? data.players : initial.players,
    teams: initial.teams.map((team, i) => ({ ...team, ...data.teams?.[i] })),
    history: Array.isArray(data.history) ? data.history : [],
    mano: data.mano === 1 ? 1 : 0,
    options: { ...initial.options, ...data.options },
  };
}

// v1 (el prototipo): { target, names, scores, wins, history: [{ t, d }], opts }
function migrateFromV1(v1) {
  const opts = v1.opts ?? {};
  return {
    target: v1.target,
    teams: [0, 1].map(i => withoutUndefined({
      name: v1.names?.[i],
      score: v1.scores?.[i],
      wins: v1.wins?.[i],
    })),
    history: (v1.history ?? []).map(h => ({ team: h.t, delta: h.d })),
    options: withoutUndefined({
      showNumbers: opts.numbers,
      quickButtons: opts.quick,
      vibrate: opts.vibrate,
      keepAwake: opts.awake,
    }),
  };
}

function withoutUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}
