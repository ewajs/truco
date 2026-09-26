// Las dos columnas de equipos: nombre, puntaje, tablero de fósforos y botones.

import { isFresh, standing } from '../game.js';
import { boardSVG } from './matches.js';
import { layoutBoard } from './layout.js';

export function createScoreboard(container, { onNameClick }) {
  const template = document.getElementById('team-template');
  const columns = [0, 1].map(team => createColumn(team));
  let target = null;
  let renderedScores = null; // para animar solo los fósforos nuevos

  container.replaceChildren(...columns.map(column => column.root));
  columns.forEach((column, team) => {
    column.nameButton.addEventListener('click', () => onNameClick(team));
  });
  const resizeObserver = new ResizeObserver(relayout);
  columns.forEach(column => resizeObserver.observe(column.board));

  function createColumn(team) {
    const root = template.content.firstElementChild.cloneNode(true);
    root.dataset.team = team; // los botones data-action toman el equipo de acá
    const column = { root };
    for (const element of root.querySelectorAll('[data-ref]')) {
      column[element.dataset.ref] = element;
    }
    return column;
  }

  function relayout() {
    if (target) columns.forEach(column => layoutBoard(column.board, target));
  }

  function render(state) {
    const targetChanged = state.target !== target;
    target = state.target;

    columns.forEach((column, team) => {
      const { name, score, wins } = state.teams[team];
      const previous = renderedScores?.[team] ?? score;

      column.name.textContent = name;
      column.nameButton.setAttribute('aria-label', `Cambiar nombre de ${name}`);
      column.wins.textContent = wins === 0 ? '' : wins === 1 ? '1 ganada' : `${wins} ganadas`;
      renderManoBadge(column.mano, name, state.mano === team);
      column.score.textContent = score;
      column.standing.textContent = standing(state, team);
      if (score !== previous) restartAnimation(column.score, 'bump');

      column.groups.innerHTML = boardSVG(score, target, Math.min(previous, score));
      column.hint.hidden = !isFresh(state);
      column.board.setAttribute('aria-label', `Sumar un punto a ${name}. Tiene ${score} de ${target}.`);

      column.minus.disabled = score === 0;
      column.minus.setAttribute('aria-label', `Restar un punto a ${name}`);
      column.plus.setAttribute('aria-label', `Sumar un punto a ${name}`);
    });

    renderedScores = state.teams.map(team => team.score);
    if (targetChanged) relayout();
  }

  return { render, boards: columns.map(column => column.board) };
}

// El badge siempre está: mano para el equipo que es mano, mazo para el otro.
function renderManoBadge(badge, teamName, isMano) {
  if (badge.classList.contains('is-mano') !== isMano) restartAnimation(badge, 'swap');
  badge.classList.toggle('is-mano', isMano);
  badge.setAttribute('aria-label', isMano
    ? `${teamName} es mano. Tocá para pasar la mano`
    : `${teamName} tiene el mazo. Tocá para pasarle la mano`);
}

function restartAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth; // forzar reflow para que la animación arranque de nuevo
  element.classList.add(className);
}
