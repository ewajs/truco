// Ayuda: carrusel corto con lo básico. Se desliza con el dedo (scroll-snap del CSS) o
// con "Siguiente"; los puntitos muestran en qué página está y sirven para saltar.

import { groupSVG } from './matches.js';
import { createDialog } from './dialog.js';

export function createHelp() {
  const dialog = createDialog(document.getElementById('help'));
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
    track.scrollTo({ left: 0 }); // siempre desde el principio
    update();
    dialog.open({ focus: next });
  }

  track.addEventListener('scroll', update, { passive: true });
  next.addEventListener('click', () => {
    const index = currentIndex();
    if (index === slides.length - 1) dialog.close();
    else goTo(index + 1);
  });

  document.getElementById('open-help').addEventListener('click', open);
  document.getElementById('close-help').addEventListener('click', () => dialog.close());
  document.addEventListener('keydown', event => {
    if (!dialog.isOpen()) return;
    if (event.key === 'ArrowRight') goTo(Math.min(currentIndex() + 1, slides.length - 1));
    if (event.key === 'ArrowLeft') goTo(Math.max(currentIndex() - 1, 0));
  });
}
