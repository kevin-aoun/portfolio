// The bench: the sections after the story, without the 3D stage, in either theme.
import '@fontsource-variable/albert-sans';
import '@fontsource-variable/jetbrains-mono';
import '../src/styles/base.css';
import '../src/styles/sections.css';
import { workSection, projectsSection, writingSection, contactSection, footer, dates } from '../src/sections/render.js';
import { initSections } from '../src/sections/motion.js';
import { initContact } from '../src/contact.js';
import { bindTokenSwitches } from '../src/tokens.js';
import { initTheme } from '../src/theme.js';

// The date formatter decides what the list and the trace say; check its three shapes.
console.assert(dates({ from: '2026-08', to: null }) === 'Aug 2026 – now', 'open range');
console.assert(dates({ from: '2024-08', to: '2024-12' }) === 'Aug – Dec 2024', 'same year');
console.assert(dates({ from: '2025-06', to: '2026-08' }) === 'Jun 2025 – Aug 2026', 'across years');

document.documentElement.classList.add('js');
document.querySelector('main').insertAdjacentHTML('beforeend', workSection() + projectsSection() + writingSection() + contactSection());
document.querySelector('main').insertAdjacentHTML('afterend', footer());
bindTokenSwitches();
initTheme();
initContact();
initSections({ reduced: matchMedia('(prefers-reduced-motion: reduce)').matches });
