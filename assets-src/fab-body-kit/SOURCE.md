# Исходная 3D-модель

`female-base-mesh-base_female.glb` — female base mesh с Fab, лицензия **CC0** (подтверждено заказчиком 2026-11-01).

Из неё `npm run models` (`tools/build-models.mjs`) собирает модели для сайта в `public/models/`:
скелет и UV убираются, геометрия обрезается и сжимается meshopt. Сам исходник на сайт не попадает.

Координаты точек в `src/data/piercings.json` сняты с `public/models/head.glb`. Если поменять исходник
или срез (`HEAD_CUT_Y`), точки нужно проверить заново.
