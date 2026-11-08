"""Раскадровка шрифта Kalina Display: каждый знак – отдельный PNG без фона.

Кадры одной высоты (от верха ascent до низа descent) и с общей базовой линией, ширина – по ширине
знака (с учётом выносов за неё), поэтому кадры можно ставить рядом и они встанут как в наборе.
Раскладка по папкам: letters (А–Я, Ё), digits, symbols.

В шрифт перешли все коды Akathistos Caps, но на месте многих стоят церковные знаки (титла, лигатуры,
Ѿ, Ѹ: так в «#», «$», «<», «…», «Ђ», «Ѓ»), строчные повторяют прописные, латиница тоже церковная
(на сайте её отдаёт Oranienbaum). Поэтому в раскадровку идут только знаки из списков ниже.

Запуск: npm run glyphs или .venv-font/Scripts/python tools/render-glyphs.py [--size 400] [--color '#2B1E17'] [--out docs/font/glyphs]
Нужен Pillow (есть в .venv-font).
"""
import argparse
import shutil
import unicodedata
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / 'assets-src/fonts/KalinaDisplay-Regular.ttf'

ap = argparse.ArgumentParser()
ap.add_argument('--size', type=int, default=400, help='кегль в пикселях (= 1 em)')
ap.add_argument('--color', default='#2B1E17', help='цвет знаков (по умолчанию --ink сайта)')
ap.add_argument('--pad', type=int, default=24, help='поле вокруг кадра, px')
ap.add_argument('--out', default=str(ROOT / 'docs/font/glyphs'))
args = ap.parse_args()

tt = TTFont(FONT)
cmap = tt.getBestCmap()
upm = tt['head'].unitsPerEm
ascent = round(tt['hhea'].ascent * args.size / upm)
descent = round(-tt['hhea'].descent * args.size / upm)
pil = ImageFont.truetype(str(FONT), args.size)
GROUPS = {
    'letters': 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
    'digits': '0123456789',
    'symbols': '!?%&+×№₽()[]«»‘’‚“”„.,:;·-–—/¶',
}


def filename(code, ch):
    if ch.isalnum():
        label = ch
    else:
        label = unicodedata.name(ch, 'glyph').lower().replace(' ', '-')
    return f'U+{code:04X}_{label}.png'


out = Path(args.out)
if out.exists():
    shutil.rmtree(out)
counts = {}
for g, chars in GROUPS.items():
    for ch in chars:
        code = ord(ch)
        assert code in cmap, f'нет знака {ch!r} в шрифте'
        advance = pil.getlength(ch)
        left, top, right, bottom = pil.getbbox(ch, anchor='ls')
        if right <= left:  # пустой знак
            continue
        x0 = min(0, left)
        x1 = max(advance, right)
        w = round(x1 - x0) + 2 * args.pad
        h = ascent + descent + 2 * args.pad
        img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(img).text((args.pad - x0, args.pad + ascent), ch, font=pil, fill=args.color, anchor='ls')
        (out / g).mkdir(parents=True, exist_ok=True)
        img.save(out / g / filename(code, ch), optimize=True)
        counts[g] = counts.get(g, 0) + 1

for g, n in counts.items():
    print(f'{g}: {n}')
print(f'всего {sum(counts.values())} → {out}')
