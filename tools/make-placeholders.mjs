// Создаёт фото-заглушки в цветах студии для всех файлов, на которые ссылается src/data/masters.json.
// Существующие файлы не трогает, поэтому настоящие фото не перезапишутся.
// Запуск: npm run placeholders
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const C = { sand: '#C4B5A0', lt: '#D2C6B3', dp: '#B3A28A', br: '#7F372C', ol: '#7A7840', ink: '#2B1E17' };

const leaf = (x, y, s, r, f) =>
  `<path transform="translate(${x} ${y}) rotate(${r}) scale(${s})" fill="${f}" d="M0 0c-40-60-45-130 0-190 45 60 40 130 0 190z"/>`;
const circ = (x, y, r, f) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`;
const ring = (x, y, r, w, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
const bg = (f) => `<rect width="300" height="400" fill="${f}"/>`;

// Рисунки 300×400 (3:4) — те же, что были в макете.
const tattooArts = [
  () => bg(C.lt) + leaf(150, 330, 1.2, 0, C.ol) + leaf(150, 330, 1, -35, C.ol) + leaf(150, 330, 0.9, 38, C.ol) + circ(150, 250, 34, C.br),
  () => { let s = bg(C.br); for (let i = 0; i < 8; i++) s += leaf(150, 200, 0.55, i * 45, C.sand); return s + circ(150, 200, 20, C.br) + ring(150, 200, 26, 3, C.sand); },
  () => bg(C.sand) + `<path d="M60 330C80 220 140 280 150 180S230 120 250 60" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>` + leaf(150, 180, 0.28, 30, C.ink) + leaf(120, 255, 0.22, -50, C.ink) + leaf(205, 115, 0.2, 40, C.ink) + circ(250, 60, 6, C.br),
  () => { let s = bg(C.ink); for (let i = 0; i < 5; i++) s += ring(150, 200, 30 + i * 24, 2, C.sand); return s + circ(150, 200, 16, C.br); },
];
const piercingArts = [
  () => bg(C.dp) + ring(150, 200, 70, 7, C.br) + circ(150, 130, 16, C.br) + circ(150, 130, 6, C.sand),
  () => bg(C.ol) + `<path d="M80 230a70 70 0 0 0 140 0" fill="none" stroke="${C.sand}" stroke-width="7" stroke-linecap="round"/>` + circ(80, 230, 13, C.sand) + circ(220, 230, 13, C.sand),
  () => bg(C.br) + ring(150, 170, 40, 5, C.sand) + circ(150, 230, 12, C.sand) + ring(150, 290, 22, 5, C.sand),
  () => bg(C.lt) + circ(150, 200, 70, C.sand) + circ(150, 200, 40, C.br) + circ(138, 188, 8, C.lt),
];
// Портреты 400×500 (4:5).
const portraits = [
  `<rect width="400" height="500" fill="${C.dp}"/>` + leaf(200, 470, 1.6, -20, C.ol) + leaf(200, 470, 1.4, 22, C.ol) + circ(200, 250, 70, C.br),
  `<rect width="400" height="500" fill="${C.ink}"/>` + ring(200, 250, 60, 3, C.sand) + ring(200, 250, 100, 3, C.sand) + ring(200, 250, 140, 3, C.sand) + circ(200, 250, 24, C.br),
  `<rect width="400" height="500" fill="${C.ol}"/>` + ring(200, 230, 90, 9, C.sand) + circ(200, 140, 22, C.sand) + circ(200, 140, 9, C.br),
];

const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`);

async function write(file, w, h, body, outW) {
  if (existsSync(file)) return false;
  mkdirSync(dirname(file), { recursive: true });
  await sharp(svg(w, h, body)).resize(outW).jpeg({ quality: 85 }).toFile(file);
  return true;
}

const masters = JSON.parse(readFileSync(join(root, 'src/data/masters.json'), 'utf8'));
let created = 0;
for (const [mi, m] of masters.entries()) {
  const dir = join(root, 'src/content/masters', m.slug);
  if (await write(join(dir, m.photo), 400, 500, portraits[mi % portraits.length], 800)) created++;
  const arts = m.direction === 'piercing' ? piercingArts : m.direction === 'both' ? [...tattooArts, ...piercingArts] : tattooArts;
  for (const [wi, w] of m.works.entries()) {
    if (await write(join(dir, w.photo), 300, 400, arts[(wi + mi) % arts.length](), 900)) created++;
  }
}
console.log(`Создано заглушек: ${created}`);
