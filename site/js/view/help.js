// Ayuda: carrusel corto con lo básico. Se desliza con el dedo (scroll-snap del CSS) o
// con "Siguiente"; los puntitos muestran en qué página está y sirven para saltar.

import { groupSVG } from './matches.js';

export function createHelp() {
  const dialog = document.getElementById('help');
  const track = document.getElementById('help-track');
  const slides = [...track.children];
  const dotsContainer = document.getElementById('help-dots');
  const next = document.getElementById('help-next');

  // Dibujos de fósforos: <div data-matches="3"> → un cuadrado con 3 fósforos
  track.querySelectorAll('[data-matches]').forEach(art => {
    art.insertAdjacentHTML('afterbegin', groupSVG(0, Number(art.dataset.matches)));
  });

  const dots = slides.map((slide, index) => {
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', `Página ${index + 1} de ${slides.length}`);
    dot.addEventListener('click', () => goTo(index));
    dotsContainer.append(dot);
    return dot;
  });

  function currentIndex() {
    return Math.round(track.scrollLeft / track.clientWidth);
  }

  function goTo(index) {
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
  }

  function update() {
    const index = currentIndex();
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
    next.textContent = index === slides.length - 1 ? 'Listo' : 'Siguiente';
  }

  function open() {
    dialog.classList.add('open');
    track.scrollTo({ left: 0 }); // siempre desde el principio
    update();
    next.focus({ preventScroll: true });
  }

  function close() {
    dialog.classList.remove('open');
  }

  track.addEventListener('scroll', update, { passive: true });
  next.addEventListener('click', () => {
    const index = currentIndex();
    if (index === slides.length - 1) close();
    else goTo(index + 1);
  });

  document.getElementById('open-help').addEventListener('click', open);
  document.getElementById('close-help').addEventListener('click', close);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) close(); // tocar afuera de la tarjeta
  });
  document.addEventListener('keydown', event => {
    if (!dialog.classList.contains('open')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowRight') goTo(Math.min(currentIndex() + 1, slides.length - 1));
    if (event.key === 'ArrowLeft') goTo(Math.max(currentIndex() - 1, 0));
  });
}
