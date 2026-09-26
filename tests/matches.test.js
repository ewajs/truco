import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardSVG } from '../site/js/view/matches.js';

const count = (html, pattern) => (html.match(pattern) ?? []).length;
const matches = html => count(html, /class="m( new)?"/g);
const newMatches = html => count(html, /class="m new"/g);
const groups = html => count(html, /class="grp"/g);

test('un fósforo por punto', () => {
  assert.equal(matches(boardSVG(0, 30)), 0);
  assert.equal(matches(boardSVG(7, 30)), 7);
  assert.equal(matches(boardSVG(30, 30)), 30);
});

test('un cuadrado cada 5 puntos', () => {
  assert.equal(groups(boardSVG(0, 15)), 3);
  assert.equal(groups(boardSVG(0, 30)), 6);
});

test('el divisor de buenas aparece solo a 30', () => {
  assert.match(boardSVG(0, 30), /Buenas/);
  assert.doesNotMatch(boardSVG(0, 15), /Buenas/);
});

test('se animan solo los fósforos recién anotados', () => {
  assert.equal(newMatches(boardSVG(7, 30)), 0, 'sin animateFrom no anima nada');
  assert.equal(newMatches(boardSVG(7, 30, 4)), 3);
});
