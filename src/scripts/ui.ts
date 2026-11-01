// Общие эффекты всех страниц: появление блоков .rv и кастомный курсор.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll<HTMLElement>('.rv').forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 70 + 'ms';
    io.observe(el);
  });
} else {
  document.querySelectorAll('.rv').forEach((el) => el.classList.add('in'));
}

const cur = document.getElementById('cur');
if (cur && !reduced && window.matchMedia('(hover:hover)').matches) {
  let x = 0, y = 0, cx = 0, cy = 0;
  window.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; cur.classList.add('on'); });
  document.addEventListener('mouseleave', () => cur.classList.remove('on'));
  // Делегирование: срабатывает и для элементов, добавленных скриптами страниц позже.
  const hot = 'a,button,summary,.tile';
  document.addEventListener('mouseover', (e) => {
    cur.classList.toggle('big', !!(e.target as Element).closest?.(hot));
  });
  const loop = () => {
    cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
    cur.style.left = cx + 'px'; cur.style.top = cy + 'px';
    requestAnimationFrame(loop);
  };
  loop();
}
