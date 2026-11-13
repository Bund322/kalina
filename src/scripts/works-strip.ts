// Лента работ учеников на /education: стрелки листают на одну плитку и гаснут у краёв.
// На телефоне стрелки скрыты – там лента листается пальцем.
document.querySelectorAll<HTMLElement>('[data-works]').forEach((strip) => {
  const buttons = [...(strip.parentElement?.querySelectorAll<HTMLButtonElement>('.works-btn') ?? [])];

  const step = () => {
    const item = strip.querySelector('li');
    const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
    return item ? item.getBoundingClientRect().width + gap : strip.clientWidth;
  };

  const update = () => {
    const max = strip.scrollWidth - strip.clientWidth - 1;
    buttons.forEach((b) => (b.disabled = b.dataset.dir === '-1' ? strip.scrollLeft <= 0 : strip.scrollLeft >= max));
  };

  // Цель считаем от ближайшей плитки, а не от текущей позиции: быстрые нажатия во время плавной прокрутки
  // иначе складываются со снапом и лента дёргается.
  let target = 0;
  buttons.forEach((b) => b.addEventListener('click', () => {
    const s = step();
    const from = Math.abs(target - strip.scrollLeft) < s ? target : strip.scrollLeft;
    // Вперёд – к следующей плитке после текущей, назад – к предыдущей (лента может стоять между плитками у конца).
    const i = b.dataset.dir === '1' ? Math.floor(from / s + 0.01) + 1 : Math.ceil(from / s - 0.01) - 1;
    target = Math.max(0, Math.min(strip.scrollWidth - strip.clientWidth, i * s));
    strip.scrollTo({ left: target });
  }));
  strip.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(strip);
  update();
});
