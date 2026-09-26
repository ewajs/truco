import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce } from '../site/js/game.js';
import { autoManoAfter, noticeDelay, passNotice, NOTICE_MAX_MS } from '../site/js/hands.js';

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

test('sin seguir las manos: solo puntos, ni pasa la mano ni cuenta', () => {
  const off = { type: 'setOption', option: 'trackHands', value: false };
  const { state } = simulate([off, add(0), WAIT]);
  assert.equal(state.mano, 0);
  assert.equal(state.hand.number, 1);
});

test('apagar el seguimiento con un pase pendiente lo cancela', () => {
  const off = { type: 'setOption', option: 'trackHands', value: false };
  assert.equal(simulate([add(0), off, WAIT]).state.mano, 0);
});

test('siguiendo las manos sin mostrar quién es mano, igual pasa y cuenta', () => {
  const hideMano = { type: 'setOption', option: 'showMano', value: false };
  assert.equal(simulate([hideMano, add(0), WAIT]).state.hand.number, 2);
});

test('empezar otra partida cancela el pase pendiente', () => {
  for (const restart of [{ type: 'newGame' }, { type: 'setTarget', target: 15 }]) {
    const started = simulate([add(0), restart]);
    assert.equal(started.pending, null);
    assert.equal(simulate([add(0), restart, WAIT]).state.mano, started.state.mano, 'esperar no pasa nada');
  }
});

test('la partida nueva arranca con el siguiente al que era mano', () => {
  assert.equal(simulate([add(0), { type: 'newGame' }]).state.manoSeat, 1);
  assert.equal(simulate([{ type: 'setTarget', target: 15 }]).state.manoSeat, 0, 'sin jugar nada, no rota');
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

test('con Pica Pica, las manos se siguen contando aunque no se muestre la mano', () => {
  let state = reduce(createInitialState(), { type: 'setPlayerCount', count: 6 });
  state = reduce(state, { type: 'setOption', option: 'showMano', value: false });
  const { state: after } = simulate([add(0, 2), WAIT], state);
  assert.equal(after.hand.number, 2);
});

test('deshacer un pase vuelve a la mano de antes, sin tocar los puntos', () => {
  const { state: before } = simulate([add(0, 2)]);
  const passed = reduce(before, passMano);
  assert.notEqual(passed.mano, before.mano);
  const restored = reduce(passed, { type: 'restoreHand', mano: before.mano, manoSeat: before.manoSeat, hand: before.hand });
  assert.equal(restored.mano, before.mano);
  assert.deepEqual(restored.hand, before.hand);
  assert.deepEqual(restored.teams, passed.teams);
  // y no arranca otra espera: el pase no vuelve a pasar solo
  assert.equal(autoManoAfter(null, { type: 'restoreHand' }, passed, restored).pending, null);
});

// ---- Aviso del pase ----

test('el aviso aparece a mitad de la espera, y a lo sumo a los 3 segundos', () => {
  assert.equal(noticeDelay(3000), 1500);
  assert.equal(noticeDelay(5000), 2500);
  assert.equal(noticeDelay(8000), NOTICE_MAX_MS);
  assert.equal(noticeDelay(12000), NOTICE_MAX_MS);
});

test('el aviso dice qué mano termina con sus puntos, y después quién es mano y quién da', () => {
  const { state: first } = simulate([add(0, 2), add(1), WAIT]); // mano 1
  const before = reduce(reduce(first, add(0, 3)), add(1));      // mano 2: 3 a 1
  const after = reduce(before, passMano);
  assert.deepEqual(passNotice(before, after), {
    coming: { title: 'Terminando Mano 2…', detail: 'Nosotros 3 | Ellos 1' },
    done: { title: 'Mano 3', detail: 'Jugador 3 es mano. Jugador 2 da.' },
  });
});

test('el aviso avisa si la mano que viene es de Pica Pica', () => {
  const six = reduce(createInitialState(), { type: 'setPlayerCount', count: 6 });
  const { state: before } = simulate([add(0, 5)], six);
  const after = reduce(before, passMano);
  assert.deepEqual(passNotice(before, after).done,
    { title: 'Mano 2 | Pica Pica | Duelo 1/3', detail: 'Jugador 2 es mano. Jugador 5 da.' });
});

test('Pica Pica de a 6: el aviso nombra a los del duelo con sus puntos', () => {
  const six = reduce(createInitialState(), { type: 'setPlayerCount', count: 6 });
  const { state: pica } = simulate([add(0, 5), WAIT], six); // mano 2: Pica Pica, J2 contra J5
  const before = reduce(pica, add(1, 2));
  const after = reduce(before, passMano);
  assert.equal(after.mano, before.mano);
  assert.deepEqual(passNotice(before, after), {
    coming: { title: 'Terminando Mano 2…', detail: 'Jugador 5 0 | Jugador 2 2' },
    done: { title: 'Mano 2 | Pica Pica | Duelo 2/3', detail: 'Jugador 3 es mano. Jugador 6 da.' },
  });
});

test('Pica Pica de a 8: el aviso nombra las parejas y quiénes juegan además de mano y pie', () => {
  const eight = reduce(createInitialState(), { type: 'setPlayerCount', count: 8 });
  const { state: pica } = simulate([add(0, 5), WAIT], eight); // mano 2: J2, J3, J4 y J5
  const before = reduce(pica, add(1));
  const after = reduce(before, passMano);
  assert.deepEqual(passNotice(before, after), {
    coming: { title: 'Terminando Mano 2…', detail: 'Jugador 3 y Jugador 5 / Jugador 2 y Jugador 4' },
    done: {
      title: 'Mano 2 | Pica Pica | Duelo 2/2',
      detail: 'Jugador 6 es mano. Jugador 1 da. Juegan Jugador 7 y Jugador 8',
    },
  });
});
