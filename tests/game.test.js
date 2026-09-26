import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce, winner, standing, HISTORY_LIMIT } from '../site/js/game.js';

// Aplica varias acciones seguidas y devuelve el estado final.
function play(state, ...actions) {
  return actions.reduce(reduce, state);
}

const add = (team, points = 1) => ({ type: 'add', team, points });
const subtract = team => ({ type: 'subtract', team });
const undo = { type: 'undo' };

function scores(state) {
  return state.teams.map(team => team.score);
}

test('sumar puntos a un equipo', () => {
  const state = play(createInitialState(), add(0), add(0, 3), add(1, 2));
  assert.deepEqual(scores(state), [4, 2]);
});

test('no se pasa del puntaje de la partida y cuenta la ganada', () => {
  const state = play(createInitialState(), { type: 'setTarget', target: 15 }, add(0, 13), add(0, 4));
  assert.deepEqual(scores(state), [15, 0]);
  assert.equal(winner(state), 0);
  assert.equal(state.teams[0].wins, 1);
});

test('con la partida terminada no se puede sumar ni restar', () => {
  const won = play(createInitialState(), { type: 'setTarget', target: 15 }, add(1, 15));
  assert.equal(reduce(won, add(0)), won);
  assert.equal(reduce(won, subtract(1)), won);
});

test('restar no baja de cero', () => {
  const state = createInitialState();
  assert.equal(reduce(state, subtract(0)), state, 'sin cambios devuelve el mismo objeto');
  assert.deepEqual(scores(play(state, add(0, 2), subtract(0))), [1, 0]);
});

test('deshacer revierte sumas y restas en orden', () => {
  const state = play(createInitialState(), add(0, 3), add(1), subtract(0));
  assert.deepEqual(scores(play(state, undo)), [3, 1]);
  assert.deepEqual(scores(play(state, undo, undo)), [3, 0]);
  assert.deepEqual(scores(play(state, undo, undo, undo)), [0, 0]);
  const empty = play(state, undo, undo, undo);
  assert.equal(reduce(empty, undo), empty);
});

test('deshacer el punto ganador descuenta la ganada', () => {
  const won = play(createInitialState(), { type: 'setTarget', target: 15 }, add(1, 14), add(1));
  const undone = reduce(won, undo);
  assert.equal(winner(undone), null);
  assert.equal(undone.teams[1].score, 14);
  assert.equal(undone.teams[1].wins, 0);
});

test('reduce no modifica el estado que recibe', () => {
  const state = createInitialState();
  const copy = structuredClone(state);
  play(state, add(0, 4), subtract(0), undo, { type: 'rename', team: 1, name: 'Otros' });
  assert.deepEqual(state, copy);
});

test('el historial tiene un límite', () => {
  let state = createInitialState();
  for (let i = 0; i < HISTORY_LIMIT; i++) state = play(state, add(0), subtract(0));
  assert.equal(state.history.length, HISTORY_LIMIT);
});

test('partida nueva: puntos a cero, conserva las ganadas', () => {
  const won = play(createInitialState(), { type: 'setTarget', target: 15 }, add(0, 15));
  const next = reduce(won, { type: 'newGame' });
  assert.deepEqual(scores(next), [0, 0]);
  assert.deepEqual(next.history, []);
  assert.equal(next.teams[0].wins, 1);
  assert.equal(reduce(next, { type: 'clearWins' }).teams[0].wins, 0);
});

test('cambiar a cuántos se juega reinicia los puntos', () => {
  const state = play(createInitialState(), add(0, 3));
  const next = reduce(state, { type: 'setTarget', target: 15 });
  assert.equal(next.target, 15);
  assert.deepEqual(scores(next), [0, 0]);
  assert.equal(reduce(next, { type: 'setTarget', target: 20 }), next, 'solo 15 o 30');
});

test('nombres: se limpian los espacios y vacío vuelve al de siempre', () => {
  let state = reduce(createInitialState(), { type: 'rename', team: 1, name: '  Los Primos ' });
  assert.equal(state.teams[1].name, 'Los Primos');
  state = reduce(state, { type: 'rename', team: 1, name: '   ' });
  assert.equal(state.teams[1].name, 'Ellos');
});

test('la mano pasa de un equipo al otro', () => {
  const state = createInitialState();
  assert.equal(state.mano, 0);
  assert.equal(reduce(state, { type: 'passMano' }).mano, 1);
  assert.equal(play(state, { type: 'passMano' }, { type: 'passMano' }).mano, 0);
});

test('la mano no cambia al anotar ni con partida nueva', () => {
  const state = reduce(createInitialState(), { type: 'passMano' });
  assert.equal(play(state, add(0, 3), undo, { type: 'newGame' }).mano, 1);
});

test('opciones', () => {
  const state = reduce(createInitialState(), { type: 'setOption', option: 'vibrate', value: false });
  assert.equal(state.options.vibrate, false);
  assert.equal(state.options.showNumbers, true);
});

test('malas y buenas', () => {
  let state = createInitialState();
  assert.equal(standing(state, 0), 'En malas, faltan 30');
  state = play(state, add(0, 4), add(0, 4), add(0, 4), add(0, 4), add(0, 1));
  assert.equal(standing(state, 0), 'En buenas, faltan 13');
  state = play(createInitialState(), { type: 'setTarget', target: 15 }, add(0, 4));
  assert.equal(standing(state, 0), 'Faltan 11');
  state = play(state, add(0, 11));
  assert.equal(standing(state, 0), 'Ganó');
});

test('una acción desconocida es un error', () => {
  assert.throws(() => reduce(createInitialState(), { type: 'nope' }), /desconocida/);
});
