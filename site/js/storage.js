// Guardado de la partida en localStorage.
//
// Todavía no migramos versiones viejas: si lo guardado es de otra versión o tiene algo
// inválido, se descarta y se arranca de cero. Si cambia la forma del estado, subí VERSION.
//
// Las opciones y la mesa son la excepción: se completan si faltan y se descartan si no
// sirven, así agregarlas no borró la partida de nadie.

import { createInitialState, TARGETS, PLAYER_COUNTS, HISTORY_LIMIT, OPTION_CHOICES } from './game.js';
import { duelsPerPicaPica } from './hands.js';
import { cleanPlayerName, teamOfSeat } from './table.js';

export const STORAGE_KEY = 'truco-anotador-v1';
const VERSION = 3;

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

// Convierte lo guardado en un estado válido, o en uno nuevo si no se puede usar.
export function fromSaved(saved) {
  const initial = createInitialState();
  if (saved?.version !== VERSION || !isValidGame(saved)) return initial;
  return {
    target: saved.target,
    playerCount: saved.playerCount,
    teams: saved.teams.map(({ name, score, wins }) => ({ name, score, wins })),
    history: saved.history.map(({ team, delta }) => ({ team, delta })),
    mano: saved.mano,
    hand: { ...saved.hand, startScores: [...saved.hand.startScores] },
    options: knownOptions(initial.options, saved.options),
    ...knownTable(initial, saved),
  };
}

// La mesa guardada: los nombres que sirvan (el resto, por defecto) y el lugar de la mano
// si es de la mesa y del equipo que es mano; si no, el primer lugar de ese equipo.
function knownTable(initial, saved) {
  const source = Array.isArray(saved.players) ? saved.players : [];
  const players = initial.players.map((name, seat) => (
    typeof source[seat] === 'string' ? cleanPlayerName(source[seat], seat) : name
  ));
  const { manoSeat } = saved;
  const valid = Number.isInteger(manoSeat) && manoSeat >= 0 && manoSeat < saved.playerCount
    && teamOfSeat(manoSeat) === saved.mano;
  return { players, manoSeat: valid ? manoSeat : saved.mano };
}

// Todo lo que no son opciones tiene que tener la forma y los rangos esperados.
function isValidGame(data) {
  const { target, playerCount, teams, history, mano, hand } = data;
  if (!TARGETS.includes(target) || !PLAYER_COUNTS.includes(playerCount)) return false;
  if (mano !== 0 && mano !== 1) return false;

  const points = value => Number.isInteger(value) && value >= 0 && value <= target;
  const validTeam = team => typeof team?.name === 'string' && team.name.trim() !== ''
    && points(team.score) && Number.isInteger(team.wins) && team.wins >= 0;
  if (!Array.isArray(teams) || teams.length !== 2 || !teams.every(validTeam)) return false;

  const validEntry = entry => (entry?.team === 0 || entry?.team === 1)
    && Number.isInteger(entry.delta) && entry.delta !== 0;
  if (!Array.isArray(history) || history.length > HISTORY_LIMIT || !history.every(validEntry)) {
    return false;
  }

  return Boolean(hand)
    && Number.isInteger(hand.number) && hand.number >= 1
    && typeof hand.pica === 'boolean'
    && Number.isInteger(hand.duels) && hand.duels >= 0 && hand.duels < duelsPerPicaPica(playerCount)
    && Array.isArray(hand.startScores) && hand.startScores.length === 2
    && hand.startScores.every(points);
}

// Las opciones guardadas, completando las que falten (con su valor por defecto) y
// descartando las que ya no existen o traen un valor que no corresponde: las de
// OPTION_CHOICES tienen que ser uno de sus valores; el resto, booleanas.
function knownOptions(defaults, saved) {
  const source = saved && typeof saved === 'object' ? saved : {};
  const valid = (key, value) => (OPTION_CHOICES[key]
    ? OPTION_CHOICES[key].includes(value)
    : typeof value === 'boolean');
  return Object.fromEntries(Object.entries(defaults).map(([key, value]) => (
    [key, valid(key, source[key]) ? source[key] : value]
  )));
}
