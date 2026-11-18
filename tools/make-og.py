"""Картинка превью ссылок (Open Graph) 1200×630: песочный фон, ягода и надпись шрифтом Kalina Display.

Берёт assets-src/og/berry.png (его делает tools/make-icons.mjs) и assets-src/fonts/KalinaDisplay-Regular.ttf,
пишет public/og.jpg. Запуск: npm run icons (нужен Pillow, локально – в .venv-font/).
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
SAND, BRICK, OLIVE = (196, 181, 160), (127, 55, 44), (83, 81, 42)
FONT = 'assets-src/fonts/KalinaDisplay-Regular.ttf'

img = Image.new('RGB', (W, H), SAND)
berry = Image.open('assets-src/og/berry.png').convert('RGBA')
img.paste(berry, (90, (H - berry.height) // 2), berry)

d = ImageDraw.Draw(img)
title = ImageFont.truetype(FONT, 168)
sub = ImageFont.truetype(FONT, 44)
x = 560
d.text((x, 190), 'Калина', font=title, fill=BRICK)
d.text((x + 6, 400), 'Тату и пирсинг', font=sub, fill=OLIVE)
d.text((x + 6, 456), 'Петербург', font=sub, fill=OLIVE)
img.save('public/og.jpg', quality=90)
print('Готово: public/og.jpg')
