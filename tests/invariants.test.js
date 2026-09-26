// Invariantes: miles de acciones al azar (con semilla fija, así cualquier falla se puede
// reproducir) y después de cada una se verifica que el estado siga teniendo sentido.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce, winner, TARGETS, PLAYER_COUNTS, HISTORY_LIMIT } from '../site/js/game.js';
import { duelsPerPicaPica, isPicaPicaHand, picaPicaEnabled } from '../site/js/hands.js';
import { fromSaved } from '../site/js/storage.js';

const SEEDS = 200;
const STEPS = 250; // menos que HISTORY_LIMIT, así el historial explica todos los puntos

// Generador pseudoaleatorio con semilla (mulberry32).
function random(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomAction(rand) {
  const pick = list => list[Math.floor(rand() * list.length)];
  const team = pick([0, 1]);
  const roll = rand();
  if (roll < 0.40) return { type: 'add', team, points: pick([1, 1, 1, 2, 3, 4]) };
  if (roll < 0.50) return { type: 'subtract', team };
  if (roll < 0.60) return { type: 'undo' };
  if (roll < 0.78) return { type: 'passMano' };
  if (roll < 0.82) return { type: 'setHand', number: pick([0, 1, 3, 9]), pica: rand() < 0.5, duel: pick([0, 1, 2, 3, 5]) };
  if (roll < 0.86) return { type: 'setPlayerCount', count: pick([...PLAYER_COUNTS, 5]) };
  if (roll < 0.90) return { type: 'setOption', option: pick(['trackHands', 'picaPica', 'autoMano']), value: rand() < 0.7 };
  if (roll < 0.92) return { type: 'setTarget', target: pick([...TARGETS, 20]) };
  if (roll < 0.94) return { type: 'newGame' };
  if (roll < 0.96) return { type: 'clearWins' };
  return { type: 'rename', team, name: pick(['', '  ', 'Primos', 'Un nombre larguísimo de más']) };
}

function checkInvariants(state) {
  const { target, teams, history, hand, mano } = state;
  assert.ok(TARGETS.includes(target));
  assert.ok(PLAYER_COUNTS.includes(state.playerCount));
  assert.ok(mano === 0 || mano === 1);
  assert.ok(history.length <= HISTORY_LIMIT);

  teams.forEach((team, i) => {
    assert.ok(Number.isInteger(team.score) && team.score >= 0 && team.score <= target, `puntos ${team.score}`);
    assert.ok(Number.isInteger(team.wins) && team.wins >= 0, `ganadas ${team.wins}`);
    assert.ok(team.name.trim().length > 0);
    const fromHistory = history.filter(entry => entry.team === i).reduce((sum, entry) => sum + entry.delta, 0);
    assert.equal(team.score, fromHistory, 'los puntos se explican por el historial');
  });
  assert.ok(teams.filter(team => team.score >= target).length <= 1, 'a lo sumo un ganador');

  assert.ok(Number.isInteger(hand.number) && hand.number >= 1);
  if (hand.pica) {
    assert.ok(hand.duels >= 0 && hand.duels < duelsPerPicaPica(state.playerCount), `duelos ${hand.duels}`);
  } else {
    assert.equal(hand.duels, 0);
  }
  if (isPicaPicaHand(state)) assert.ok(picaPicaEnabled(state));

  // lo que se guarda siempre se puede volver a cargar igual
  assert.deepEqual(fromSaved({ ...JSON.parse(JSON.stringify(state)), version: 3 }), state);
}

test(`invariantes con ${SEEDS} partidas de ${STEPS} acciones al azar`, () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const rand = random(seed);
    let state = createInitialState();
    for (let step = 0; step < STEPS; step++) {
      const action = randomAction(rand);
      state = reduce(state, action);
      try {
        checkInvariants(state);
      } catch (error) {
        error.message = `semilla ${seed}, paso ${step}, ${JSON.stringify(action)}: ${error.message}`;
        throw error;
      }
    }

    // deshacer todo vuelve a 0-0 y ya no hay ganador
    while (state.history.length > 0) state = reduce(state, { type: 'undo' });
    assert.deepEqual(state.teams.map(team => team.score), [0, 0], `semilla ${seed}`);
    assert.equal(winner(state), null);
  }
});
