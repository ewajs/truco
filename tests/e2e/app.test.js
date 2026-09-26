// Tests de punta a punta: abren el sitio en Chromium y lo usan como una persona.
// Correr con `npm run test:e2e` (la primera vez: `npx playwright install chromium`).

import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from '../../scripts/serve.js';

let server;
let browser;
let page;
let url;
let pageErrors;

before(async () => {
  server = await startServer(0); // puerto libre cualquiera
  url = `http://localhost:${server.address().port}/`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
});

beforeEach(async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
  // sin fuentes externas: los tests no dependen de la red
  await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  page = await context.newPage();
  pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(url);
});

afterEach(async () => {
  await page.context().close();
  assert.deepEqual(pageErrors, [], 'no debería haber errores de JavaScript en la página');
});

// ---- Ayudas ----

const column = team => page.locator(`.team[data-team="${team}"]`);
const board = team => column(team).locator('.board');

async function scores() {
  return page.locator('.score').allTextContents();
}

async function matchesOnBoard(team) {
  return board(team).locator('.m').count();
}

// Mantiene apretado sobre el borde del tablero (fuera de los fósforos, que se vuelven
// a dibujar y harían que el navegador no dispare el click al soltar).
async function longPress(team, ms) {
  const box = await board(team).boundingBox();
  await page.mouse.move(box.x + 3, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function openSettings() {
  await page.click('#open-settings');
  await page.locator('#settings.open').waitFor();
}

// ---- Tests ----

test('tocar el tablero y los botones suma puntos y dibuja fósforos', async () => {
  await board(0).click();
  await column(0).getByRole('button', { name: '+3' }).click();
  await column(1).locator('.plus').click();

  assert.deepEqual(await scores(), ['4', '1']);
  assert.equal(await matchesOnBoard(0), 4);
  assert.equal(await column(0).locator('.left').textContent(), 'En malas, faltan 26');
});

test('mantener apretado borra puntos y no suma', async () => {
  await column(0).getByRole('button', { name: '+4' }).click();
  await longPress(0, 600); // un borrado
  assert.deepEqual(await scores(), ['3', '0']);
});

test('restar y deshacer', async () => {
  await column(1).getByRole('button', { name: '+2' }).click();
  await column(1).locator('.minus').click();
  assert.deepEqual(await scores(), ['0', '1']);
  await page.click('#undo-button');
  assert.deepEqual(await scores(), ['0', '2']);
});

test('llegar al máximo muestra el ganador y la revancha reinicia', async () => {
  await openSettings();
  await page.getByRole('radio', { name: '15 puntos' }).click();
  await page.fill('#name-0', 'Primos');
  await page.click('#close-settings');

  for (let i = 0; i < 4; i++) await column(0).getByRole('button', { name: '+4' }).click();

  await page.locator('#winner.open').waitFor();
  assert.equal(await page.textContent('#winner-title'), 'Ganó Primos');
  assert.equal(await column(0).locator('.wins').textContent(), '1 ganada');

  await page.click('#rematch');
  assert.deepEqual(await scores(), ['0', '0']);
});

test('la partida queda guardada al recargar', async () => {
  await column(1).getByRole('button', { name: '+3' }).click();
  await page.reload();
  assert.deepEqual(await scores(), ['0', '3']);
  assert.equal(await matchesOnBoard(1), 3);
});

test('reiniciar pide confirmación', async () => {
  await column(0).getByRole('button', { name: '+2' }).click();
  await openSettings();
  await page.click('#reset-game');
  assert.deepEqual(await scores(), ['2', '0'], 'el primer toque solo pide confirmar');
  await page.click('#reset-game');
  assert.deepEqual(await scores(), ['0', '0']);
});

test('opciones: ocultar números y botones rápidos', async () => {
  await openSettings();
  await page.click('label:has([data-option="showNumbers"])');
  await page.click('label:has([data-option="quickButtons"])');
  await page.click('#close-settings');

  assert.equal(await page.locator('.score').first().isVisible(), false);
  assert.equal(await page.locator('.quick').first().isVisible(), false);
});
