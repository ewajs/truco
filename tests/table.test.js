import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce } from '../site/js/game.js';
import { dealerSeat, drawTable, seatTurn, seatedPlayers, shortPlayerName, MAX_PLAYERS } from '../site/js/table.js';
import { fromSaved, save, STORAGE_KEY } from '../site/js/storage.js';
import { currentDeal, passNotice } from '../site/js/hands.js';

const add = (team, points = 1) => ({ type: 'add', team, points });

function withPlayers(names, count = names.length) {
  let state = reduce(createInitialState(), { type: 'setPlayerCount', count });
  names.forEach((name, seat) => { state = reduce(state, { type: 'renamePlayer', seat, name }); });
  return state;
}

test('siempre hay jugadores: por defecto "Jugador 1", "Jugador 2"…', () => {
  const state = createInitialState();
  assert.equal(state.players.length, MAX_PLAYERS);
  assert.deepEqual(seatedPlayers(state).map(p => p.name), ['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4']);
  assert.equal(reduce(state, { type: 'renamePlayer', seat: 1, name: '  ' }), state, 'vacío: el de siempre');
});

test('los equipos se alternan en la mesa: el compañero queda enfrente', () => {
  const state = withPlayers(['Juan', 'Pedro', 'Ana', 'Sofi']);
  assert.deepEqual(seatedPlayers(state).map(p => [p.name, p.team]),
    [['Juan', 0], ['Pedro', 1], ['Ana', 0], ['Sofi', 1]]);
});

test('da el que está antes de la mano, y la mano pasa al de al lado', () => {
  let state = withPlayers(['Juan', 'Pedro', 'Ana', 'Sofi']);
  assert.equal(dealerSeat(state), 3, 'da Sofi, es mano Juan');
  state = reduce(state, add(0));
  state = reduce(state, { type: 'passMano' });
  assert.equal(state.manoSeat, 1);
  assert.equal(state.mano, 1, 'y con eso, el otro equipo');
  assert.equal(dealerSeat(state), 0);
  state = reduce(state, { type: 'passMano' }); // corrección: sin puntos también avanza
  assert.equal(state.manoSeat, 2);
  assert.equal(state.mano, 0);
});

test('cambiar de lugar: la mano sigue a la persona y el equipo se recalcula', () => {
  let state = withPlayers(['Juan', 'Pedro', 'Ana', 'Sofi']);
  state = reduce(state, { type: 'swapSeats', a: 0, b: 1 }); // Juan (mano) pasa al lugar 1
  assert.deepEqual(state.players.slice(0, 4), ['Pedro', 'Juan', 'Ana', 'Sofi']);
  assert.equal(state.manoSeat, 1);
  assert.equal(state.mano, 1, 'Juan ahora es del otro equipo, que pasa a ser mano');
  state = reduce(state, { type: 'swapSeats', a: 2, b: 3 });
  assert.equal(state.manoSeat, 1, 'si no toca a la mano, la mano no se mueve');
});

test('elegir quién es mano cambia el equipo mano, también a mitad de partida', () => {
  let state = reduce(withPlayers(['Juan', 'Pedro', 'Ana', 'Sofi']), add(1, 5));
  state = reduce(state, { type: 'setManoSeat', seat: 3 });
  assert.equal(state.mano, 1);
  assert.equal(state.teams[1].score, 5, 'los puntos no se tocan');
  assert.equal(reduce(state, { type: 'setManoSeat', seat: 4 }), state, 'de a 4 no hay lugar 5');
});

test('cambiar de a cuántos se juega no pierde nombres', () => {
  let state = withPlayers(['Juan', 'Pedro', 'Ana', 'Sofi', 'Leo', 'Caro'], 6);
  state = reduce(state, { type: 'setManoSeat', seat: 5 });
  state = reduce(state, { type: 'setPlayerCount', count: 4 });
  assert.equal(state.manoSeat, 1, 'el lugar de la mano ya no está: el primero del mismo equipo');
  assert.equal(state.mano, 1);
  state = reduce(state, { type: 'setPlayerCount', count: 6 });
  assert.deepEqual(state.players.slice(0, 6), ['Juan', 'Pedro', 'Ana', 'Sofi', 'Leo', 'Caro']);
});

test('tirar reyes: una mesa con los mismos jugadores en otro orden y una mano', () => {
  const state = withPlayers(['Juan', 'Pedro', 'Ana', 'Sofi', 'Leo', 'Caro'], 6);
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const drawn = drawTable(state, random);
  assert.deepEqual([...drawn.players].sort(), ['Ana', 'Caro', 'Juan', 'Leo', 'Pedro', 'Sofi']);
  assert.ok(drawn.manoSeat >= 0 && drawn.manoSeat < 6);
  const next = reduce(state, { type: 'setTable', ...drawn });
  assert.deepEqual(next.players.slice(0, 6), drawn.players);
  assert.equal(next.mano, drawn.manoSeat % 2);
  assert.deepEqual(next.players.slice(6), state.players.slice(6), 'los lugares que sobran no se tocan');
});

test('deshacer el pase también devuelve el lugar de la mano', () => {
  const before = reduce(withPlayers(['Juan', 'Pedro', 'Ana', 'Sofi']), add(0));
  const passed = reduce(before, { type: 'passMano' });
  const restored = reduce(passed, {
    type: 'restoreHand', mano: before.mano, manoSeat: before.manoSeat, hand: before.hand,
  });
  assert.equal(restored.manoSeat, before.manoSeat);
});

