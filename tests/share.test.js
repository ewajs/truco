import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce } from '../site/js/game.js';
import { gameToHash, gameFromHash } from '../site/js/share.js';

function playedGame() {
  let state = createInitialState();
  state = reduce(state, { type: 'rename', team: 0, name: 'Los Primos & Cía' });
  state = reduce(state, { type: 'add', team: 0, points: 4 });
  state = reduce(state, { type: 'add', team: 1, points: 3 });
  state = reduce(state, { type: 'renamePlayer', seat: 2, name: 'Juan & Cía, el de al lado' });
  state = reduce(state, { type: 'setManoSeat', seat: 3 });
  return state;
}

test('una partida sobrevive ida y vuelta por el link', () => {
  const state = playedGame();
  assert.deepEqual(gameFromHash(gameToHash(state)), {
    target: state.target,
    playerCount: state.playerCount,
    teams: state.teams,
    players: state.players.slice(0, state.playerCount),
    manoSeat: state.manoSeat,
  });
});

test('el link es legible', () => {
  assert.equal(
    gameToHash(createInitialState()),
    '#a=30&de=4&equipo1=Nosotros&puntos1=0&ganadas1=0&equipo2=Ellos&puntos2=0&ganadas2=0'
      + '&jugador1=Jugador+1&jugador2=Jugador+2&jugador3=Jugador+3&jugador4=Jugador+4&mano=1',
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
  assert.equal(gameFromHash('#a=15&de=6&puntos1=0&puntos2=0').playerCount, 6);
  assert.equal(gameFromHash('#a=15&puntos1=0&puntos2=0').playerCount, undefined, 'links viejos');
  assert.equal(gameFromHash('#a=15&de=5&puntos1=0&puntos2=0').playerCount, undefined);
});

test('cargar un link viejo (sin de a cuántos) conserva el que había', () => {
  const state = reduce(createInitialState(), { type: 'setPlayerCount', count: 8 });
  const next = reduce(state, { type: 'loadGame', game: gameFromHash('#a=15&puntos1=1&puntos2=2') });
  assert.equal(next.playerCount, 8);
  const shared = reduce(state, { type: 'loadGame', game: gameFromHash('#a=15&de=2&puntos1=1&puntos2=2') });
  assert.equal(shared.playerCount, 2);
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

test('la mesa viaja solo si está completa y la mano es un lugar', () => {
  const base = '#a=15&de=4&puntos1=0&puntos2=0&jugador1=Juan&jugador2=Pedro&jugador3=Ana&jugador4=%20';
  const full = gameFromHash(`${base}&mano=2`);
  assert.deepEqual(full.players, ['Juan', 'Pedro', 'Ana', 'Jugador 4']);
  assert.equal(full.manoSeat, 1);
  for (const hash of [base, `${base}&mano=0`, `${base}&mano=5`, '#a=15&de=4&puntos1=0&puntos2=0&jugador1=Juan&mano=1']) {
    const game = gameFromHash(hash);
    assert.equal('players' in game, false, hash);
    assert.equal('manoSeat' in game, false, hash);
  }
});
