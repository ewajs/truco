import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMode } from '../site/js/view/appearance.js';

test('modo oscuro: automático sigue al celular; si no, lo elegido', () => {
  assert.equal(resolveMode('auto', true), 'dark');
  assert.equal(resolveMode('auto', false), 'light');
  assert.equal(resolveMode(true, false), 'dark');
  assert.equal(resolveMode(false, true), 'light');
});
