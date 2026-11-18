import type { APIRoute } from 'astro';

// robots.txt: превью на GitHub Pages (base /kalina) закрыто целиком, основной сайт открыт.
// Ссылка на карту сайта появляется, когда задан адрес сайта (SITE_URL в astro.config.mjs).
export const GET: APIRoute = ({ site }) => {
  const preview = import.meta.env.BASE_URL !== '/';
  const lines = ['User-agent: *', preview ? 'Disallow: /' : 'Allow: /'];
  if (site && !preview) lines.push('', `Sitemap: ${new URL('sitemap-index.xml', site).href}`);
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
