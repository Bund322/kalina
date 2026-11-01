// Главная: фильтр галереи «Работы» и параллакс ягод в hero.

// У плитки в data-c перечислены категории через пробел: мастер «both» попадает и в тату, и в пирсинг.
document.querySelectorAll<HTMLButtonElement>('.chip').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    const f = b.dataset.f!;
    document.querySelectorAll<HTMLElement>('#grid .tile').forEach((t) => {
      t.classList.toggle('hide', f !== 'all' && !t.dataset.c!.split(' ').includes(f));
    });
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
