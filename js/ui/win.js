// Cartel de ganador.

import { winner } from '../game.js';

export function createWin(el){
  const title = el.querySelector('#winTitle');
  const score = el.querySelector('#winScore');
  const primary = el.querySelector('.btn-accent');

  function render(S){
    const w = winner(S);
    const open = w !== null;
    if(open){
      title.textContent = `Ganó ${S.names[w]}`;
      score.textContent = `Partidas ganadas: ${S.names[0]} ${S.wins[0]}, ${S.names[1]} ${S.wins[1]}`;
    }
    if(open !== el.classList.contains('open')){
      el.classList.toggle('open', open);
      if(open) setTimeout(() => primary.focus({ preventScroll: true }), 50);
    }
  }

  return { render };
}
