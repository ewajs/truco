// Hoja de ajustes: a cuántos se juega, nombres, opciones y reinicios.
// Los botones de "Partida a" usan data-action y los maneja main.js; el resto se maneja acá.

import { isFresh, hasBuenas } from '../game.js';

const SLIDE_MS = 320; // duración de la animación de apertura (ver .sheet en CSS)
const CONFIRM_MS = 3000;

export function createSettings({ dispatch }) {
  const sheet = document.getElementById('settings');
  const targetButtons = sheet.querySelectorAll('[data-action="setTarget"]');
  const targetHelp = document.getElementById('target-help');
  const nameInputs = [0, 1].map(team => document.getElementById(`name-${team}`));
  const optionToggles = sheet.querySelectorAll('[data-option]');
  let current = null; // último estado renderizado

  // ---- Abrir y cerrar ----

  function open(focusTeam) {
    sheet.classList.add('open');
    if (focusTeam === undefined) return;
    setTimeout(() => {
      nameInputs[focusTeam].focus();
      nameInputs[focusTeam].select();
    }, SLIDE_MS);
  }

  function close() {
    document.activeElement?.blur();
    sheet.classList.remove('open');
    confirmReset.cancel();
    confirmClearWins.cancel();
  }

  document.getElementById('open-settings').addEventListener('click', () => open());
  document.getElementById('close-settings').addEventListener('click', close);
  document.getElementById('settings-backdrop').addEventListener('click', close);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sheet.classList.contains('open')) close();
  });

  // ---- Nombres y opciones ----

  nameInputs.forEach((input, team) => {
    input.addEventListener('input', () => dispatch({ type: 'rename', team, name: input.value }));
    input.addEventListener('blur', () => render(current)); // mostrar el nombre final
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') input.blur();
    });
  });

  optionToggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      dispatch({ type: 'setOption', option: toggle.dataset.option, value: toggle.checked });
    });
  });

  // ---- Acciones destructivas: hay que tocar dos veces ----

  const confirmReset = confirmTwice(document.getElementById('reset-game'), () => {
    dispatch({ type: 'newGame' });
    close();
  });
  const confirmClearWins = confirmTwice(document.getElementById('clear-wins'), () => {
    dispatch({ type: 'clearWins' });
  });

  // ---- Render ----

  function render(state) {
    current = state;

    targetButtons.forEach(button => {
      button.setAttribute('aria-checked', String(Number(button.dataset.target) === state.target));
    });

    targetHelp.textContent = hasBuenas(state.target)
      ? 'Se juega en malas y buenas, 15 y 15.'
      : 'Una sola vuelta de 15.';
    if (!isFresh(state)) targetHelp.textContent += ' Cambiarlo empieza una partida nueva.';

    nameInputs.forEach((input, team) => {
      // no pisar lo que se está escribiendo
      if (document.activeElement !== input) input.value = state.teams[team].name;
    });

    optionToggles.forEach(toggle => {
      toggle.checked = Boolean(state.options[toggle.dataset.option]);
    });
  }

  return { render, open };
}

// El primer toque pide confirmación; el segundo (dentro de CONFIRM_MS) ejecuta.
function confirmTwice(button, onConfirm) {
  const label = button.textContent;
  let timer = null;

  function cancel() {
    clearTimeout(timer);
    timer = null;
    button.classList.remove('armed');
    button.textContent = label;
  }

  button.addEventListener('click', () => {
    if (timer) {
      cancel();
      onConfirm();
      return;
    }
    button.classList.add('armed');
    button.textContent = 'Tocá de nuevo para confirmar';
    timer = setTimeout(cancel, CONFIRM_MS);
  });

  return { cancel };
}
