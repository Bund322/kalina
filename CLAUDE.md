# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Одностраничный сайт-визитка тату- и пирсинг-студии «Калина». Весь проект — один файл
`Калина Tattoo Studio.html`: разметка, CSS и JS внутри, без сборки, зависимостей, тестов и линтера.
Каталог не является git-репозиторием.

Просмотр — открыть файл в браузере (например, через `preview_start` с `file://`-URL или
`Start-Process "Калина Tattoo Studio.html"`). Внешняя зависимость одна — шрифты Google Fonts
(Oranienbaum — заголовки, Cormorant Garamond — текст, Golos Text — UI-подписи).

Файл экспортирован из Claude Artifact: отсюда служебный `<style>` в `<head>` с `safe-area`-отступами,
`<title>` и `<meta name="claude:viewport-fit-sides">` внутри `<body>`. Эти куски не трогать без причины.

## Устройство страницы

- **Палитра** — CSS-переменные в `:root` (`--sand`, `--brick`, `--olive`, `--ink` и оттенки). Тема одна,
  светлая; тёмной темы нет намеренно. Новые цвета — через переменные, не литералами.
- **Логотип-ягода** — SVG `<symbol id="berry">`, переиспользуется через `<use href="#berry">`
  (шапка, hero, блок записи). В прелоадере тот же рисунок продублирован отдельными `<g>`, чтобы
  анимировать листья и ягоду по отдельности — при правке формы менять оба места.
- **Контент, генерируемый в JS** (IIFE в конце файла), а не в HTML:
  - слова бегущей строки — массив `words`;
  - галерея — массив `items` (`[ключ арта, категория tattoo|piercing, подпись, тег]`) и функции-рисовалки
    в `arts`, которые строят SVG-заглушки из примитивов `leaf`/`circ`/`ring`;
  - портреты мастеров — `mArt`, подставляются в `<svg data-art="m1..m3">`.
  Фильтр галереи работает по атрибуту `data-c` плитки и `data-f` кнопок-чипов.
- **Анимации**: появление блоков — класс `.rv` + `IntersectionObserver` (добавляет `.in`);
  кастомный курсор и параллакс ягод в hero включаются только при `hover:hover` и без
  `prefers-reduced-motion`. Блок `@media(prefers-reduced-motion:reduce)` глушит всю анимацию —
  новые анимации должны в него укладываться.
- Задержка анимации букв заголовка (`1.5s`) согласована с уходом прелоадера (`preOut … 1.4s`).

## Заглушки, которые ждут реальных данных

Плитки галереи и портреты мастеров (SVG-иллюстрации), имена и специализации мастеров, цены,
адрес, телефон, ссылки Telegram/WhatsApp (сейчас `href="#book"`). Рядом с ними стоят пояснения
`<p class="note">…</p>` — после замены на реальные данные их нужно удалить.

## Agent skills

### Issue tracker

Задачи ведутся локально, markdown-файлами в `.scratch/<фича>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Стандартные пять меток (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: один `CONTEXT.md` и `docs/adr/` в корне. See `docs/agents/domain.md`.
