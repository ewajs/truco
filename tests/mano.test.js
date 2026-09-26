import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce, autoManoAfter } from '../site/js/game.js';

// Hace lo mismo que main.js, sin timer de verdad: aplica acciones y, con WAIT, simula
// que pasó toda la espera sin que nadie toque nada.
const WAIT = 'esperar';

function simulate(steps, state = createInitialState()) {
  let pending = null;

  function apply(action) {
    const before = state;
    state = reduce(state, action);
    if (state === before) return;
    ({ pending } = autoManoAfter(pending, action, before, state));
  }

  for (const step of steps) {
    if (step !== WAIT) {
      apply(step);
    } else if (pending) {
      pending = null;
      apply({ type: 'passMano' });
    }
  }
  return { state, pending };
}

const add = (team, points = 1) => ({ type: 'add', team, points });
const subtract = team => ({ type: 'subtract', team });
const undo = { type: 'undo' };
const passMano = { type: 'passMano' };

// ---- Escenarios de la mesa ----

test('después de anotar, la mano pasa sola', () => {
  assert.equal(simulate([add(0), add(0, 3), WAIT]).state.mano, 1);
});

test('sin anotar nada, la mano no pasa', () => {
  assert.equal(simulate([WAIT, WAIT]).state.mano, 0);
});

test('pasa una vez por mano, no una vez por punto', () => {
  assert.equal(simulate([add(0), add(1, 2), add(0), WAIT, WAIT]).state.mano, 1);
});

test('mano a mano: cada mano la pasa al otro equipo', () => {
  const { state } = simulate([add(0), WAIT, add(1, 2), WAIT, add(0, 3), WAIT]);
  assert.equal(state.mano, 1);
});

test('deshacer un tap de más después de que pasó no la vuelve a pasar', () => {
  assert.equal(simulate([add(0), add(0), WAIT, undo, WAIT]).state.mano, 1);
});

test('restar con − después de que pasó tampoco', () => {
  assert.equal(simulate([add(0), add(0), WAIT, subtract(0), WAIT]).state.mano, 1);
});

test('un tap por error y deshacer: no pasa', () => {
  assert.equal(simulate([add(1), undo, WAIT]).state.mano, 0);
});

test('un tap por error y restar: tampoco', () => {
  assert.equal(simulate([add(1), subtract(1), WAIT]).state.mano, 0);
});

test('anotar de más y corregir antes de que pase: pasa una sola vez', () => {
  assert.equal(simulate([add(0), add(0), add(0), undo, WAIT]).state.mano, 1);
});

test('si la cambian a mano, no se pisa con el pase automático', () => {
  assert.equal(simulate([add(0), passMano, WAIT]).state.mano, 1);
});

test('con la opción apagada no pasa, aunque se apague con un pase pendiente', () => {
  const off = { type: 'setOption', option: 'autoMano', value: false };
  assert.equal(simulate([off, add(0), WAIT]).state.mano, 0);
  assert.equal(simulate([add(0), off, WAIT]).state.mano, 0);
});

test('sin mostrar la mano tampoco pasa sola', () => {
  const hidden = { type: 'setOption', option: 'showMano', value: false };
  assert.equal(simulate([hidden, add(0), WAIT]).state.mano, 0);
});

test('empezar otra partida cancela el pase pendiente', () => {
  assert.equal(simulate([add(0), { type: 'newGame' }, WAIT]).state.mano, 0);
  assert.equal(simulate([add(0), { type: 'setTarget', target: 15 }, WAIT]).state.mano, 0);
});

// ---- autoManoAfter directo ----

test('cada punto reinicia la espera y recuerda los puntajes de antes de la mano', () => {
  const before = createInitialState();
  const after = reduce(before, add(0, 2));
  const first = autoManoAfter(null, add(0, 2), before, after);
  assert.deepEqual(first, { pending: { handStart: '0-0' }, restart: true });

  const later = reduce(after, add(1));
  const second = autoManoAfter(first.pending, add(1), after, later);
  assert.deepEqual(second, { pending: { handStart: '0-0' }, restart: true }, 'la mano empezó en 0-0');
});

test('una corrección con pase pendiente reinicia la espera', () => {
  const before = reduce(reduce(createInitialState(), add(0)), add(0));
  const after = reduce(before, undo);
  assert.deepEqual(autoManoAfter({ handStart: '0-0' }, undo, before, after), {
    pending: { handStart: '0-0' },
    restart: true,
  });
});

test('una corrección sin pase pendiente no hace nada', () => {
  const before = reduce(createInitialState(), add(0, 2));
  const after = reduce(before, subtract(0));
  assert.deepEqual(autoManoAfter(null, subtract(0), before, after), { pending: null, restart: false });
});

test('otras acciones no tocan la espera', () => {
  const state = createInitialState();
  const renamed = reduce(state, { type: 'rename', team: 0, name: 'Primos' });
  const pending = { handStart: '0-0' };
  assert.deepEqual(
    autoManoAfter(pending, { type: 'rename', team: 0, name: 'Primos' }, state, renamed),
    { pending, restart: false },
  );
});

test('con pica pica, las manos se siguen contando aunque no se muestre la mano', () => {
  let state = reduce(createInitialState(), { type: 'setPlayers', players: 6 });
  state = reduce(state, { type: 'setOption', option: 'showMano', value: false });
  const { state: after } = simulate([add(0, 2), WAIT], state);
  assert.equal(after.hand.number, 2);
});
