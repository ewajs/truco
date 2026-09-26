// Hoja de ajustes con dos pestañas: "Partida" (a cuántos puntos, de a cuántos jugadores,
// nombres y reinicios) y "Opciones" (cómo se ve y se comporta la app).
// Los botones de "Partida a" y "De a cuántos" usan data-action y los maneja main.js; el
// resto se maneja acá.

import { isFresh, hasBuenas, playersLabel, tracksHands } from '../game.js';
import { SUPPORTS } from '../device.js';

const SLIDE_MS = 320; // duración de la animación de apertura (ver .sheet en CSS)
const CONFIRM_MS = 3000;
const DRAG_CLOSE_PX = 80;      // arrastrar la cabecera más que esto cierra la hoja
const DRAG_CLOSE_SPEED = 0.5;  // o soltarla rápido (px/ms), aunque sea un tirón corto

// Condiciones de data-requires: la opción queda deshabilitada si devuelve false.
const REQUIREMENTS = {
  showButtons: state => state.options.showButtons,
  trackHands: tracksHands,
};

export function createSettings({ dispatch }) {
  const sheet = document.getElementById('settings');
  const targetButtons = sheet.querySelectorAll('[data-action="setTarget"]');
  const targetHelp = document.getElementById('target-help');
  const playersButtons = sheet.querySelectorAll('[data-action="setPlayers"]');
  const playersHelp = document.getElementById('players-help');
  const picaField = document.getElementById('pica-field');
  const nameInputs = [0, 1].map(team => document.getElementById(`name-${team}`));
  const optionToggles = sheet.querySelectorAll('[data-option]');
  let current = null; // último estado renderizado

  // ---- Pestañas ----

  const tabList = sheet.querySelector('[role="tablist"]');
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];

  // Muestra la pestaña `name` ('game' u 'options'). Se recuerda mientras la app está abierta.
  function showTab(name) {
    tabList.dataset.active = name;
    tabs.forEach(tab => {
      const selected = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).inert = !selected;
    });
  }

  tabs.forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.tab)));
  tabList.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const next = tabs[(tabs.indexOf(document.activeElement) + 1) % tabs.length];
    showTab(next.dataset.tab);
    next.focus();
  });
  showTab('game');

  // ---- Abrir y cerrar ----

  // Con `focusTeam` (tocaron el nombre de un equipo) abre en Partida con ese nombre listo
  // para editar; si no, en la última pestaña usada.
  function open(focusTeam) {
    sheet.classList.add('open');
    if (focusTeam === undefined) return;
    showTab('game');
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
  dragToClose(sheet.querySelector('.sheet'), document.getElementById('settings-drag'), close);
  document.addEventListener('keydown', event => {
    // con un diálogo abierto encima (ej. la ayuda), Escape cierra solo ese diálogo
    if (event.key === 'Escape' && sheet.classList.contains('open') && !document.querySelector('.modal.open')) close();
  });

  // ---- Nombres y opciones ----

  nameInputs.forEach((input, team) => {
    input.addEventListener('input', () => dispatch({ type: 'rename', team, name: input.value }));
    input.addEventListener('blur', () => render(current)); // mostrar el nombre final
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') input.blur();
    });
  });

  // Lo que este navegador no puede hacer ni se muestra
  sheet.querySelectorAll('[data-feature]').forEach(label => {
    label.hidden = !SUPPORTS[label.dataset.feature];
  });
  const featureGroup = sheet.querySelector('[data-feature-group]');
  featureGroup.hidden = !featureGroup.querySelector('[data-feature]:not([hidden])');

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

    playersButtons.forEach(button => {
      button.setAttribute('aria-checked', String(Number(button.dataset.players) === state.players));
    });
    playersHelp.textContent = `${playersLabel(state.players)}.`;
    picaField.hidden = state.players < 6; // el pica pica es solo de a 6 u 8

    nameInputs.forEach((input, team) => {
      // no pisar lo que se está escribiendo
      if (document.activeElement !== input) input.value = state.teams[team].name;
    });

    optionToggles.forEach(toggle => {
      toggle.checked = Boolean(state.options[toggle.dataset.option]);
      const { requires } = toggle.dataset;
      toggle.disabled = Boolean(requires) && !REQUIREMENTS[requires](state);
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

// Arrastrar `handle` hacia abajo mueve `panel` con el dedo; al soltar lejos (o rápido)
// se cierra, y si no vuelve a su lugar.
function dragToClose(panel, handle, onClose) {
  let start = null; // { y, time } al apoyar el dedo

  handle.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return; // "Listo" sigue funcionando como botón
    start = { y: event.clientY, time: event.timeStamp };
    handle.setPointerCapture(event.pointerId);
    panel.classList.add('dragging');
  });

  handle.addEventListener('pointermove', event => {
    if (!start) return;
    const distance = Math.max(0, event.clientY - start.y);
    panel.style.transform = `translateY(${distance}px)`;
  });

  function release(event) {
    if (!start) return;
    const distance = event.clientY - start.y;
    const speed = distance / Math.max(1, event.timeStamp - start.time);
    start = null;
    panel.classList.remove('dragging');
    panel.style.transform = ''; // la transición del CSS la termina de cerrar o la devuelve
    if (distance > DRAG_CLOSE_PX || (distance > 20 && speed > DRAG_CLOSE_SPEED)) onClose();
  }

  handle.addEventListener('pointerup', release);
  handle.addEventListener('pointercancel', release);
}
