// Dibujo de los fósforos como SVG (strings). Funciones puras: se testean con Node.
//
// Cada grupo es un cuadrado de 5 puntos: los cuatro lados y la diagonal, cada fósforo
// con la cabeza en el extremo final.

import { POINTS_PER_GROUP, groupCount, hasBuenas } from '../game.js';

// [x1, y1, x2, y2] de cada fósforo, en el orden en que se anotan
const SIDES = [
  [12, 90, 12, 10], // izquierda
  [10, 12, 90, 12], // arriba
  [88, 10, 88, 90], // derecha
  [90, 88, 10, 88], // abajo
  [22, 78, 80, 20], // diagonal
];

// Pequeña inclinación para que no se vean perfectos
const JITTER = [-1.6, 1.2, -0.8, 1.8, -1.1];

// Tablero completo: todos los grupos y, si se juega a 30, el divisor de "Buenas".
// Los puntos mayores a `animateFrom` se dibujan con la animación de recién anotados.
export function boardSVG(score, target, animateFrom = score) {
  let html = '';
  for (let group = 0; group < groupCount(target); group++) {
    if (hasBuenas(target) && group === groupCount(target) / 2) {
      html += '<div class="divider">Buenas</div>';
    }
    html += groupSVG(group, score, animateFrom);
  }
  return html;
}

function groupSVG(group, score, animateFrom) {
  const firstPoint = group * POINTS_PER_GROUP + 1;
  let matches = '';
  for (let side = 0; side < POINTS_PER_GROUP; side++) {
    const point = firstPoint + side;
    if (point > score) break;
    matches += matchSVG(side, group, point > animateFrom);
  }
  return `<svg class="grp" viewBox="-3 -3 106 106" aria-hidden="true">`
    + `<rect class="ghost" x="12" y="12" width="76" height="76" rx="3"/>`
    + matches
    + `</svg>`;
}

function matchSVG(side, group, isNew) {
  const [x1, y1, x2, y2] = SIDES[side];
  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + JITTER[(side + group) % JITTER.length];
  const stick = length - 7;
  const spark = isNew ? `<circle class="spark" cx="${length - 3}" cy="0" r="4"/>` : '';
  return `<g transform="translate(${x1} ${y1}) rotate(${angle.toFixed(2)})">
      <g class="m${isNew ? ' new' : ''}">
        <rect class="stick" x="0" y="-3.4" width="${stick}" height="6.8" rx="1.6"/>
        <rect class="stick-edge" x="0" y="1.4" width="${stick}" height="2"/>
        <ellipse class="head" cx="${length - 5}" cy="0" rx="7" ry="5.4"/>
        <ellipse class="glint" cx="${length - 7}" cy="-2" rx="2.4" ry="1.3"/>
      </g>
      ${spark}
    </g>`;
}
