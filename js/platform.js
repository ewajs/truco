// Integraciones con el dispositivo: vibración y mantener la pantalla encendida.

export const BUZZ = { add: 12, sub: 8, undo: 8, hold: 25, win: [30, 60, 30, 60, 80] };

export function vibrate(pattern){
  if(navigator.vibrate){ try{ navigator.vibrate(pattern); }catch(e){} }
}

// Pide o suelta el wake lock según isEnabled(). Se re-sincroniza al volver a la pestaña.
export function createWakeLock(isEnabled){
  let lock = null;
  async function sync(){
    try{
      if(isEnabled() && 'wakeLock' in navigator && document.visibilityState === 'visible'){
        if(!lock){
          lock = await navigator.wakeLock.request('screen');
          lock.addEventListener('release', () => { lock = null; });
        }
      }else if(lock){ await lock.release(); lock = null; }
    }catch(e){ lock = null; }
  }
  document.addEventListener('visibilitychange', sync);
  return { sync };
}
