// Estado persistido de la app: valores por defecto, carga y guardado en localStorage.
// Mantener la clave estable para no perder partidas guardadas; si cambia la forma
// del estado, migrar en normalize() en lugar de cambiar la clave.

export const STORAGE_KEY = 'truco-anotador-v1';
export const TARGETS = [15, 30];
export const HISTORY_LIMIT = 300;

export const DEFAULT_STATE = Object.freeze({
  target: 30,
  names: ['Nosotros', 'Ellos'],
  scores: [0, 0],
  wins: [0, 0],
  history: [],
  opts: { numbers: true, quick: true, vibrate: true, awake: false }
});

export function clone(o){ return JSON.parse(JSON.stringify(o)); }

export function createState(){ return clone(DEFAULT_STATE); }

// Completa lo que falte y corrige valores inválidos de un estado guardado.
export function normalize(raw){
  const s = Object.assign(createState(), raw);
  s.opts = Object.assign({}, DEFAULT_STATE.opts, (raw && raw.opts) || {});
  if(!TARGETS.includes(s.target)) s.target = DEFAULT_STATE.target;
  return s;
}

function storage(){
  try{ return globalThis.localStorage || null; }catch(e){ return null; }
}

export function load(store = storage()){
  try{
    const raw = store && store.getItem(STORAGE_KEY);
    if(raw) return normalize(JSON.parse(raw));
  }catch(e){}
  return createState();
}

export function save(state, store = storage()){
  try{ store && store.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
}
