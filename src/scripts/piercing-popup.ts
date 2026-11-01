// Попап прокола: открывается по `piercing:select`, закрывается крестиком, Esc и кликом мимо.
// Если выбрано несколько проколов на одной точке (язык/смайл, руук/ложный руук) — вверху вкладки.
import type { SelectDetail } from './piercing-head';

const popup = document.querySelector<HTMLElement>('[data-piercing-popup]');
if (popup) init(popup);

function init(popup: HTMLElement) {
  const card = popup.querySelector<HTMLElement>('.pp-card')!;
  const tabs = popup.querySelector<HTMLElement>('[data-tabs]')!;
  const articles = [...popup.querySelectorAll<HTMLElement>('[data-pp]')];
  const nameOf = (id: string) => articles.find((a) => a.dataset.pp === id)?.querySelector('h3')?.textContent ?? id;
  const mobile = window.matchMedia('(max-width: 900px)');
  let returnFocus: HTMLElement | null = null;

  const select = (ids: string[]) =>
    document.dispatchEvent(new CustomEvent<SelectDetail>('piercing:select', { detail: { ids } }));

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

  document.addEventListener('piercing:select', (e) => {
    const ids = (e as CustomEvent<SelectDetail>).detail.ids;
    if (ids.length) open(ids);
    else if (!popup.hidden) close();
  });
  popup.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => select([])));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popup.hidden) select([]);
  });
  // Клик мимо карточки закрывает её, но не клик по модели (её вращают) и не по другим проколам.
  document.addEventListener('pointerdown', (e) => {
    if (popup.hidden) return;
    const t = e.target as Element;
    if (card.contains(t) || t.closest('[data-piercing-stage], [data-piercing], [data-close]')) return;
    select([]);
  });
}
