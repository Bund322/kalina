// Иконки сайта из public/favicon.svg: favicon.ico (16/32/48 – его берут Яндекс и старые браузеры),
// apple-touch-icon.png (180 px на песочном фоне – для iPhone) и ягода для картинки превью ссылок
// (assets-src/og/berry.png, её подхватывает tools/make-og.py). Запуск: npm run icons.
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg');
const SAND = '#C4B5A0';

const png = (size) => sharp(svg, { density: 300 }).resize(size, size).png().toBuffer();

// ICO с PNG внутри: заголовок 6 байт, по 16 байт на картинку, дальше сами PNG.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(images[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += images[i].length;
});
writeFileSync('public/favicon.ico', Buffer.concat([header, ...images]));

// iPhone скругляет углы сам и не любит прозрачность – кладём ягоду на песочный фон с полями.
await sharp({ create: { width: 180, height: 180, channels: 4, background: SAND } })
  .composite([{ input: await png(140), top: 20, left: 20 }])
  .png()
  .toFile('public/apple-touch-icon.png');

mkdirSync('assets-src/og', { recursive: true });
writeFileSync('assets-src/og/berry.png', await png(420));
console.log('Готово: public/favicon.ico, public/apple-touch-icon.png, assets-src/og/berry.png');
