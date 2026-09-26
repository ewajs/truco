import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardMetrics, MAX_SIZE, MIN_SIZE, MIN_GAP, DIVIDER_HEIGHT } from '../site/js/view/layout.js';

// Alto total que ocupan los cuadrados, los huecos y (a 30) el divisor de "Buenas".
function usedHeight({ size, gap }, target) {
  const groups = target / 5;
  const divider = target === 30 ? 1 : 0;
  return groups * size + (groups - 1 + divider) * gap + divider * DIVIDER_HEIGHT;
}

test('en una pantalla normal todo entra en el alto disponible', () => {
  for (const target of [15, 30]) {
    for (const height of [300, 420, 560]) {
      const metrics = boardMetrics({ width: 180, height, target });
      assert.ok(usedHeight(metrics, target) <= height + 0.5, `${target} en ${height}px`);
    }
  }
});

test('los cuadrados no pasan del máximo ni del mínimo, y el hueco del mínimo', () => {
  const huge = boardMetrics({ width: 400, height: 2000, target: 15 });
  assert.equal(huge.size, MAX_SIZE);
  const tiny = boardMetrics({ width: 100, height: 120, target: 30 });
  assert.equal(tiny.size, MIN_SIZE);
  assert.ok(tiny.gap >= MIN_GAP);
});

test('una columna angosta achica los cuadrados', () => {
  const narrow = boardMetrics({ width: 60, height: 600, target: 15 });
  assert.ok(narrow.size <= 60 * 0.72 + 0.01);
});

test('a 15 los cuadrados son más grandes que a 30 en el mismo lugar', () => {
  const at15 = boardMetrics({ width: 180, height: 400, target: 15 });
  const at30 = boardMetrics({ width: 180, height: 400, target: 30 });
  assert.ok(at15.size > at30.size);
});
