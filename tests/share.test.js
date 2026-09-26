import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce } from '../site/js/game.js';
import { gameToHash, gameFromHash } from '../site/js/share.js';

function playedGame() {
  let state = createInitialState();
  state = reduce(state, { type: 'rename', team: 0, name: 'Los Primos & Cía' });
  state = reduce(state, { type: 'add', team: 0, points: 4 });
  state = reduce(state, { type: 'add', team: 1, points: 3 });
  return state;
}

test('una partida sobrevive ida y vuelta por el link', () => {
  const state = playedGame();
  assert.deepEqual(gameFromHash(gameToHash(state)), {
    target: state.target,
    players: state.players,
    teams: state.teams,
  });
});

test('el link es legible', () => {
  assert.equal(
    gameToHash(createInitialState()),
    '#a=30&de=4&equipo1=Nosotros&puntos1=0&ganadas1=0&equipo2=Ellos&puntos2=0&ganadas2=0',
  );
});

test('un link sin partida no carga nada', () => {
  assert.equal(gameFromHash(''), null);
  assert.equal(gameFromHash('#'), null);
  assert.equal(gameFromHash('#algo-que-no-es-una-partida'), null);
});

test('rechaza puntos inválidos o mayores al máximo', () => {
  assert.equal(gameFromHash('#a=20&puntos1=1&puntos2=1'), null, 'solo 15 o 30');
  assert.equal(gameFromHash('#a=15&puntos1=16&puntos2=0'), null);
  assert.equal(gameFromHash('#a=15&puntos1=-1&puntos2=0'), null);
  assert.equal(gameFromHash('#a=15&puntos1=2.5&puntos2=0'), null);
  assert.equal(gameFromHash('#a=15&puntos1=3'), null, 'faltan los puntos del otro equipo');
});

test('completa nombres y ganadas que falten', () => {
  assert.deepEqual(gameFromHash('#a=15&puntos1=3&puntos2=5&equipo2=%20%20'), {
    target: 15,
    teams: [
      { name: 'Nosotros', score: 3, wins: 0 },
      { name: 'Ellos', score: 5, wins: 0 },
    ],
  });
});

test('recorta nombres demasiado largos', () => {
  const game = gameFromHash('#a=15&puntos1=0&puntos2=0&equipo1=Un%20nombre%20larguísimo');
  assert.equal(game.teams[0].name, 'Un nombre larg');
});

test('de a cuántos viaja en el link; si falta o viene mal, no se carga', () => {
  assert.equal(gameFromHash('#a=15&de=6&puntos1=0&puntos2=0').players, 6);
  assert.equal(gameFromHash('#a=15&puntos1=0&puntos2=0').players, undefined, 'links viejos');
  assert.equal(gameFromHash('#a=15&de=5&puntos1=0&puntos2=0').players, undefined);
});

test('cargar un link viejo (sin de a cuántos) conserva el que había', () => {
  const state = reduce(createInitialState(), { type: 'setPlayers', players: 8 });
  const next = reduce(state, { type: 'loadGame', game: gameFromHash('#a=15&puntos1=1&puntos2=2') });
  assert.equal(next.players, 8);
  const shared = reduce(state, { type: 'loadGame', game: gameFromHash('#a=15&de=2&puntos1=1&puntos2=2') });
  assert.equal(shared.players, 2);
});

test('cargar una partida reemplaza la actual y conserva las opciones', () => {
  let state = reduce(createInitialState(), { type: 'setOption', option: 'vibrate', value: false });
  state = reduce(state, { type: 'add', team: 1, points: 2 });
  const game = gameFromHash('#a=15&equipo1=A&puntos1=7&ganadas1=2&equipo2=B&puntos2=4');
  const next = reduce(state, { type: 'loadGame', game });
  assert.equal(next.target, 15);
  assert.deepEqual(next.teams, game.teams);
  assert.deepEqual(next.history, [], 'no se puede deshacer hacia la partida anterior');
  assert.equal(next.options.vibrate, false);
});
