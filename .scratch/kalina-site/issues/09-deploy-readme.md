# 09 — Автодеплой и README

Status: ready-for-human
Blocked by: 01

## Что сделать

- GitHub Actions: на push в `main` — `npm ci`, `npm run build`, заливка `dist/` по FTP/SFTP
  (Timeweb/SprintHost). Workflow выключен (`workflow_dispatch` или закомментированный триггер),
  пока хостинг не выбран.
- README: список секретов (хост, логин, пароль/ключ, путь), как включить workflow; запасной ручной деплой
  (`npm run build` → залить `dist/`); как добавить/удалить мастера, заменить фото (имена файлов),
  поправить тексты проколов, зон и прайс.

## Готово, когда

- README позволяет человеку без Claude обновить контент и задеплоить сайт.
- Для запуска осталось завести секреты и включить триггер — это сделает заказчик (ready-for-human после выбора хостинга).

## Comments

- Сделано: workflow FTP-деплоя (ручной запуск), README, плюс временное превью на GitHub Pages
  (`pages.yml`, push в `dev_seits` → https://bund322.github.io/kalina/). Осталось заказчику: включить Pages
  (Settings → Pages → Source: GitHub Actions); после выбора хостинга — завести FTP-секреты и включить триггер.
