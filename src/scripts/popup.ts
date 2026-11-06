// Попап сцены (прокол на /piercing, зона на /tattoo). Разметка: <div data-popup data-event="…" data-ignore="…">
// с карточками <article data-pp="id">. Открывается по событию data-event (detail.ids), закрывается крестиком,
// Esc и кликом мимо – кроме элементов из data-ignore (модель, список). Несколько ids – вкладки вверху.
// На телефоне это шторка снизу: её можно смахнуть вниз за ручку или за верх, пока текст не прокручен.
export interface SelectDetail { ids: string[] }

document.querySelectorAll<HTMLElement>('[data-popup]').forEach(init);

function init(popup: HTMLElement) {
  const eventName = popup.dataset.event!;
  const ignore = popup.dataset.ignore ?? '';
  const card = popup.querySelector<HTMLElement>('.pp-card')!;
  const tabs = popup.querySelector<HTMLElement>('[data-tabs]')!;
  const articles = [...popup.querySelectorAll<HTMLElement>('[data-pp]')];
  const nameOf = (id: string) => articles.find((a) => a.dataset.pp === id)?.querySelector('h3')?.textContent ?? id;
  const mobile = window.matchMedia('(max-width: 900px)');
  let returnFocus: HTMLElement | null = null;
  // После касания модели телефон досылает «клик» в ту же точку – туда, где уже открылось затемнение.
  // Такой клик не должен закрывать только что открытую шторку.
  let openedAt = 0;
  const GHOST_CLICK_MS = 450;

  const select = (ids: string[]) =>
    document.dispatchEvent(new CustomEvent<SelectDetail>(eventName, { detail: { ids } }));

  function show(id: string) {
    articles.forEach((a) => (a.hidden = a.dataset.pp !== id));
    tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === id)));
    card.setAttribute('aria-label', nameOf(id));
    card.scrollTop = 0;
  }

  function open(ids: string[]) {
    if (popup.hidden) returnFocus = document.activeElement as HTMLElement | null;
    tabs.hidden = ids.length < 2;
    tabs.replaceChildren(...(ids.length < 2 ? [] : ids.map((id) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('role', 'tab');
      b.dataset.id = id;
      b.textContent = nameOf(id);
      b.addEventListener('click', () => show(id));
      return b;
    })));
    show(ids[0]);
    if (popup.hidden) openedAt = performance.now();
    card.style.transform = card.style.transition = '';
    popup.hidden = false;
    document.documentElement.classList.toggle('pp-lock', mobile.matches);
    requestAnimationFrame(() => popup.classList.add('open'));
    card.focus({ preventScroll: true });
  }

  function close() {
    popup.classList.remove('open');
    document.documentElement.classList.remove('pp-lock');
    popup.hidden = true;
    returnFocus?.focus({ preventScroll: true });
    returnFocus = null;
  }

  document.addEventListener(eventName, (e) => {
    const ids = (e as CustomEvent<SelectDetail>).detail.ids;
    if (ids.length) open(ids);
    else if (!popup.hidden) close();
  });
  popup.querySelectorAll('[data-close]').forEach((el) =>
    el.addEventListener('click', () => {
      if (performance.now() - openedAt > GHOST_CLICK_MS) select([]);
    }),
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popup.hidden) select([]);
  });
  document.addEventListener('pointerdown', (e) => {
    if (popup.hidden) return;
    const t = e.target as Element;
    if (card.contains(t) || t.closest('[data-close]') || (ignore && t.closest(ignore))) return;
    select([]);
  });
  setupSwipe(card, mobile, () => select([]));
}

/** Смахивание шторки вниз: тянется за пальцем, закрывается дальше трети высоты или быстрым жестом. */
function setupSwipe(card: HTMLElement, mobile: MediaQueryList, close: () => void) {
  let start: { x: number; y: number; t: number } | null = null;
  let dragging = false;
  let dy = 0;

  card.addEventListener('touchstart', (e) => {
    if (!mobile.matches || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const top = card.getBoundingClientRect().top;
    // За ручку (верх шторки) – всегда; ниже – только если текст прокручен к началу.
    if (card.scrollTop > 0 && touch.clientY - top > 48) return;
    start = { x: touch.clientX, y: touch.clientY, t: performance.now() };
    dragging = false;
    dy = 0;
  }, { passive: true });

  card.addEventListener('touchmove', (e) => {
    if (!start) return;
    const touch = e.touches[0];
    const mx = touch.clientX - start.x, my = touch.clientY - start.y;
    if (!dragging) {
      // Горизонтальный жест – это лента фото, вверх – прокрутка текста.
      if (Math.abs(mx) > Math.abs(my) || my < 0) { start = null; return; }
      if (my < 6) return;
      dragging = true;
      card.style.transition = 'none';
    }
    e.preventDefault();
    dy = Math.max(0, my);
    card.style.transform = `translateY(${dy}px)`;
  }, { passive: false });

  const end = () => {
    if (!start) return;
    const speed = dy / Math.max(1, performance.now() - start.t);
    start = null;
    if (!dragging) return;
    dragging = false;
    card.style.transition = '';
    if (dy > card.offsetHeight / 3 || speed > 0.6) {
      card.style.transform = 'translateY(100%)';
      setTimeout(close, 200);
    } else {
      card.style.transform = '';
    }
  };
  card.addEventListener('touchend', end);
  card.addEventListener('touchcancel', end);
}