test('guardado: la mesa se completa si falta y se corrige si no cuadra', () => {
  const state = reduce(withPlayers(['Juan', 'Pedro', 'Ana', 'Sofi']), { type: 'setManoSeat', seat: 3 });
  const saved = () => {
    const data = {};
    save(state, { setItem: (key, value) => { data[key] = value; } });
    return JSON.parse(data[STORAGE_KEY]);
  };
  assert.deepEqual(fromSaved(saved()), state, 'ida y vuelta');

  const { players, manoSeat, ...old } = saved(); // una partida guardada antes de la mesa
  const loaded = fromSaved(old);
  assert.deepEqual(loaded.players, createInitialState().players);
  assert.equal(loaded.manoSeat, old.mano, 'la mano en el primer lugar de su equipo');
  assert.deepEqual(loaded.teams, state.teams, 'la partida no se pierde');

  const broken = fromSaved({ ...saved(), players: ['Juan', 7, ' '], manoSeat: 2 }); // lugar 2 no es del equipo mano
  assert.deepEqual(broken.players.slice(0, 4), ['Juan', 'Jugador 2', 'Jugador 3', 'Jugador 4']);
  assert.equal(broken.manoSeat, 1);
});

test('una partida compartida trae su mesa', () => {
  const game = {
    target: 30, playerCount: 4, teams: [{ name: 'A', score: 3, wins: 0 }, { name: 'B', score: 0, wins: 0 }],
    players: ['Juan', 'Pedro', 'Ana', 'Sofi'], manoSeat: 1,
  };
  const state = reduce(createInitialState(), { type: 'loadGame', game });
  assert.deepEqual(state.players.slice(0, 4), game.players);
  assert.equal(state.manoSeat, 1);
  assert.equal(state.mano, 1);
});

test('turnos: mano, segundo, tercero… y los dos últimos son pie (uno por equipo)', () => {
  const turns = (count, manoSeat = 0) => {
    const state = { ...reduce(createInitialState(), { type: 'setPlayerCount', count }), manoSeat };
    return Array.from({ length: count }, (_, seat) => seatTurn(state, seat));
  };
  assert.deepEqual(turns(2), ['Mano', 'Pie']);
  assert.deepEqual(turns(4), ['Mano', 'Segundo', 'Pie', 'Pie']);
  assert.deepEqual(turns(6), ['Mano', 'Segundo', 'Tercero', 'Cuarto', 'Pie', 'Pie']);
  assert.deepEqual(turns(8), ['Mano', 'Segundo', 'Tercero', 'Cuarto', 'Quinto', 'Sexto', 'Pie', 'Pie']);
  assert.deepEqual(turns(4, 2), ['Pie', 'Pie', 'Mano', 'Segundo'], 'se cuenta desde la mano');
});

// Una mano de pica pica de a `count`, con la mano en `manoSeat`, en el duelo `duels`.
function picaHand(count, manoSeat, duels) {
  const state = reduce(createInitialState(), { type: 'setPlayerCount', count });
  return { ...state, manoSeat, mano: manoSeat % 2, hand: { ...state.hand, pica: true, duels } };
}

test('en una redonda juegan todos: mano y da el anterior', () => {
  const state = reduce(withPlayers(['Juan', 'Pedro', 'Ana', 'Sofi']), { type: 'setManoSeat', seat: 2 });
  assert.deepEqual(currentDeal(state), { mano: 2, dealer: 1, seats: [2, 3, 0, 1] });
});

test('pica pica de a 6: cada uno contra el de enfrente, empezando por la mano', () => {
  assert.deepEqual([0, 1, 2].map(duel => currentDeal(picaHand(6, 1, duel))), [
    { mano: 1, dealer: 4, seats: [1, 4] },
    { mano: 2, dealer: 5, seats: [2, 5] },
    { mano: 3, dealer: 0, seats: [3, 0] },
  ]);
});

test('pica pica de a 8: dos grupos de a 4 desde la mano, dos de cada equipo', () => {
  const [first, second] = [0, 1].map(duel => currentDeal(picaHand(8, 6, duel)));
  assert.deepEqual(first, { mano: 6, dealer: 1, seats: [6, 7, 0, 1] });
  assert.deepEqual(second, { mano: 2, dealer: 5, seats: [2, 3, 4, 5] });
  for (const { seats } of [first, second]) {
    assert.deepEqual(seats.map(seat => seat % 2).sort(), [0, 0, 1, 1]);
  }
});

test('los avisos nombran al jugador, aunque tenga el nombre por defecto', () => {
  const passed = state => reduce(reduce(state, add(0)), { type: 'passMano' });
  const unnamed = createInitialState();
  assert.equal(passNotice(reduce(unnamed, add(0)), passed(unnamed)).done, 'Es mano Jugador 2');
  const named = withPlayers(['Juan', 'Pedro', 'Ana', 'Sofi']);
  assert.equal(passNotice(reduce(named, add(0)), passed(named)).coming, 'Mano para Pedro');
});

test('nombre corto: J3 si no lo cambiaron', () => {
  const state = withPlayers(['Juan', 'Jugador 2']);
  assert.deepEqual([0, 1, 2].map(seat => shortPlayerName(state, seat)), ['Juan', 'J2', 'J3']);
});
