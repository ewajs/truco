// Hoja de ajustes: a cuántos se juega, nombres, opciones y reinicios.

import { TEAMS, isEmpty, setName } from '../game.js';

export function createSettings(sheet, app){
  const $ = sel => sheet.querySelector(sel);
  const nameInput = t => $('#n' + t);

  function open(focusName){
    sheet.classList.add('open');
    if(focusName !== undefined){
      setTimeout(() => { const i = nameInput(focusName); i.focus(); i.select(); }, 320);
    }
  }
  function close(){
    document.activeElement && document.activeElement.blur();
    sheet.classList.remove('open');
    disarmAll();
  }
  const isOpen = () => sheet.classList.contains('open');

  function render(){
    const S = app.state;
    sheet.querySelectorAll('[data-act="target"]').forEach(b => {
      b.setAttribute('aria-checked', String(+b.dataset.v === S.target));
    });
    let help = S.target === 30 ? 'Se juega en malas y buenas, 15 y 15.' : 'Una sola vuelta de 15.';
    if(!isEmpty(S)) help += ' Cambiarlo empieza una partida nueva.';
    $('#targetHelp').textContent = help;
    TEAMS.forEach(t => { const i = nameInput(t); if(document.activeElement !== i) i.value = S.names[t]; });
    sheet.querySelectorAll('[data-opt]').forEach(c => { c.checked = !!S.opts[c.dataset.opt]; });
  }

  TEAMS.forEach(t => {
    const i = nameInput(t);
    i.addEventListener('input', () => {
      setName(app.state, t, i.value);
      app.save();
      app.teams.renderName(t);
    });
    i.addEventListener('blur', () => { i.value = app.state.names[t]; app.render(); });
    i.addEventListener('keydown', e => { if(e.key === 'Enter') i.blur(); });
  });

  sheet.querySelectorAll('[data-opt]').forEach(c => {
    c.addEventListener('change', () => {
      app.state.opts[c.dataset.opt] = c.checked;
      app.commit();
      if(c.dataset.opt === 'awake') app.wake.sync();
    });
  });

  // Confirmación en dos toques para acciones destructivas
  let armTimer = null;
  function disarmAll(){
    clearTimeout(armTimer);
    sheet.querySelectorAll('.armed').forEach(b => { b.classList.remove('armed'); b.textContent = b.dataset.label; });
  }
  function twoStep(btn, fn){
    if(btn.classList.contains('armed')){ disarmAll(); fn(); return; }
    disarmAll();
    btn.classList.add('armed');
    btn.textContent = 'Tocá de nuevo para confirmar';
    armTimer = setTimeout(disarmAll, 3000);
  }

  return { open, close, isOpen, render, twoStep };
}
