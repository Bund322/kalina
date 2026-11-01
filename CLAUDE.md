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
- `npm run placeholders` — создать фото-заглушки для всех файлов из `masters.json` и `piercings.json`, которых ещё нет
  (`tools/make-placeholders.mjs`, через sharp; существующие файлы не трогает).
- `npm run models` — пересобрать 3D-модели `public/models/*.glb` из исходника в `assets-src/`
  (`tools/build-models.mjs`, gltf-transform + meshopt). Запускать после правки исходника или среза.
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
  заменяется якорем `/#book`.
- **3D**: `src/scripts/three/stage.ts` — общая сцена (прозрачный рендерер, свет, OrbitControls без зума
  колесом и без взгляда снизу, перелёты камеры `flyTo`, загрузка meshopt-glb, растворение среза шеи в шейдере).
  Модель — CC0 female base mesh (`assets-src/fab-body-kit/`, см. `SOURCE.md`); на сайт идёт обрезанный
  и сжатый `public/models/head.glb` (голова) и `body.glb` (всё тело).
- **/piercing**: `src/data/piercings.json` — проколы с группой (`ear|nose|face|body`) и точками `{p, n}`
  в координатах `head.glb` (точки сняты рейкастом по модели; при смене модели или среза их надо переснять).
  Две точки — индастриал (`bar: true`, рисуется штанга) и симметрия губ; общий `spot` — один маркер на
  несколько проколов (язык/смайл «внутри рта», руук/ложный руук). У каждого прокола — описание, цена,
  заживление и 1–3 фото из `src/content/piercings/` (в JSON — имя файла). Валидация — `src/data/piercings.ts`.
  `components/PiercingHead.astro` отдаёт данные в `<script type="application/json">`, сцену поднимает
  `src/scripts/piercing-head.ts`: маркеры — спрайты постоянного экранного размера, попадание считается
  в пикселях с проверкой перекрытия головой; точки уха показываются только вблизи, издали — маркер «Ухо».
  Выбор прокола — всплывающее событие `piercing:select` (`detail.ids`, пустой массив — снять выбор);
  его шлют маркеры, список, карточки «Проколы на теле» (`components/BodyPiercings.astro`) и попап,
  а слушают на `document`. Попап (`components/PiercingPopup.astro`)
  рендерит карточки всех проколов при сборке и показывает нужную; для общей точки — вкладки.
  На компьютере это карточка справа, на экранах ≤900px — панель снизу с затемнением. Без WebGL остаётся список.
- **Попап** общий для обеих 3D-страниц: `src/scripts/popup.ts` поднимает каждый `[data-popup]`; событие —
  в `data-event`, `data-ignore` — элементы, клик по которым не закрывает попап (модель, список).
- **/tattoo**: `tools/build-models.mjs` размечает зоны тела по костям скелета (кость с наибольшим весом;
  суставы — где вес делится между двумя костями; перед/спина и бока — по нормали) и пишет номер зоны
  в атрибут `_ZONE`, а порядок зон (`ZONES`) — в extras сцены (`gltf.scene.userData.zones`).
  Боль 1–5 и тексты — `src/data/tattoo-zones.json` (id совпадают с `ZONES`). `src/scripts/tattoo-body.ts`
  красит зону в шейдере (`flat` номер зоны → `uColors[]`), выбор — событие `tattoo:select`; при выборе
  из списка камера перелетает к зоне. В dev-режиме разметку можно раскрасить через `window.__tattoo`.
- **Мастера**: `src/data/masters.json` + фото в `src/content/masters/<slug>/` (в JSON — только имя файла).
  `src/data/masters.ts` валидирует JSON схемой zod и подставляет фото через `import.meta.glob`;
  ошибка в JSON или отсутствующий файл роняют сборку с понятным сообщением. Не больше 9 работ на мастера.
  Из этих данных строятся `/masters/[slug]` (`getStaticPaths`), секция «Мастера» и галерея «Работы»
  на главной. Галерея (`gallery()`) чередует мастеров: сначала первые работы (обложки), потом вторые и т. д.;
  плитка ведёт на страницу мастера, фильтр (`src/scripts/home.ts`) смотрит на `data-c` — список
  категорий через пробел (мастер `both` попадает и в тату, и в пирсинг).
  Фото выводятся через `<Image>` из `astro:assets` — при сборке сжимаются в WebP.
- Навигация (`components/Header.astro`) ведёт на якоря главной (`/#works` и т. п.) и на страницы
  `/piercing`, `/tattoo`; активный пункт помечается `aria-current`. На экранах ≤560px шесть пунктов в одну
  строку, при нехватке места лента прокручивается вбок.

## Временное

- Мастера в `masters.json` (Алина, Вера, Ника) и их фото — примерные, фото сгенерированы `npm run placeholders`.
- Карта боли (раскраска всей модели по шкале, задача 07) ещё не сделана.
- Тексты, цены и сроки заживления проколов (`piercings.json`) и тексты зон (`tattoo-zones.json`)
  написаны для примера — заказчик их правит.
- Плейсхолдеры контента (адрес, телефон, имена мастеров, цены) и поясняющие `<p class="note">…</p>` —
  убрать после замены на реальные данные.

## Agent skills

### Issue tracker

Задачи ведутся локально, markdown-файлами в `.scratch/<фича>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Стандартные пять меток (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: один `CONTEXT.md` и `docs/adr/` в корне. See `docs/agents/domain.md`.
