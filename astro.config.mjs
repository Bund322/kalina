import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// На GitHub Pages сайт открывается по адресу https://bund322.github.io/kalina/ — сборка для него
// запускается с SITE_BASE=/kalina. На своём хостинге сайт в корне домена, переменная не нужна.
// SITE_URL – адрес сайта на домене (https://…, без слеша в конце). Пока домена нет, переменная пустая:
// тогда нет канонических ссылок и карты сайта. Когда домен появится – задать её при сборке для хостинга.
const site = process.env.SITE_URL || undefined;

export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  base: process.env.SITE_BASE || '/',
  site,
  integrations: site ? [sitemap()] : [],
});
