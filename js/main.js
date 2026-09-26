// Punto de entrada: arma el objeto `app` y conecta la UI con las reglas del juego.
//
// Flujo: un evento llama a app.actions.* → la acción modifica app.state con game.js
// → app.commit() guarda y re-renderiza todo.

import { load, save } from './state.js';
import * as game from './game.js';
import { BUZZ, vibrate, createWakeLock } from './platform.js';
import { createTeams } from './ui/teams.js';
import { createWin } from './ui/win.js';
import { createSettings } from './ui/settings.js';
import { createBoardGestures } from './ui/gestures.js';

const $ = sel => document.querySelector(sel);

const app = {
  state: load(),
  lastAdd: null,           // último puntaje sumado, para animar los fósforos nuevos
  save(){ save(app.state); },
  commit(){ app.save(); app.render(); },
  buzz(pattern){ if(app.state.opts.vibrate) vibrate(pattern); },
  announce(t){ $('#live').textContent = `${app.state.names[t]} ${app.state.scores[t]}`; },
  render(){
    const S = app.state;
    document.body.classList.toggle('hide-nums', !S.opts.numbers);
    document.body.classList.toggle('no-quick', !S.opts.quick);
    app.teams.render();
    $('#undoBtn').disabled = S.history.length === 0;
    app.settings.render();
    app.win.render(S);
    app.lastAdd = null;
  },
  actions: {
    add(t, n){
      const r = game.add(app.state, t, n);
      if(!r) return;
      app.lastAdd = r;
      app.buzz(r.won ? BUZZ.win : BUZZ.add);
      app.commit(); app.announce(t);
    },
    sub(t){
      const r = game.sub(app.state, t);
      if(!r) return;
      app.buzz(BUZZ.sub);
      app.commit(); app.announce(t);
    },
    undo(){
      const r = game.undo(app.state);
      if(!r) return;
      app.buzz(BUZZ.undo);
      app.commit(); app.announce(r.t);
    },
    newGame(){ game.newGame(app.state); app.commit(); },
    clearWins(){ game.clearWins(app.state); app.commit(); },
    setTarget(v){ if(game.setTarget(app.state, v)) app.commit(); }
  }
};

app.teams = createTeams($('#teams'), app);
app.win = createWin($('#win'));
app.settings = createSettings($('#sheet'), app);
app.wake = createWakeLock(() => app.state.opts.awake);
const gestures = createBoardGestures($('#teams'), app);

// Todos los botones declaran su acción con data-act (y data-t para el equipo)
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if(!el) return;
  const t = el.dataset.t !== undefined ? +el.dataset.t : null;
  const { actions, settings } = app;
  switch(el.dataset.act){
    case 'board': if(!gestures.consumeSuppressedClick()) actions.add(t, 1); break;
    case 'plus': actions.add(t, 1); break;
    case 'add': actions.add(t, +el.dataset.n); break;
    case 'minus': actions.sub(t); break;
    case 'undo': actions.undo(); break;
    case 'settings': settings.open(); break;
    case 'name': settings.open(t); break;
    case 'close': settings.close(); break;
    case 'rematch': actions.newGame(); break;
    case 'target': actions.setTarget(+el.dataset.v); break;
    case 'reset': settings.twoStep(el, () => { actions.newGame(); settings.close(); }); break;
    case 'clearwins': settings.twoStep(el, () => actions.clearWins()); break;
  }
});

document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && app.settings.isOpen()) app.settings.close();
});

app.render();
app.wake.sync();
