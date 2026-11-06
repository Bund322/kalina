// Проверяет внутренние ссылки собранного сайта в dist/: страница существует, якорь есть на странице.
// Запуск после сборки: npm run check-links (для сборки под GitHub Pages — с SITE_BASE=/kalina).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const base = (process.env.SITE_BASE || '/').replace(/\/$/, '');
const pages = {};
const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = join(d, e.name);
  if (e.isDirectory()) walk(p);
  else if (e.name.endsWith('.html')) {
    const rel = relative('dist', p).split(sep).join('/');
    pages['/' + rel.replace(/index[.]html$/, '').replace(/[/]$/, '')] = readFileSync(p, 'utf8');
  }
});
walk('dist');

const bad = [];
for (const [page, html] of Object.entries(pages)) {
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|data:)/.test(href) || href.includes('/_astro/') || href.endsWith('.svg')) continue;
    if (href.startsWith('/') && base && !href.startsWith(base + '/')) { bad.push(`${page}: ${href} — без base ${base}`); continue; }
    const [path, hash] = href.split('#');
    const target = path === '' ? page : path.slice(base.length).replace(/[/]$/, '') || '/';
    // Ссылка на файл (PDF и т. п.) — достаточно, что он есть в dist/.
    if (/[.][a-z0-9]+$/i.test(target)) { if (!existsSync(join('dist', target))) bad.push(`${page}: ${href} — нет файла`); continue; }
    if (!(target in pages)) bad.push(`${page}: ${href} — нет страницы`);
    else if (hash && !pages[target].includes(`id="${hash}"`)) bad.push(`${page}: ${href} — нет якоря`);
  }
}
console.log(`Страниц: ${Object.keys(pages).length}`);
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log('Все внутренние ссылки в порядке');
