// Dibujo de los fósforos en SVG. Cada grupo es un cuadrado de 5 puntos:
// cuatro lados y la diagonal, cada uno con la cabeza en el extremo final.

const SEG = [
  [12,90, 12,10],
  [10,12, 90,12],
  [88,10, 88,90],
  [90,88, 10,88],
  [22,78, 80,20]
];
const JITTER = [-1.6, 1.2, -0.8, 1.8, -1.1];

export const POINTS_PER_GROUP = SEG.length;

function matchSVG(i, isNew, g){
  const [x1,y1,x2,y2] = SEG[i];
  const L = Math.hypot(x2-x1, y2-y1);
  const j = JITTER[(i + g) % 5];
  const ang = Math.atan2(y2-y1, x2-x1) * 180 / Math.PI + j;
  const body = L - 7;
  return `<g transform="translate(${x1} ${y1}) rotate(${ang.toFixed(2)})">
      <g class="m${isNew ? ' new' : ''}">
        <rect class="stick" x="0" y="-3.4" width="${body}" height="6.8" rx="1.6"/>
        <rect class="stick-edge" x="0" y="1.4" width="${body}" height="2"/>
        <ellipse class="head" cx="${L-5}" cy="0" rx="7" ry="5.4"/>
        <ellipse class="glint" cx="${L-7}" cy="-2" rx="2.4" ry="1.3"/>
      </g>
      ${isNew ? `<circle class="spark" cx="${L-3}" cy="0" r="4"/>` : ''}
    </g>`;
}

// Grupo g con `count` fósforos. Los puntos en (newFrom, newTo] se animan como recién anotados.
export function groupSVG(count, g, newFrom = null, newTo = null){
  let s = `<svg class="grp" viewBox="-3 -3 106 106" aria-hidden="true"><rect class="ghost" x="12" y="12" width="76" height="76" rx="3"/>`;
  for(let i = 0; i < count; i++){
    const n = g*POINTS_PER_GROUP + i + 1; // número de punto
    const isNew = newFrom !== null && n > newFrom && n <= newTo;
    s += matchSVG(i, isNew, g);
  }
  return s + '</svg>';
}

// Todos los grupos de un tablero, con el divisor de "Buenas" si se juega a 30.
export function boardHTML(score, target, lastAdd){
  const groups = target / POINTS_PER_GROUP;
  const nf = lastAdd ? lastAdd.from : null;
  const nt = lastAdd ? lastAdd.to : null;
  let html = '';
  for(let g = 0; g < groups; g++){
    if(target === 30 && g === 3) html += `<div class="divider">Buenas</div>`;
    const count = Math.max(0, Math.min(POINTS_PER_GROUP, score - g*POINTS_PER_GROUP));
    html += groupSVG(count, g, nf, nt);
  }
  return html;
}
