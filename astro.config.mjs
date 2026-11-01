import { defineConfig } from 'astro/config';

// На GitHub Pages сайт открывается по адресу https://bund322.github.io/kalina/ — сборка для него
// запускается с SITE_BASE=/kalina. На своём хостинге сайт в корне домена, переменная не нужна.
export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  base: process.env.SITE_BASE || '/',
});
