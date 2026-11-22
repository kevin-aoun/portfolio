import '@fontsource-variable/albert-sans';
import '../src/styles/base.css';
import '../src/styles/footer.css';
import { fieldMarkup, initField } from '../src/footer/field.js';
document.documentElement.classList.add('js');
document.querySelector('.foot').innerHTML = fieldMarkup() + '<p style="margin-top:24px;color:var(--muted)">AI engineer, Beirut · © 2026</p>';
initField({ reduced: matchMedia('(prefers-reduced-motion: reduce)').matches });
