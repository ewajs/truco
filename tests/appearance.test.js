import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMode } from '../site/js/view/appearance.js';

test('modo: automático sigue al celular; si no, lo elegido', () => {
  assert.equal(resolveMode('auto', true), 'dark');
  assert.equal(resolveMode('auto', false), 'light');
  assert.equal(resolveMode('dark', false), 'dark');
  assert.equal(resolveMode('light', true), 'light');
});
