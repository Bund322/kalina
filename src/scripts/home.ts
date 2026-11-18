// Главная: фильтр галереи «Работы» и параллакс ягод в hero.

// У плитки в data-c перечислены категории через пробел: тип работы, а без него – направление мастера
// (работа мастера «both» без типа попадает и в тату, и в пирсинг).
// Сразу показываем 3 ряда (12 работ), остальные – по кнопке «Показать ещё»; лимит считается после фильтра.
const PAGE = 12;
const tiles = [...document.querySelectorAll<HTMLElement>('#grid .tile')];
const more = document.getElementById('more') as HTMLButtonElement | null;
let filter = 'all';
let limit = PAGE;

function render() {
  const fits = tiles.filter((t) => filter === 'all' || t.dataset.c!.split(' ').includes(filter));
  tiles.forEach((t) => t.classList.add('hide'));
  fits.slice(0, limit).forEach((t) => t.classList.remove('hide'));
  if (more) more.hidden = fits.length <= limit;
}

document.querySelectorAll<HTMLButtonElement>('.chip').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    filter = b.dataset.f!;
    limit = PAGE;
    render();
  });
});
more?.addEventListener('click', () => {
  limit += PAGE;
  render();
});
render();

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
