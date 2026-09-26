// Tema y modo claro/oscuro: se aplican como data-palette y data-mode sobre <html> (los
// colores de cada combinación están en styles.css). Con darkMode 'auto' se sigue al
// celular, también si cambia con la app abierta.

// Cuenta pura (se testea con Node): el modo que corresponde a la opción.
export function resolveMode(darkMode, systemPrefersDark) {
  if (darkMode === 'auto') return systemPrefersDark ? 'dark' : 'light';
  return darkMode ? 'dark' : 'light';
}

export function createAppearance() {
  const root = document.documentElement;
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let current = null;

  function apply(options) {
    current = options;
    root.dataset.palette = options.palette;
    root.dataset.mode = resolveMode(options.darkMode, systemDark.matches);
    // la barra del navegador (y de la app instalada) con el color del fondo
    themeColor.content = getComputedStyle(root).getPropertyValue('--felt').trim();
  }

  systemDark.addEventListener('change', () => {
    if (current?.darkMode === 'auto') apply(current);
  });

  return {
    render(state) {
      const { palette, darkMode } = state.options;
      if (current && palette === current.palette && darkMode === current.darkMode) return;
      apply({ palette, darkMode });
    },
    isDark: () => root.dataset.mode === 'dark',
  };
}
