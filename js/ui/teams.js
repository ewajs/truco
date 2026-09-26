// Columnas de cada equipo: nombre, puntaje, tablero de fósforos y botones.

import { TEAMS, isEmpty, standing, winsLabel } from '../game.js';
import { boardHTML } from '../matches.js';
import { layoutBoard, observeBoards } from '../layout.js';

const $ = (sel, root) => root.querySelector(sel);

const pencil = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/></svg>`;

function teamHTML(t){
  return `<section class="team" data-t="${t}">
      <div class="team-head">
        <button class="name" data-act="name" data-t="${t}"><span class="name-text"></span>${pencil}</button>
        <div class="wins"></div>
        <div class="score" aria-hidden="true"></div>
        <div class="left"></div>
      </div>
      <div class="board" role="button" tabindex="0" data-act="board" data-t="${t}"></div>
      <div class="controls">
        <button class="minus" data-act="minus" data-t="${t}">−</button>
        <button class="plus" data-act="plus" data-t="${t}">+1</button>
      </div>
      <div class="quick">
        <button data-act="add" data-n="2" data-t="${t}">+2</button>
        <button data-act="add" data-n="3" data-t="${t}">+3</button>
        <button data-act="add" data-n="4" data-t="${t}">+4</button>
      </div>
    </section>`;
}

export function createTeams(root, app){
  root.innerHTML = TEAMS.map(teamHTML).join('');
  const boards = () => root.querySelectorAll('.board');
  let prevScores = app.state.scores.slice();

  function layout(){ boards().forEach(b => layoutBoard(b, app.state.target)); }
  observeBoards(boards(), layout);

  function render(){
    const S = app.state;
    const empty = isEmpty(S);

    TEAMS.forEach(t => {
      const sec = root.children[t];
      const sc = S.scores[t];
      const name = S.names[t];
      $('.name-text', sec).textContent = name;
      $('.name', sec).setAttribute('aria-label', `Cambiar nombre de ${name}`);
      $('.wins', sec).textContent = winsLabel(S.wins[t]);
      const scoreEl = $('.score', sec);
      scoreEl.textContent = sc;
      if(sc !== prevScores[t]){
        scoreEl.classList.remove('bump'); void scoreEl.offsetWidth; scoreEl.classList.add('bump');
      }
      $('.left', sec).textContent = standing(S, t);

      const board = $('.board', sec);
      const lastAdd = app.lastAdd && app.lastAdd.t === t ? app.lastAdd : null;
      let html = boardHTML(sc, S.target, lastAdd);
      if(empty) html += `<div class="hint">Tocá para sumar<br>Mantené para borrar</div>`;
      html += `<div class="erase-tag">Borrando</div>`;
      board.innerHTML = html;
      board.setAttribute('aria-label', `Sumar un punto a ${name}. Tiene ${sc} de ${S.target}.`);
      $('.minus', sec).disabled = sc === 0;
      $('.minus', sec).setAttribute('aria-label', `Restar un punto a ${name}`);
      $('.plus', sec).setAttribute('aria-label', `Sumar un punto a ${name}`);
    });

    layout();
    prevScores = S.scores.slice();
  }

  // Actualiza solo el nombre, sin re-renderizar (mientras se escribe en ajustes).
  function renderName(t){
    $('.name-text', root.children[t]).textContent = app.state.names[t];
  }

  return { render, renderName };
}
