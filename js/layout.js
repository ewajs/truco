// Calcula el tamaño de cada cuadrado y el espacio entre ellos según el alto disponible.

const MAX_SIZE = 72, GAP_RATIO = 0.42, MIN_GAP = 14, DIV_H = 18;

export function layoutBoard(board, target){
  const n = target / 5;
  const hasDiv = target === 30 ? 1 : 0;
  const cs = getComputedStyle(board);
  const H = board.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const W = board.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  if(H <= 0 || W <= 0) return;
  const gaps = n - 1 + hasDiv;           // el divisor suma un hueco más
  const fixed = hasDiv * DIV_H;
  let size = (H - fixed) / (n + GAP_RATIO * gaps);
  let gap = size * GAP_RATIO;
  if(gap < MIN_GAP){ gap = MIN_GAP; size = (H - fixed - gap * gaps) / n; }
  size = Math.max(22, Math.min(MAX_SIZE, W * 0.72, size));
  // si sobra alto, repartirlo en los huecos sin agrandar los fósforos
  gap = Math.max(MIN_GAP, Math.min((H - fixed - size * n) / Math.max(1, gaps), size * 0.7));
  board.style.setProperty('--s', size.toFixed(1) + 'px');
  board.style.setProperty('--g', gap.toFixed(1) + 'px');
}

// Recalcula los tableros cuando cambia su tamaño.
export function observeBoards(boards, relayout){
  if('ResizeObserver' in window){
    const ro = new ResizeObserver(relayout);
    boards.forEach(b => ro.observe(b));
  } else {
    window.addEventListener('resize', relayout);
  }
}
