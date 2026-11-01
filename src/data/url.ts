/**
 * Путь внутри сайта с учётом base: на GitHub Pages сайт живёт в /kalina/, на хостинге — в корне.
 * Работает и в .astro-разметке, и в клиентских скриптах. Пример: url('/piercing'), url('/#book').
 */
export const url = (path: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + path;
