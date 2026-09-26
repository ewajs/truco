// Partida compartida por link. Funciones puras: se testean con Node.
//
// La partida viaja en el hash de la URL (lo que va después de #), así nunca llega al
// servidor y el link sigue funcionando en GitHub Pages:
//
//   https://…/truco/#a=30&de=4&equipo1=Primos&puntos1=12&ganadas1=1&equipo2=Tíos&puntos2=7&ganadas2=0
//                     &jugador1=Juan&jugador2=Pedro&jugador3=Ana&jugador4=Sofi&mano=2
//
// Se comparten los nombres, los puntos, las ganadas, a cuántos puntos, de a cuántos
// jugadores y la mesa (jugadores en orden y qué lugar es mano, desde 1). El historial y
// las opciones no.

import { TARGETS, PLAYER_COUNTS, cleanName } from './game.js';
import { cleanPlayerName } from './table.js';

const MAX_WINS = 999;

export function gameToHash(state) {
  const params = new URLSearchParams({ a: state.target, de: state.playerCount });
  state.teams.forEach((team, i) => {
    params.set(`equipo${i + 1}`, team.name);
    params.set(`puntos${i + 1}`, team.score);
    params.set(`ganadas${i + 1}`, team.wins);
  });
  state.players.slice(0, state.playerCount).forEach((name, seat) => {
    params.set(`jugador${seat + 1}`, name);
  });
  params.set('mano', state.manoSeat + 1);
  return `#${params}`;
}

// Devuelve { target, playerCount, teams: [{ name, score, wins }], players, manoSeat }, o
// null si el hash no trae una partida válida (por ejemplo, un link común sin #).
// `playerCount` falta en links viejos o si viene mal, y entonces se conserva el de quien lo
// abre. La mesa (players y manoSeat) viene solo si el link trae todos los jugadores y un
// lugar válido como mano.
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

  const playerCount = Number(params.get('de'));
  if (!PLAYER_COUNTS.includes(playerCount)) return { target, teams };
  return { target, playerCount, teams, ...tableFromParams(params, playerCount) };
}

// La mesa del link, o nada si falta algún jugador (links viejos) o la mano no es un lugar.
function tableFromParams(params, playerCount) {
  const names = Array.from({ length: playerCount }, (_, seat) => params.get(`jugador${seat + 1}`));
  if (names.some(name => name === null)) return {};
  const manoSeat = wholeNumber(params.get('mano'), playerCount);
  if (manoSeat === null || manoSeat === 0) return {};
  return { players: names.map(cleanPlayerName), manoSeat: manoSeat - 1 };
}

// "12" → 12. Devuelve null si no es un entero entre 0 y max.
function wholeNumber(text, max) {
  if (text === null || !/^\d+$/.test(text)) return null;
  const value = Number(text);
  return value <= max ? value : null;
}
