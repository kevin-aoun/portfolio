// Dark by default; the bar's button flips to light and remembers the choice.

export function initTheme(onChange) {
  const root = document.documentElement;
  const btn = document.querySelector('.theme');
  const sync = () => {
    const t = root.dataset.theme;
    btn?.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  };
  sync();
  btn?.addEventListener('click', () => {
    const t = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch (e) { /* private mode: the choice just isn't remembered */ }
    sync();
    onChange?.(t);
  });
}
