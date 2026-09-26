import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce, isPicaPicaHand } from '../site/js/game.js';

// Partida de a `players`. Cada paso es una acción; el helper `hand` anota puntos y pasa
// la mano, como pasa en la mesa.
function game(players = 6, target = 30) {
  let state = createInitialState();
  state = reduce(state, { type: 'setPlayers', players });
  return reduce(state, { type: 'setTarget', target });
}

const add = (team, points) => ({ type: 'add', team, points });
const pass = { type: 'passMano' };

// Una mano (o duelo) en la que `team` gana `points` y después se pasa la mano.
function hand(state, team, points) {
  return reduce(reduce(state, add(team, points)), pass);
}


// ---- Contar manos ----

test('arranca en la mano 1 y cada mano con puntos suma una', () => {
  let state = game(4);
  assert.equal(state.hand.number, 1);
  state = hand(state, 0, 1);
  state = hand(state, 1, 2);
  assert.equal(state.hand.number, 3);
  assert.equal(state.mano, 0, 'la mano pasó dos veces');
});

test('pasar sin puntos en el medio es una corrección: cambia la mano pero no cuenta', () => {
  let state = hand(game(4), 0, 1);
  state = reduce(state, pass);
  assert.equal(state.hand.number, 2);
  assert.equal(state.mano, 0, 'volvió al que era');
});

test('sumar y restar lo mismo antes de pasar tampoco cuenta', () => {
  let state = reduce(game(4), add(0, 1));
  state = reduce(state, { type: 'subtract', team: 0 });
  state = reduce(state, pass);
  assert.equal(state.hand.number, 1);
});

test('partida nueva vuelve a la mano 1', () => {
  let state = hand(hand(game(4), 0, 3), 1, 2);
  state = reduce(state, { type: 'newGame' });
  assert.deepEqual(state.hand, { number: 1, pica: false, duels: 0, startScores: [0, 0] });
});

// ---- Pica pica ----

test('de a 6: al llegar a 5 en una redonda, la próxima es pica pica', () => {
  let state = hand(game(6), 0, 3);
  assert.equal(isPicaPicaHand(state), false, 'con 3 todavía no');
  state = hand(state, 0, 2);
  assert.equal(state.hand.number, 3);
  assert.equal(isPicaPicaHand(state), true);
});

test('el pica pica dura un duelo por pareja y recién ahí pasa la mano', () => {
  let state = hand(game(6), 0, 5); // mano 2: pica pica
  const mano = state.mano;
  state = hand(state, 1, 1); // duelo 1
  assert.deepEqual([state.hand.number, state.hand.duels, state.mano], [2, 1, mano]);
  state = hand(state, 0, 1); // duelo 2
  assert.deepEqual([state.hand.number, state.hand.duels, state.mano], [2, 2, mano]);
  state = hand(state, 0, 3); // duelo 3: termina el pica pica
  assert.equal(state.hand.number, 3);
  assert.equal(isPicaPicaHand(state), false, 'después de un pica pica viene una redonda');
  assert.equal(state.mano, 1 - mano);
});

test('de a 8 son 2 duelos (dos contra dos)', () => {
  let state = hand(game(8), 0, 5);
  state = hand(state, 0, 1);
  assert.equal(isPicaPicaHand(state), true, 'falta un duelo');
  assert.equal(state.hand.duels, 1);
  state = hand(state, 1, 1);
  assert.equal(isPicaPicaHand(state), false);
});

test('alterna redonda y pica pica mientras nadie llegue a 25', () => {
  let state = hand(game(6), 0, 5); // → pica
  const kinds = [];
  for (let round = 0; round < 4; round++) {
    kinds.push(isPicaPicaHand(state) ? 'pica' : 'redonda');
    const duels = isPicaPicaHand(state) ? 3 : 1;
    for (let i = 0; i < duels; i++) state = hand(state, 1, 1);
  }
  assert.deepEqual(kinds, ['pica', 'redonda', 'pica', 'redonda']);
});

test('llegar a 25 en una redonda: no hay más pica pica', () => {
  let state = game(6);
  state = reduce(state, { type: 'loadGame', game: { target: 30, players: 6, teams: [{ name: 'A', score: 22, wins: 0 }, { name: 'B', score: 10, wins: 0 }] } });
  state = hand(state, 0, 3); // 25 en redonda
  assert.equal(isPicaPicaHand(state), false);
  state = hand(state, 1, 1);
  assert.equal(isPicaPicaHand(state), false);
});

test('llegar a 25 durante un pica pica: termina el pica pica y no hay más', () => {
  let state = game(6);
  state = reduce(state, { type: 'loadGame', game: { target: 30, players: 6, teams: [{ name: 'A', score: 20, wins: 0 }, { name: 'B', score: 10, wins: 0 }] } });
  state = hand(state, 1, 1); // redonda → pica
  assert.equal(isPicaPicaHand(state), true);
  state = hand(hand(hand(state, 0, 2), 0, 2), 0, 1); // 25 en el pica pica
  assert.equal(isPicaPicaHand(state), false);
  state = hand(state, 1, 1);
  assert.equal(isPicaPicaHand(state), false);
});

test('a 15 hay pica pica hasta el final (nunca se llega a 25)', () => {
  let state = hand(game(6, 15), 0, 5);
  assert.equal(isPicaPicaHand(state), true);
  state = hand(hand(hand(state, 1, 1), 1, 1), 1, 1); // termina el pica pica
  state = hand(state, 0, 4); // redonda: 9-3
  assert.equal(isPicaPicaHand(state), true);
});

test('de a 2 o 4 no hay pica pica', () => {
  assert.equal(isPicaPicaHand(hand(game(4), 0, 5)), false);
  assert.equal(isPicaPicaHand(hand(game(2), 0, 5)), false);
});

test('con la opción apagada no hay pica pica', () => {
  const off = reduce(game(6), { type: 'setOption', option: 'picaPica', value: false });
  assert.equal(isPicaPicaHand(hand(off, 0, 5)), false);
});

test('corregir la mano en un pica pica no cuenta un duelo', () => {
  let state = hand(game(6), 0, 5);
  state = reduce(state, pass); // sin puntos
  assert.equal(state.hand.duels, 0);
  assert.equal(isPicaPicaHand(state), true);
});
