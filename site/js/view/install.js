// Instalar la app. Dos lugares la ofrecen:
// - la invitación, que aparece unos segundos después de abrir, salvo que ya esté
//   instalada (o abierta como app) o que la persona la haya cerrado antes;
// - la última página de la ayuda, siempre: por si cerraron la invitación o la
//   desinstalaron y la quieren de vuelta.
//
// - Chrome/Edge/Android avisan que se puede instalar con el evento
//   `beforeinstallprompt`, y el botón "Instalar" abre el diálogo del navegador.
// - iPhone/iPad no tienen ese evento: se explica cómo agregarla a la pantalla de inicio.
// - En el resto de los navegadores, la invitación no aparece y la ayuda dice que se
//   busque en el menú del navegador.

const DELAY_MS = 4000;
const DISMISSED_KEY = 'truco-instalar-cerrado';
const IOS_HINT = 'Compartir → “Agregar a inicio”';

export function setupInstall() {
  const banner = document.getElementById('install');
  const hint = document.getElementById('install-hint');
  const installButton = document.getElementById('install-button');
  const helpButton = document.getElementById('help-install');
  const helpHint = document.getElementById('help-install-hint');
  const ios = isIOS();
  const offerBanner = !isRunningAsApp() && !wasDismissed();
  let installEvent = null; // beforeinstallprompt guardado para usarlo al tocar "Instalar"
  let waited = false;

  if (ios) {
    hint.textContent = IOS_HINT;
    installButton.hidden = true;
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); // en lugar del aviso del navegador, mostramos el nuestro
    installEvent = event;
    showIfReady();
    renderHelp();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    hide();
    renderHelp(true);
  });

  setTimeout(() => {
    waited = true;
    showIfReady();
  }, DELAY_MS);

  // la ayuda: el botón si el navegador deja instalar, y si no, cómo hacerlo
  function renderHelp(installed = isRunningAsApp()) {
    helpButton.hidden = !installEvent;
    if (installed) helpHint.textContent = 'Ya la tenés instalada.';
    else if (installEvent) helpHint.textContent = 'Queda en la pantalla de inicio.';
    else if (ios) helpHint.textContent = `Para instalarla: ${IOS_HINT}`;
    else helpHint.textContent = 'Para instalarla, buscá “Instalar app” en el menú del navegador.';
  }

  function showIfReady() {
    if (!offerBanner || !waited || !(installEvent || ios) || !banner.hidden) return;
    banner.hidden = false;
    void banner.offsetWidth; // forzar reflow para que arranque la animación de entrada
    banner.classList.add('show');
  }

  function hide() {
    if (banner.hidden) return;
    banner.classList.remove('show');
    banner.addEventListener('transitionend', () => { banner.hidden = true; }, { once: true });
  }

  async function install() {
    if (!installEvent) return;
    const event = installEvent;
    installEvent = null; // el navegador lo permite usar una sola vez
    event.prompt();
    const { outcome } = await event.userChoice;
    hide();
    renderHelp(outcome === 'accepted');
  }

  installButton.addEventListener('click', install);
  helpButton.addEventListener('click', install);

  document.getElementById('install-close').addEventListener('click', () => {
    rememberDismissed();
    hide();
  });

  renderHelp();
}

function isRunningAsApp() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function isIOS() {
  const iPadAsMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || iPadAsMac;
}

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // sin storage: se vuelve a mostrar la próxima vez
  }
}
