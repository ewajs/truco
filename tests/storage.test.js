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

// Una partida con de todo: puntos, historial, mano, Pica Pica y opciones cambiadas.
function playedState() {
  let state = createInitialState();
  state = reduce(state, { type: 'setPlayerCount', count: 6 });
  state = reduce(state, { type: 'rename', team: 0, name: 'Primos' });
  state = reduce(state, { type: 'add', team: 0, points: 5 });
  state = reduce(state, { type: 'passMano' });
  state = reduce(state, { type: 'add', team: 1, points: 2 });
  return reduce(state, { type: 'setOption', option: 'vibrate', value: false });
}

// Lo que quedaría guardado para `state`, con `changes` aplicados encima.
function savedWith(changes, state = playedState()) {
  const storage = memoryStorage();
  save(state, storage);
  return { ...JSON.parse(storage.getItem(STORAGE_KEY)), ...changes };
}

test('guardar y cargar devuelve el mismo estado', () => {
  const storage = memoryStorage();
  const state = playedState();
  save(state, storage);
  assert.deepEqual(load(storage), state);
});

test('sin nada guardado, o con basura, arranca de cero', () => {
  assert.deepEqual(load(memoryStorage()), createInitialState());
  assert.deepEqual(load(memoryStorage({ [STORAGE_KEY]: '{roto' })), createInitialState());
  assert.deepEqual(load(memoryStorage({ [STORAGE_KEY]: 'null' })), createInitialState());
});

test('sin localStorage disponible no se rompe', () => {
  const broken = {
    getItem() { throw new Error('bloqueado'); },
    setItem() { throw new Error('bloqueado'); },
  };
  assert.deepEqual(load(broken), createInitialState());
  assert.doesNotThrow(() => save(createInitialState(), broken));
});

test('lo guardado con otra versión se descarta (todavía no migramos)', () => {
  assert.deepEqual(fromSaved(savedWith({ version: 2 })), createInitialState());
  // el formato del prototipo
  const v1 = { target: 15, names: ['A', 'B'], scores: [7, 3], wins: [2, 0], history: [], opts: {} };
  assert.deepEqual(fromSaved(v1), createInitialState());
});

test('cualquier dato inválido descarta la partida entera', () => {
  const state = playedState();
  const broken = [
    { target: 20 },
    { playerCount: 5 },
    { mano: 2 },
    { teams: [state.teams[0]] },
    { teams: [{ ...state.teams[0], score: 'abc' }, state.teams[1]] },
    { teams: [{ ...state.teams[0], score: -1 }, state.teams[1]] },
    { teams: [{ ...state.teams[0], score: 31 }, state.teams[1]] }, // más que el máximo
    { teams: [{ ...state.teams[0], wins: 1.5 }, state.teams[1]] },
    { teams: [{ ...state.teams[0], name: '  ' }, state.teams[1]] },
    { history: 'x' },
    { history: [{ team: 2, delta: 1 }] },
    { history: [{ team: 0, delta: 0 }] },
    { hand: null },
    { hand: { ...state.hand, number: 0 } },
    { hand: { ...state.hand, duels: 3 } }, // de a 6 hay 3 duelos: 0, 1 o 2 jugados
    { hand: { ...state.hand, startScores: [1] } },
  ];
  for (const changes of broken) {
    assert.deepEqual(fromSaved(savedWith(changes)), createInitialState(), JSON.stringify(changes));
  }
});

test('opciones: completa las que faltan y descarta las que sobran', () => {
  const loaded = fromSaved(savedWith({ options: { vibrate: false, showHandNumber: false, keepAwake: 'si' } }));
  assert.equal(loaded.options.vibrate, false, 'se conserva');
  assert.equal(loaded.options.trackHands, true, 'falta: valor por defecto');
  assert.equal('showHandNumber' in loaded.options, false, 'ya no existe');
  assert.equal(loaded.options.keepAwake, false, 'no es booleana: valor por defecto');
  assert.deepEqual(loaded.teams, playedState().teams, 'la partida no se pierde');
});

test('opciones con valores fijos: tema y modo', () => {
  const ok = fromSaved(savedWith({ options: { palette: 'madera', mode: 'dark' } }));
  assert.equal(ok.options.palette, 'madera');
  assert.equal(ok.options.mode, 'dark');
  const bad = fromSaved(savedWith({ options: { palette: 'fucsia', mode: true } }));
  assert.equal(bad.options.palette, 'argento', 'tema desconocido: el de por defecto');
  assert.equal(bad.options.mode, 'auto', 'modo desconocido: seguir al celular');
});

test('segundos del pase automático: solo los de la lista', () => {
  assert.equal(fromSaved(savedWith({ options: { autoManoSeconds: 8 } })).options.autoManoSeconds, 8);
  assert.equal(fromSaved(savedWith({ options: { autoManoSeconds: 7 } })).options.autoManoSeconds, 5);
  assert.equal(fromSaved(savedWith({ options: { autoManoSeconds: '8' } })).options.autoManoSeconds, 5);
});
