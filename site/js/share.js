// Partida compartida por link. Funciones puras: se testean con Node.
//
// La partida viaja en el hash de la URL (lo que va después de #), así nunca llega al
// servidor y el link sigue funcionando en GitHub Pages:
//
//   https://…/truco/#a=30&equipo1=Primos&puntos1=12&ganadas1=1&equipo2=Tíos&puntos2=7&ganadas2=0
//
// Se comparten los nombres, los puntos, las ganadas y a cuántos se juega. El historial
// y las opciones no.

import { TARGETS, cleanName } from './game.js';

const MAX_WINS = 999;

export function gameToHash(state) {
  const params = new URLSearchParams({ a: state.target });
  state.teams.forEach((team, i) => {
    params.set(`equipo${i + 1}`, team.name);
    params.set(`puntos${i + 1}`, team.score);
    params.set(`ganadas${i + 1}`, team.wins);
  });
  return `#${params}`;
}

// Devuelve { target, teams: [{ name, score, wins }] }, o null si el hash no trae una
// partida válida (por ejemplo, un link común sin #).
export function gameFromHash(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const target = Number(params.get('a'));
  if (!TARGETS.includes(target)) return null;

  const teams = [0, 1].map(i => ({
    name: cleanName(params.get(`equipo${i + 1}`) ?? '', i),
    score: wholeNumber(params.get(`puntos${i + 1}`), target),
    wins: wholeNumber(params.get(`ganadas${i + 1}`) ?? '0', MAX_WINS),
  }));
  if (teams.some(team => team.score === null || team.wins === null)) return null;
  return { target, teams };
}

// "12" → 12. Devuelve null si no es un entero entre 0 y max.
function wholeNumber(text, max) {
  if (text === null || !/^\d+$/.test(text)) return null;
  const value = Number(text);
  return value <= max ? value : null;
}
