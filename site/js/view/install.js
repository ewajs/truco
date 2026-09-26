// Invitación a instalar la app. Aparece unos segundos después de abrir, salvo que ya
// esté instalada (o abierta como app) o que la persona la haya cerrado antes.
//
// - Chrome/Edge/Android avisan que se puede instalar con el evento
//   `beforeinstallprompt`, y el botón "Instalar" abre el diálogo del navegador.
// - iPhone/iPad no tienen ese evento: se explica cómo agregarla a la pantalla de inicio.
// - En el resto de los navegadores no se muestra nada.

const DELAY_MS = 4000;
const DISMISSED_KEY = 'truco-instalar-cerrado';

export function setupInstallPrompt() {
  if (isRunningAsApp() || wasDismissed()) return;

  const banner = document.getElementById('install');
  const hint = document.getElementById('install-hint');
  const installButton = document.getElementById('install-button');
  const ios = isIOS();
  let installEvent = null; // beforeinstallprompt guardado para usarlo al tocar "Instalar"
  let waited = false;

  if (ios) {
    hint.textContent = 'Compartir → “Agregar a inicio”';
    installButton.hidden = true;
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); // en lugar del aviso del navegador, mostramos el nuestro
    installEvent = event;
    showIfReady();
  });
  window.addEventListener('appinstalled', hide);

  setTimeout(() => {
    waited = true;
    showIfReady();
  }, DELAY_MS);

  function showIfReady() {
    if (!waited || !(installEvent || ios) || !banner.hidden) return;
    banner.hidden = false;
    void banner.offsetWidth; // forzar reflow para que arranque la animación de entrada
    banner.classList.add('show');
  }

  function hide() {
    banner.classList.remove('show');
    banner.addEventListener('transitionend', () => { banner.hidden = true; }, { once: true });
  }

  installButton.addEventListener('click', async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    installEvent = null; // el navegador lo permite usar una sola vez
    hide();
  });

  document.getElementById('install-close').addEventListener('click', () => {
    rememberDismissed();
    hide();
  });
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
