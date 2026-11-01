# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Сайт-визитка тату- и пирсинг-студии «Калина» на **Astro** (статическая сборка, `output: 'static'`).
ТЗ и задачи — `.scratch/kalina-site/` (`spec.md`, `issues/NN-*.md`). Исходный одностраничный макет,
эталон стиля, — `docs/mockup/Калина Tattoo Studio.html`.

## Команды

- `npm run dev` — dev-сервер на http://localhost:4321 (в приложении — `preview_start` с именем `astro-dev`
  из `.claude/launch.json`).
- `npm run build` — сборка в `dist/`; на хостинг (обычный виртуальный, Timeweb/SprintHost) уходит только `dist/`.
- `npm run placeholders` — создать фото-заглушки для всех файлов из `masters.json`, которых ещё нет
  (`tools/make-placeholders.mjs`, через sharp; существующие файлы не трогает).
- `npm run check` — проверка типов (`astro check`; при первом запуске попросит поставить `@astrojs/check`).

Тестов и линтера нет.

## Устройство

- `src/layouts/Base.astro` — общий каркас: `<head>`, шрифты Google Fonts, SVG-символ ягоды, шапка,
  подвал, курсор, скрипт `src/scripts/ui.ts` (reveal-анимации `.rv` и курсор). Прелоадер включается
  пропом `preloader` — только на главной: анимация букв заголовка hero (`1.5s`) ждёт его ухода (`preOut … 1.4s`).
- `src/styles/global.css` — все стили, перенесены из макета. Палитра — CSS-переменные в `:root`
  (`--sand`, `--brick`, `--olive`, `--ink` и оттенки); тема одна, светлая. Новые цвета — через переменные.
  Блок `@media(prefers-reduced-motion:reduce)` глушит анимации — новые анимации должны в него укладываться.
- Логотип-ягода — `components/BerrySymbol.astro` (`<use href="#berry">`); в `components/Preloader.astro`
  та же фигура продублирована отдельными `<g>` для анимации — при правке формы менять оба места
  (и `public/favicon.svg`).
- **Контент — в JSON**, не в разметке: `src/data/studio.json` (прайс с категориями `tattoo|piercing|common`,
  контакты, ссылки мессенджеров). Типизированный доступ — `src/data/studio.ts`; пустая ссылка мессенджера
  заменяется якорем `/#book`. Дальше по ТЗ появятся `piercings.json`, `tattoo-zones.json`.
- **Мастера**: `src/data/masters.json` + фото в `src/content/masters/<slug>/` (в JSON — только имя файла).
  `src/data/masters.ts` валидирует JSON схемой zod и подставляет фото через `import.meta.glob`;
  ошибка в JSON или отсутствующий файл роняют сборку с понятным сообщением. Не больше 9 работ на мастера.
  Из этих данных строятся `/masters/[slug]` (`getStaticPaths`) и секция «Мастера» на главной.
  Фото выводятся через `<Image>` из `astro:assets` — при сборке сжимаются в WebP.
- Навигация (`components/Header.astro`) ведёт на якоря главной (`/#works` и т. п.) и на страницы
  `/piercing`, `/tattoo`; активный пункт помечается `aria-current`. На экранах ≤560px шесть пунктов в одну
  строку, при нехватке места лента прокручивается вбок.

## Временное

- Галерея на главной — SVG-заглушки, которые рисует `src/scripts/home.ts` (`arts`). Их заменят работы
  из `masters.json` (задача 03).
- Мастера в `masters.json` (Алина, Вера, Ника) и их фото — примерные, фото сгенерированы `npm run placeholders`.
- `/piercing` и `/tattoo` — страницы-заглушки до задач 04–07.
- Плейсхолдеры контента (адрес, телефон, имена мастеров, цены) и поясняющие `<p class="note">…</p>` —
  убрать после замены на реальные данные.

## Agent skills

### Issue tracker

Задачи ведутся локально, markdown-файлами в `.scratch/<фича>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Стандартные пять меток (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: один `CONTEXT.md` и `docs/adr/` в корне. See `docs/agents/domain.md`.
