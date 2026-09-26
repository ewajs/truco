import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalize, HISTORY_LIMIT } from '../js/state.js';
import * as game from '../js/game.js';

test('sumar respeta el tope y cuenta la partida ganada', () => {
  const s = createState();
  s.target = 15;
  assert.deepEqual(game.add(s, 0, 4), { t: 0, from: 0, to: 4, won: false });
  s.scores[0] = 13;
  assert.deepEqual(game.add(s, 0, 4), { t: 0, from: 13, to: 15, won: true });
  assert.equal(game.winner(s), 0);
  assert.equal(s.wins[0], 1);
  assert.equal(game.add(s, 1, 1), null, 'no se suma con la partida terminada');
});

test('restar no baja de cero', () => {
  const s = createState();
  assert.equal(game.sub(s, 0), null);
  game.add(s, 0, 2);
  game.sub(s, 0);
  assert.equal(s.scores[0], 1);
});

test('deshacer revierte puntos y la partida ganada', () => {
  const s = createState();
  s.target = 15;
  game.add(s, 1, 14);
  game.add(s, 1, 1);
  assert.equal(s.wins[1], 1);
  assert.deepEqual(game.undo(s), { t: 1 });
  assert.equal(s.scores[1], 14);
  assert.equal(s.wins[1], 0);
  game.sub(s, 1);
  game.undo(s);
  assert.equal(s.scores[1], 14);
  game.undo(s);
  assert.equal(s.scores[1], 0);
  assert.equal(game.undo(s), null);
});

test('el historial tiene un límite', () => {
  const s = createState();
  for(let i = 0; i < HISTORY_LIMIT + 20; i++){ game.add(s, 0, 1); game.sub(s, 0); }
  assert.equal(s.history.length, HISTORY_LIMIT);
});

test('cambiar a cuántos se juega reinicia solo si había puntos', () => {
  const s = createState();
  assert.equal(game.setTarget(s, 30), false);
  assert.equal(game.setTarget(s, 20), false);
  game.add(s, 0, 3);
  assert.equal(game.setTarget(s, 15), true);
  assert.deepEqual(s.scores, [0, 0]);
  assert.deepEqual(s.history, []);
});

test('malas y buenas', () => {
  const s = createState();
  assert.equal(game.standing(s, 0), 'En malas, faltan 30');
  s.scores[0] = 17;
  assert.equal(game.standing(s, 0), 'En buenas, faltan 13');
  s.target = 15; s.scores[0] = 10;
  assert.equal(game.standing(s, 0), 'Faltan 5');
});

test('nombres vacíos vuelven al valor por defecto', () => {
  const s = createState();
  game.setName(s, 1, '  Los Primos ');
  assert.equal(s.names[1], 'Los Primos');
  game.setName(s, 1, '   ');
  assert.equal(s.names[1], 'Ellos');
});

test('normalize completa estados viejos o inválidos', () => {
  const s = normalize({ target: 99, opts: { quick: false } });
  assert.equal(s.target, 30);
  assert.equal(s.opts.quick, false);
  assert.equal(s.opts.numbers, true);
  assert.deepEqual(s.scores, [0, 0]);
});
