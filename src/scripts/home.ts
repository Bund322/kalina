// Главная: SVG-заглушки галереи и портретов мастеров, фильтр галереи, параллакс ягод в hero.
// Заглушки и фильтр временные — их заменят данные из masters.json (задачи 02, 03).
const C = { sand: '#C4B5A0', lt: '#D2C6B3', dp: '#B3A28A', br: '#7F372C', ol: '#7A7840', ink: '#2B1E17' };
const leaf = (x: number, y: number, s: number, r: number, f: string) =>
  `<path transform="translate(${x} ${y}) rotate(${r}) scale(${s})" fill="${f}" d="M0 0c-40-60-45-130 0-190 45 60 40 130 0 190z"/>`;
const circ = (x: number, y: number, r: number, f: string) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`;
const ring = (x: number, y: number, r: number, w: number, c: string) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="${w}"/>`;

const arts: Record<string, () => string> = {
  bot: () => `<rect width="300" height="400" fill="${C.lt}"/>` + leaf(150, 330, 1.2, 0, C.ol) + leaf(150, 330, 1, -35, C.ol) + leaf(150, 330, 0.9, 38, C.ol) + circ(150, 250, 34, C.br),
  orn: () => { let s = `<rect width="300" height="400" fill="${C.br}"/>`; for (let i = 0; i < 8; i++) s += leaf(150, 200, 0.55, i * 45, C.sand); return s + circ(150, 200, 20, C.br) + ring(150, 200, 26, 3, C.sand); },
  fine: () => `<rect width="300" height="400" fill="${C.sand}"/><path d="M60 330C80 220 140 280 150 180S230 120 250 60" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>` + leaf(150, 180, 0.28, 30, C.ink) + leaf(120, 255, 0.22, -50, C.ink) + leaf(205, 115, 0.2, 40, C.ink) + circ(250, 60, 6, C.br),
  black: () => { let s = `<rect width="300" height="400" fill="${C.ink}"/>`; for (let i = 0; i < 5; i++) s += ring(150, 200, 30 + i * 24, 2, C.sand); return s + circ(150, 200, 16, C.br); },
  helix: () => `<rect width="300" height="400" fill="${C.dp}"/>` + ring(150, 200, 70, 7, C.br) + circ(150, 130, 16, C.br) + circ(150, 130, 6, C.sand),
  sept: () => `<rect width="300" height="400" fill="${C.ol}"/><path d="M80 230a70 70 0 0 0 140 0" fill="none" stroke="${C.sand}" stroke-width="7" stroke-linecap="round"/>` + circ(80, 230, 13, C.sand) + circ(220, 230, 13, C.sand),
  lobe: () => `<rect width="300" height="400" fill="${C.br}"/>` + ring(150, 170, 40, 5, C.sand) + circ(150, 230, 12, C.sand) + ring(150, 290, 22, 5, C.sand),
  nost: () => `<rect width="300" height="400" fill="${C.lt}"/>` + circ(150, 200, 70, C.sand) + circ(150, 200, 40, C.br) + circ(138, 188, 8, C.lt),
};
const items: [string, string, string, string][] = [
  ['bot', 'tattoo', 'Ботаника', 'Тату'], ['helix', 'piercing', 'Хеликс', 'Пирсинг'], ['orn', 'tattoo', 'Орнамент', 'Тату'], ['sept', 'piercing', 'Септум', 'Пирсинг'],
  ['fine', 'tattoo', 'Fine line', 'Тату'], ['lobe', 'piercing', 'Мочка', 'Пирсинг'], ['black', 'tattoo', 'Графика', 'Тату'], ['nost', 'piercing', 'Нострил', 'Пирсинг'],
];
const grid = document.getElementById('grid');
if (grid) {
  grid.innerHTML = items.map((it) =>
    `<figure class="tile rv in" tabindex="0" data-c="${it[1]}" style="margin:0"><svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">${arts[it[0]]()}</svg><figcaption><b>${it[2]}</b><small>${it[3]}</small></figcaption></figure>`
  ).join('');
}
const mArt: Record<string, string> = {
  m1: `<rect width="400" height="500" fill="#B3A28A"/>` + leaf(200, 470, 1.6, -20, C.ol) + leaf(200, 470, 1.4, 22, C.ol) + circ(200, 250, 70, C.br),
  m2: `<rect width="400" height="500" fill="#2B1E17"/>` + ring(200, 250, 60, 3, C.sand) + ring(200, 250, 100, 3, C.sand) + ring(200, 250, 140, 3, C.sand) + circ(200, 250, 24, C.br),
  m3: `<rect width="400" height="500" fill="#7A7840"/>` + ring(200, 230, 90, 9, C.sand) + circ(200, 140, 22, C.sand) + circ(200, 140, 9, C.br),
};
document.querySelectorAll('[data-art]').forEach((s) => { s.innerHTML = mArt[s.getAttribute('data-art')!]; });

document.querySelectorAll<HTMLButtonElement>('.chip').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    const f = b.dataset.f;
    document.querySelectorAll<HTMLElement>('.tile').forEach((t) => t.classList.toggle('hide', f !== 'all' && t.dataset.c !== f));
  });
});

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero = document.getElementById('hero');
if (hero && !reduced && window.matchMedia('(hover:hover)').matches) {
  const bs = hero.querySelectorAll<SVGElement>('.berry-float');
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
    bs.forEach((b, i) => {
      const k = +b.dataset.k!;
      b.style.transform = `translate(${dx * k * -1.4}px,${dy * k * -1.4}px) rotate(${i ? 18 : 0}deg)`;
    });
  });
}
