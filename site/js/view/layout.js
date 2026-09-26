// Tamaño de los cuadrados de fósforos y del espacio entre ellos, según el alto del tablero.
// Se guarda en las variables CSS --s (lado del cuadrado) y --g (espacio).

import { groupCount, hasBuenas } from '../game.js';

export const MAX_SIZE = 72;
export const MIN_SIZE = 22;
export const MIN_GAP = 14;
export const DIVIDER_HEIGHT = 18;
const GAP_RATIO = 0.42; // espacio ideal, en proporción al lado del cuadrado

// Cuenta pura (se testea con Node): lado de cada cuadrado y espacio entre ellos para un
// tablero de `width` × `height` px útiles.
export function boardMetrics({ width, height, target }) {
  const groups = groupCount(target);
  const divider = hasBuenas(target) ? 1 : 0;
  const gaps = groups - 1 + divider; // el divisor suma un hueco más
  const available = height - divider * DIVIDER_HEIGHT;

  let size = available / (groups + GAP_RATIO * gaps);
  if (size * GAP_RATIO < MIN_GAP) size = (available - MIN_GAP * gaps) / groups;
  size = Math.max(MIN_SIZE, Math.min(MAX_SIZE, width * 0.72, size));

  // Si sobra alto, se reparte en los huecos sin agrandar los fósforos.
  const gap = Math.max(MIN_GAP, Math.min((available - size * groups) / Math.max(1, gaps), size * 0.7));
  return { size, gap };
}

export function layoutBoard(board, target) {
  const style = getComputedStyle(board);
  const height = board.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const width = board.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  if (height <= 0 || width <= 0) return;

  const { size, gap } = boardMetrics({ width, height, target });
  board.style.setProperty('--s', `${size.toFixed(1)}px`);
  board.style.setProperty('--g', `${gap.toFixed(1)}px`);
}
