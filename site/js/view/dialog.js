// Diálogos y hojas: abrir, cerrar, Escape, tocar afuera y foco, en un solo lugar.
//
// Los diálogos abiertos forman una pila: Escape y Tab actúan sobre el de arriba, así una
// ayuda abierta encima de los ajustes se cierra sola sin cerrar los ajustes. Al cerrar,
// el foco vuelve a donde estaba.
//
// Uso:
//   const dialog = createDialog(element, { onDismiss, dismissOnBackdrop });
//   dialog.open({ focus: element }) · dialog.close() · dialog.isOpen()
//
// - `onDismiss`: qué hacer con Escape o al tocar afuera (por defecto, cerrar). Para un
//   diálogo que no se puede descartar así (el cartel de ganador), pasar () => {}.
// - `dismissOnBackdrop`: si tocar afuera de la tarjeta (el propio `element`) lo descarta.

const stack = [];

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

document.addEventListener('keydown', event => {
  const top = stack.at(-1);
  if (!top) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    top.dismiss();
  } else if (event.key === 'Tab') {
    keepFocusInside(top.element, event);
  }
});

export function createDialog(element, { onDismiss, dismissOnBackdrop = true } = {}) {
  let returnFocus = null;

  const dialog = {
    element,

    isOpen: () => stack.includes(dialog),

    // `focus`: el elemento a enfocar al abrir; por defecto el primero enfocable.
    // Con `false` no se mueve el foco.
    open({ focus } = {}) {
      if (dialog.isOpen()) return;
      returnFocus = document.activeElement;
      stack.push(dialog);
      element.classList.add('open');
      if (focus === false) return;
      const target = focus ?? element.querySelector(FOCUSABLE);
      target?.focus({ preventScroll: true });
    },

    close() {
      if (!dialog.isOpen()) return;
      stack.splice(stack.indexOf(dialog), 1);
      element.classList.remove('open');
      if (element.contains(document.activeElement)) document.activeElement.blur();
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    },

    dismiss() {
      if (onDismiss) onDismiss();
      else dialog.close();
    },
  };

  if (dismissOnBackdrop) {
    element.addEventListener('click', event => {
      if (event.target === element) dialog.dismiss();
    });
  }

  return dialog;
}

// Tab y Shift+Tab dan la vuelta dentro del diálogo en lugar de salir de él.
function keepFocusInside(element, event) {
  const focusable = [...element.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (!element.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  }
}
