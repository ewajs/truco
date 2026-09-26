import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce } from '../site/js/game.js';
import { load, save, fromSaved, STORAGE_KEY } from '../site/js/storage.js';

// localStorage de mentira, con la misma interfaz
function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: key => data[key] ?? null,
    setItem: (key, value) => { data[key] = String(value); },
  };
}

test('guardar y cargar devuelve el mismo estado', () => {
  const storage = memoryStorage();
  const state = reduce(createInitialState(), { type: 'add', team: 1, points: 3 });
  save(state, storage);
  assert.deepEqual(load(storage), state);
});

test('sin nada guardado, o con basura, arranca de cero', () => {
  assert.deepEqual(load(memoryStorage()), createInitialState());
  assert.deepEqual(load(memoryStorage({ [STORAGE_KEY]: '{roto' })), createInitialState());
});

test('sin localStorage disponible no se rompe', () => {
  const broken = {
    getItem() { throw new Error('bloqueado'); },
    setItem() { throw new Error('bloqueado'); },
  };
  assert.deepEqual(load(broken), createInitialState());
  assert.doesNotThrow(() => save(createInitialState(), broken));
});

test('migra una partida guardada por el prototipo (v1)', () => {
  const v1 = {
    target: 15,
    names: ['Primos', 'Tíos'],
    scores: [7, 3],
    wins: [2, 0],
    history: [{ t: 0, d: 4 }, { t: 1, d: 3 }, { t: 0, d: 3 }],
    opts: { numbers: false, quick: true, vibrate: false, awake: true },
  };
  assert.deepEqual(fromSaved(v1), {
    target: 15,
    players: 4,
    teams: [
      { name: 'Primos', score: 7, wins: 2 },
      { name: 'Tíos', score: 3, wins: 0 },
    ],
    history: [{ team: 0, delta: 4 }, { team: 1, delta: 3 }, { team: 0, delta: 3 }],
    mano: 0,
    hand: { number: 1, pica: false, duels: 0, startScores: [7, 3] },
    options: {
      ...createInitialState().options,
      showNumbers: false,
      quickButtons: true,
      vibrate: false,
      keepAwake: true,
    },
  });
});

test('de a cuántos: se guarda y un valor inválido vuelve a 4', () => {
  assert.equal(fromSaved({ version: 2, players: 6 }).players, 6);
  assert.equal(fromSaved({ version: 2, players: 5 }).players, 4);
  assert.equal(fromSaved({ version: 2 }).players, 4, 'partidas guardadas antes de existir');
});

test('mano: se guarda y un valor inválido vuelve al primer equipo', () => {
  assert.equal(fromSaved({ version: 2, mano: 1 }).mano, 1);
  assert.equal(fromSaved({ version: 2, mano: 7 }).mano, 0);
});

test('mano actual: se guarda; si falta o viene rota arranca en la 1 con los puntos de ahora', () => {
  const hand = { number: 7, pica: true, duels: 1, startScores: [12, 9] };
  assert.deepEqual(fromSaved({ version: 2, hand }).hand, hand);
  const teams = [{ score: 12 }, { score: 9 }];
  const fresh = { number: 1, pica: false, duels: 0, startScores: [12, 9] };
  assert.deepEqual(fromSaved({ version: 2, teams }).hand, fresh);
  assert.deepEqual(fromSaved({ version: 2, teams, hand: { number: 'x' } }).hand, fresh);
});

test('descarta opciones que ya no existen', () => {
  const state = fromSaved({ version: 2, options: { showHandNumber: false, vibrate: false } });
  assert.equal('showHandNumber' in state.options, false);
  assert.equal(state.options.vibrate, false);
  assert.equal(state.options.trackHands, true);
});

test('completa campos faltantes y corrige valores inválidos', () => {
  const state = fromSaved({ version: 2, target: 99, options: { quickButtons: false } });
  assert.equal(state.target, 30);
  assert.equal(state.options.quickButtons, false);
  assert.equal(state.options.showNumbers, true);
  assert.deepEqual(state.teams, createInitialState().teams);
});
