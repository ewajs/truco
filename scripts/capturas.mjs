// Capturas de referencia: docs/capturas/<dispositivo>/<escena>.png, las que usa el README.
//
//   npm run capturas                  todas
//   npm run capturas -- mesa aviso    solo esas escenas
//   npm run capturas -- --out docs/capturas/prs/23 mesa
//                                     en otra carpeta (las de un PR)
//
// Levanta site/ en un servidor local y la maneja con Playwright (dependencia de
// desarrollo: no la usan ni los tests ni las Actions). Cada escena arranca de cero (sin
// nada guardado) y se saca en cada dispositivo. Para sumar una escena, agregala a SCENES:
// `run` recibe `app` (ver createApp) y deja la pantalla como tiene que salir.

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices, request } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITE = join(ROOT, 'site');

// Tamaños de uso normal, no los casos extremos (esos se prueban aparte).
const DEVICES = {
  iphone: { ...devices['iPhone 15'], viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 },
  samsung: { ...devices['Galaxy S24'], deviceScaleFactor: 2 },
};

const PLAYERS = ['Juan', 'Pedro', 'Ana', 'Sofi'];

// Una partida normal a 30, de a 4, ya en buenas.
async function playedGame(app) {
  await app.namePlayers(PLAYERS);
  for (const [team, points] of [[0, 4], [1, 3], [0, 3], [0, 4], [1, 2], [0, 3], [1, 4], [0, 2], [1, 2]]) {
    await app.add(team, points);
    await app.passMano();
  }
}

const SCENES = [
  { name: 'tablero', run: playedGame },
  { name: 'tablero-oscuro', dark: true, run: playedGame },
  {
    name: 'aviso', // el pase automático, a mitad de la cuenta regresiva
    async run(app) {
      await playedGame(app);
      await app.add(1, 1);
      await app.page.waitForSelector('#mano-toast.show');
      await app.wait(1000);
    },
  },
  {
    name: 'mesa', // Ajustes → Partida, con un lugar elegido
    async run(app) {
      await playedGame(app);
      await app.openSettings();
      await app.page.locator('#mesa').scrollIntoViewIfNeeded();
      await app.page.tap('[data-seat="2"]');
    },
  },
  {
    name: 'opciones',
    async run(app) {
      await app.openSettings('#tab-options');
    },
  },
  {
    name: 'pica-pica', // de a 6, tema Noche, en oscuro
    dark: true,
    async run(app) {
      await playedGame(app);
      await app.openSettings('#tab-options');
      await app.page.tap('[data-choice="palette"][data-value="noche"]');
      await app.page.tap('#tab-game');
      await app.page.tap('[data-action="setPlayerCount"][data-count="6"]');
      await app.namePlayers(['Leo', 'Caro'], 4); // cierra Ajustes
      await app.add(1, 1);
      await app.passMano(); // termina la mano: la que sigue es de Pica Pica
    },
  },
];

// Lo que las escenas pueden hacer con la app.
function createApp(page) {
  const app = {
    page,
    wait: ms => page.waitForTimeout(ms),
    add: (team, points) => page.tap(`.team[data-team="${team}"] [data-points="${points}"]`),
    passMano: () => page.tap('.team[data-team="0"] .mano'),
    async openSettings(tab) {
      if (!(await page.locator('#settings.open').count())) {
        await page.tap('#open-settings');
        await app.wait(450);
      }
      if (tab) await page.tap(tab);
    },
    async closeSettings() {
      await page.tap('#close-settings');
      await app.wait(450);
    },
    // Nombra a los jugadores desde el lugar `from` (la mesa, en Ajustes → Partida) y
    // cierra Ajustes.
    async namePlayers(names, from = 0) {
      await app.openSettings('#tab-game');
      for (const [i, name] of names.entries()) {
        const seat = `[data-seat="${from + i}"]`;
        await page.tap(seat);
        await page.fill('#seat-name', name);
        await page.press('#seat-name', 'Enter');
        await page.tap(seat);
      }
      await app.closeSettings();
    },
  };
  return app;
}

// ---- Correr ----

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const out = outIndex === -1 ? join(ROOT, 'docs/capturas') : join(ROOT, args.splice(outIndex, 2)[1]);
const wanted = args.length ? SCENES.filter(scene => args.includes(scene.name)) : SCENES;
if (wanted.length === 0) throw new Error(`No hay escenas con esos nombres: ${args.join(', ')}`);

const server = await serve(SITE);
const browser = await chromium.launch();
// Detrás de un proxy que re-firma HTTPS (el entorno de Claude Code en la nube), Chromium
// no confía en su certificado y no carga Google Fonts: se piden desde Node, que sí.
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const fonts = proxy && await request.newContext({ proxy: { server: proxy } });
const errors = [];
try {
  for (const [deviceName, device] of Object.entries(DEVICES)) {
    await mkdir(join(out, deviceName), { recursive: true });
    for (const scene of wanted) {
      const context = await browser.newContext({ ...device, colorScheme: scene.dark ? 'dark' : 'light' });
      // sin la invitación a instalar la app
      await context.addInitScript(() => localStorage.setItem('truco-instalar-cerrado', '1'));
      if (fonts) {
        await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async route => {
          await route.fulfill({ response: await fonts.fetch(route.request()) });
        });
      }
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(`${deviceName}/${scene.name}: ${error.message}`));
      await page.goto(server.url);
      await scene.run(createApp(page));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600); // que terminen las animaciones
      const file = join(out, deviceName, `${scene.name}.png`);
      await page.screenshot({ path: file });
      console.log(relative(ROOT, file));
      await context.close();
    }
  }
} finally {
  await browser.close();
  await fonts?.dispose();
  server.close();
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
}

// Servidor estático mínimo para site/.
function serve(dir) {
  const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.webmanifest': 'application/manifest+json',
  };
  const server = createServer(async (request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
    const file = join(dir, path.endsWith('/') ? `${path}index.html` : path);
    try {
      if (!file.startsWith(dir)) throw new Error('fuera de site/');
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() });
    });
  });
}
