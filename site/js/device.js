// Integraciones con el celular: vibración y mantener la pantalla encendida.
// Si el navegador no las soporta, no hacen nada.

export const VIBRATION = {
  point: 12,
  erase: 8,
  holdStart: 25,
  win: [30, 60, 30, 60, 80],
};

export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // algunos navegadores tiran error si no hubo interacción todavía
  }
}

// Wake lock: el navegador lo suelta al cambiar de pestaña, así que se vuelve a pedir
// cuando la página vuelve a estar visible.
export function createWakeLock() {
  let wanted = false;
  let lock = null;

  async function sync() {
    try {
      const shouldHold = wanted && 'wakeLock' in navigator && document.visibilityState === 'visible';
      if (shouldHold && !lock) {
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => { lock = null; });
      } else if (!shouldHold && lock) {
        await lock.release();
        lock = null;
      }
    } catch {
      lock = null;
    }
  }

  document.addEventListener('visibilitychange', sync);

  return {
    setEnabled(enabled) {
      if (enabled === wanted) return;
      wanted = enabled;
      sync();
    },
  };
}
