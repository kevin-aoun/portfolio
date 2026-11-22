// Dark by default; the bar's button flips to light and remembers the choice.
const COLORS = { dark: '#0c0c0b', light: '#f1efea' };

export function initTheme(onChange) {
  const root = document.documentElement;
  const btn = document.querySelector('.theme');
  const meta = document.querySelector('meta[name="theme-color"]');
  const sync = () => {
    const t = root.dataset.theme;
    btn?.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    meta?.setAttribute('content', COLORS[t]);
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
