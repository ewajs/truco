// Compartir: el diálogo con las dos opciones (el anotador o esta partida) y el aviso
// que aparece al abrir un link con una partida compartida.
//
// Se usa el menú de compartir del celular (navigator.share) y, si no hay, se copia el
// link al portapapeles.

import { gameToHash } from '../share.js';
import { createDialog } from './dialog.js';

const APP_TITLE = 'Anotador de truco';

export function createShareDialog() {
  const dialog = createDialog(document.getElementById('share'));
  const gameSummary = document.getElementById('share-game-summary');
  const status = document.getElementById('share-status');
  let current = null; // último estado renderizado

  function open() {
    status.textContent = '';
    dialog.open();
  }

  async function shareLink(url, text) {
    const result = await share({ title: APP_TITLE, text, url });
    if (result === 'shared') dialog.close();
    if (result === 'copied') status.textContent = 'Link copiado';
    if (result === 'failed') status.textContent = `No se pudo compartir. El link es: ${url}`;
  }

  document.getElementById('open-share').addEventListener('click', open);
  document.getElementById('close-share').addEventListener('click', () => dialog.close());

  document.getElementById('share-app').addEventListener('click', () => {
    shareLink(appUrl(), 'Anotador de truco con fósforos');
  });
  document.getElementById('share-game').addEventListener('click', () => {
    shareLink(appUrl() + gameToHash(current), `Así vamos: ${scoreLine(current)}`);
  });

  function render(state) {
    current = state;
    gameSummary.textContent = scoreLine(state);
  }

  return { render };
}

// Aviso al abrir un link con partida: se carga solo si la persona dice que sí.
export function createSharedGameOffer({ onAccept }) {
  // Escape o tocar afuera equivale a "No, gracias"
  const dialog = createDialog(document.getElementById('shared-game'), { onDismiss: () => finish() });
  const summary = document.getElementById('shared-game-summary');
  let offered = null;

  function offer(game, state) {
    offered = game;
    const replaces = state.teams.some(team => team.score > 0);
    summary.textContent = `${scoreLine(game)} · a ${game.target} puntos.`
      + (replaces ? ' Reemplaza la partida que tenés ahora.' : '');
    dialog.open({ focus: document.getElementById('load-shared-game') });
  }

  function finish() {
    dialog.close();
    offered = null;
    // sacar la partida de la URL para que no se vuelva a ofrecer al recargar
    history.replaceState(null, '', location.pathname + location.search);
  }

  document.getElementById('load-shared-game').addEventListener('click', () => {
    onAccept(offered);
    finish();
  });
  document.getElementById('ignore-shared-game').addEventListener('click', finish);

  return { offer };
}

// "Primos 12 – Tíos 7"
function scoreLine({ teams }) {
  return teams.map(team => `${team.name} ${team.score}`).join(' – ');
}

// La dirección de la app, sin partida ni parámetros
function appUrl() {
  return location.origin + location.pathname;
}

// Devuelve 'shared', 'cancelled', 'copied' o 'failed'.
async function share(data) {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled'; // la persona cerró el menú
    }
  }
  try {
    await navigator.clipboard.writeText(data.url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
