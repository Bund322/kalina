"""Собирает заголовочный шрифт Kalina Display из Akathistos Caps (assets-src/fonts/).

Церковные формы букв М, Я, Э, Ё, Ъ, У заменяются привычными, добавляются цифры и символы
? % + № & × ₽. Новые знаки собираются из деталей самого шрифта (стволы с плитами-засечками,
тонкие диагонали, дуги З, О, Е, нога Л, перекладина Т), поэтому сохраняют его стиль.

Запуск: npm run font (нужен Python с fonttools, brotli и skia-pathops — см. README).
Выход: src/assets/fonts/kalina-display.woff2 (сайт) и assets-src/fonts/KalinaDisplay-Regular.ttf (установка).
"""
import sys
from pathlib import Path

import pathops
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.recordingPen import RecordingPen, replayRecording
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import ttProgram

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src/fonts/akathistos-caps.ttf'
OUT = ROOT / 'src/assets/fonts/kalina-display.woff2'  # для сайта
OUT_TTF = ROOT / 'assets-src/fonts/KalinaDisplay-Regular.ttf'  # для установки в систему и макетов
FAMILY = 'Kalina Display'

CAP = 663  # высота прописных
STEM = 100  # толщина ствола
THIN = 27  # толщина тонких линий
SB = 30  # боковой отступ

font = TTFont(SRC)
cmap = font.getBestCmap()
glyphs = font.getGlyphSet()
U = pathops.PathOp.UNION
I = pathops.PathOp.INTERSECTION
D = pathops.PathOp.DIFFERENCE


# --- работа с контурами ----------------------------------------------------------------------

def of(ch):
    """Контур буквы исходного шрифта."""
    p = pathops.Path()
    glyphs[cmap[ord(ch)]].draw(p.getPen(glyphSet=glyphs))
    return p


def poly(*pts):
    p = pathops.Path()
    p.moveTo(*pts[0])
    for pt in pts[1:]:
        p.lineTo(*pt)
    p.close()
    return p


def rect(x0, y0, x1, y1):
    return poly((x0, y0), (x1, y0), (x1, y1), (x0, y1))


def tf(p, a=1, b=0, c=0, d=1, dx=0, dy=0):
    """Аффинное преобразование: x' = a·x + c·y + dx, y' = b·x + d·y + dy."""
    out = pathops.Path()
    p.draw(TransformPen(out.getPen(), (a, b, c, d, dx, dy)))
    return pathops.simplify(out, fix_winding=True)


def move(p, dx=0, dy=0):
    return tf(p, dx=dx, dy=dy)


def mirror(p):
    """Зеркало по горизонтали с сохранением положения (по рамке контура)."""
    x0, _, x1, _ = p.bounds
    return tf(p, a=-1, dx=x0 + x1)


def scale(p, sx, sy=None, ox=0, oy=0):
    sy = sx if sy is None else sy
    return tf(p, a=sx, d=sy, dx=ox - ox * sx, dy=oy - oy * sy)


def rotate180(p):
    x0, y0, x1, y1 = p.bounds
    return tf(p, a=-1, d=-1, dx=x0 + x1, dy=y0 + y1)


def union(*ps):
    out = ps[0]
    for p in ps[1:]:
        out = pathops.op(out, p, U)
    return out


def cut(p, x0, y0, x1, y1):
    return pathops.op(p, rect(x0, y0, x1, y1), I)


def minus(p, q):
    return pathops.op(p, q, D)


def fit(p, x0=None, y0=None, x1=None, y1=None):
    """Переносит и масштабирует контур в заданную рамку (незаданные стороны — как есть)."""
    bx0, by0, bx1, by1 = p.bounds
    nx0 = bx0 if x0 is None else x0
    ny0 = by0 if y0 is None else y0
    nx1 = (nx0 + bx1 - bx0) if x1 is None else x1
    ny1 = (ny0 + by1 - by0) if y1 is None else y1
    sx, sy = (nx1 - nx0) / (bx1 - bx0), (ny1 - ny0) / (by1 - by0)
    return tf(p, a=sx, d=sy, dx=nx0 - bx0 * sx, dy=ny0 - by0 * sy)


def stroke(x0, y0, x1, y1, w=THIN):
    """Наклонная линия постоянной горизонтальной толщины w (как диагональ И)."""
    return poly((x0 - w / 2, y0), (x0 + w / 2, y0), (x1 + w / 2, y1), (x1 - w / 2, y1))


# --- детали исходного шрифта -----------------------------------------------------------------

I_ = of('И')
SERIF_B = cut(I_, 0, -5, 260, 18)  # нижняя плита-засечка ствола x 30…230
SERIF_T = cut(I_, 0, 645, 260, 700)  # верхняя


def stem(x, y0=0, y1=CAP, top=True, bottom=True):
    """Ствол x…x+STEM с засечками (засечки — из И, по 50 в каждую сторону)."""
    parts = [rect(x, y0, x + STEM, y1)]
    if bottom:
        parts.append(move(SERIF_B, x - 80, y0))
    if top:
        parts.append(move(SERIF_T, x - 80, y1 - CAP))
    return union(*parts)


O_ = of('О')  # x 40…447, y −11…674
Z_ = of('З')  # x 40…584
E_ = of('Е')  # Є-образная Е, x 40…456
Z_TOP = cut(Z_, 0, 420, 700, 700)  # верхняя дуга З без язычка
Z_LOW = cut(Z_, 0, -20, 700, 300)  # нижняя чаша З
# Левая нога Л: от правого ствола вниз-влево (без засечек правого ствола).
L_LEG = minus(cut(of('Л'), 0, -20, 292, 700), union(rect(225, -20, 300, 25), rect(225, 630, 300, 700)))
# Перекладина Т без ствола: у ствола она тонкая (верхние ~18 единиц), разрыв закрываем.
T_BAR = union(minus(cut(of('Т'), 0, 520, 700, 700), rect(255, 0, 365, 700)), rect(250, 645, 370, CAP))


def bar_left():
    return cut(T_BAR, 0, 0, 255, 700)


def bar_right():
    return cut(T_BAR, 365, 0, 700, 700)


# --- новые знаки -------------------------------------------------------------------------------

def make_M():
    # Два ствола и «галочка» из тонких диагоналей, сходящихся на трети высоты.
    left, right = 80, 440
    apex = (left + STEM + right) / 2
    v = union(
        stroke(left + STEM - THIN / 2, CAP - 30, apex, 200),
        stroke(apex, 200, right + THIN / 2, CAP - 30),
    )
    return union(stem(left), stem(right), v), right + STEM + 50 + SB


def make_YA():
    # Зеркальная Р и нога Л под чашей.
    r = mirror(of('Р'))
    x0, _, x1, _ = r.bounds
    leg = fit(L_LEG, x0=x0 - 70, y0=0, x1=x0 + 200, y1=380)
    shape = union(r, leg)
    return shape, None


def make_U():
    # Верх — исходная У (клин слева, тонкий штрих с флажком справа) без нижнего кружка «оу»;
    # тонкий штрих продолжается хвостом с наплывом к левому низу, как нога Л.
    top = cut(of('У'), 0, 198, 700, 700)
    a, _, b, _ = cut(top, 200, 205, 320, 209).bounds
    tail = pathops.Path()
    tail.moveTo(a, 215)
    tail.lineTo(b, 215)
    tail.cubicTo(b + 5, 110, 220, 40, 200, 0)
    tail.lineTo(40, 0)
    tail.cubicTo(110, 30, a - 5, 90, a, 215)
    tail.close()
    return union(top, tail), None


def make_E_rev():
    return mirror(E_), None


def make_YO():
    # Две точки шрифта над Е.
    p = glyph_path('period')
    px0, py0, px1, py1 = p.bounds
    size = px1 - px0
    x0, _, x1, _ = E_.bounds
    cx = (x0 + x1) / 2
    dots = union(fit(p, x0=cx - size - 40, y0=700), fit(p, x0=cx + 40, y0=700))
    return union(E_, dots), None


def make_HARD():
    # Ь, сдвинутая вправо, с флажком — левой половиной перекладины Т.
    soft = of('Ь')
    flag = bar_left()
    fx0, _, fx1, _ = flag.bounds
    shift = fx1 - 80 - 2
    return union(move(soft, shift), flag), None


def counter(p):
    """Внутренность (просвет) замкнутой фигуры вроде О: самый маленький из контуров."""
    rec = RecordingPen()
    p.draw(rec)
    contours, cur = [], []
    for op, args in rec.value:
        cur.append((op, args))
        if op in ('closePath', 'endPath'):
            contours.append(cur)
            cur = []
    def area(c):
        bp = BoundsPen(None)
        replayRecording(c, bp)
        x0, y0, x1, y1 = bp.bounds
        return (x1 - x0) * (y1 - y0)
    out = pathops.Path()
    replayRecording(min(contours, key=area), out.getPen())
    return pathops.simplify(out, fix_winding=True)


def make_digits():
    d = {}
    # 0 — узкая О.
    d['zero'] = fit(O_, x1=40 + (447 - 40) * 0.88)
    # 1 — ствол с нижней засечкой и наклонным флажком.
    one = union(stem(140, top=False), poly((140, CAP), (240, CAP), (240, CAP - 60), (40, CAP - 230), (40, CAP - 190)))
    d['one'] = one
    # 2 — верх З, нога Л к основанию и нижняя плита.
    # Нога продолжает срез дуги той же ширины и уходит к основанию плавной кривой.
    top = fit(Z_TOP, x0=50, x1=470)
    a, _, b, _ = cut(top, 0, 470, 700, 474).bounds
    leg = pathops.Path()
    leg.moveTo(a, 480)
    leg.lineTo(b, 480)
    leg.cubicTo(b - 5, 330, 200, 200, 170, 50)
    leg.lineTo(55, 50)
    leg.cubicTo(70, 220, a - 15, 330, a, 480)
    leg.close()
    base = union(rect(50, 0, 470, 55), rect(420, 0, 470, 140))
    d['two'] = union(top, leg, base)
    # 3 — З.
    d['three'] = fit(Z_, x1=40 + (584 - 40) * 0.82)
    # 4 — правый ствол, тонкая диагональ и перекладина.
    four = union(
        stem(300, y1=CAP, top=False),
        stroke(300 + THIN / 2, CAP - 10, 60, 220),
        rect(40, 180, 470, 230),
        rect(300, CAP - 20, 400, CAP),
    )
    d['four'] = four
    # 5 — флажок, короткий ствол и низ З.
    # Ствол опускается до верха чаши, плечо чаши продолжаем к стволу перемычкой.
    bowl = fit(Z_LOW, x0=60, y0=-11, x1=480, y1=380)
    top = bowl.bounds[3]
    # Перемычка доходит до правого края чаши на самом верху среза, чтобы не было ступеньки.
    bridge = rect(80, top - 45, cut(bowl, 0, top - 3, 700, top).bounds[2], top)
    sy1 = top
    five = union(rect(80, sy1 - 45, 180, CAP), fit(bar_right(), x0=80, y0=CAP - 120, x1=460, y1=CAP), bowl, bridge)
    d['five'] = five
    # 6 — верх Е (дуга с наплывом) и петля из О.
    # 6 — петля из О и поднимающийся над ней левый край О с наплывом наверху.
    # Петля из О и спинка — кривая, выходящая из левого края петли вертикально (без излома)
    # и сужающаяся к наплыву вверху.
    loop = fit(O_, x0=40, y0=-11, x1=440, y1=420)
    spine = pathops.Path()
    spine.moveTo(41, 230)
    spine.cubicTo(41, 470, 130, 640, 300, CAP)
    spine.lineTo(318, 638)
    spine.cubicTo(200, 600, 150, 470, 150, 260)
    spine.lineTo(150, 230)
    spine.close()
    d['six'] = minus(union(loop, spine), counter(loop))
    # 9 — перевёрнутая 6.
    d['nine'] = rotate180(d['six'])
    # 8 — две петли О.
    d['eight'] = union(fit(O_, x0=70, y0=340, x1=410, y1=CAP + 11), fit(O_, x0=40, y0=-11, x1=440, y1=380))
    # 7 — перекладина Т и нога Л.
    # Нога растёт из-под правого конца перекладины и плавно уходит вниз, внизу — засечка.
    bar = fit(T_BAR, x0=40, y0=CAP - 120, x1=470, y1=CAP)
    leg = pathops.Path()
    leg.moveTo(370, CAP - 30)
    leg.lineTo(470, CAP - 5)
    leg.cubicTo(450, 440, 240, 260, 220, 20)
    leg.lineTo(120, 20)
    leg.cubicTo(140, 280, 320, 440, 370, CAP - 30)
    leg.close()
    d['seven'] = union(bar, leg, rect(120, 0, 220, 30), move(SERIF_B, 120 - 80))
    return d


def glyph_path(name):
    p = pathops.Path()
    glyphs[name].draw(p.getPen(glyphSet=glyphs))
    return p


def make_symbols():
    s = {}
    period = glyph_path('period')
    px0, _, px1, _ = period.bounds
    # ? — верх З, короткий ствол, точка.
    hook = fit(Z_TOP, x0=40, y0=330, x1=430, y1=CAP + 6)
    s['question'] = union(hook, rect(190, 170, 260, 360), fit(period, x0=180, y0=0))
    # % — две маленькие О и косая черта.
    small = fit(O_, x0=0, y0=0, x1=190, y1=270)
    s['percent'] = union(move(small, 40, CAP - 270), move(small, 360, 0), stroke(90, 0, 500, CAP, 40))
    # ₽ — Р с перекладиной по стволу ниже чаши.
    s['ruble'] = union(of('Р'), rect(30, 150, 330, 200))
    # + — крест из полутолстых линий.
    s['plus'] = union(rect(225, 100, 285, 520), rect(50, 280, 460, 340))
    # × — две тонкие диагонали.
    s['multiply'] = union(stroke(80, 130, 380, 490, 40), stroke(380, 130, 80, 490, 40))
    # № — зеркальная И и маленькая о с чертой.
    n = mirror(I_)
    nx1 = n.bounds[2]
    s['numero'] = union(n, fit(O_, x0=nx1 + 30, y0=300, x1=nx1 + 190, y1=CAP), rect(nx1 + 30, 200, nx1 + 190, 250))
    # & — две петли О и диагональ-хвост к правому низу.
    s['ampersand'] = union(
        fit(O_, x0=110, y0=380, x1=320, y1=CAP + 11),
        fit(O_, x0=40, y0=-11, x1=380, y1=400),
        stroke(170, 420, 470, 0, 55),
    )
    return s


# --- запись в шрифт ------------------------------------------------------------------------------

glyf = font['glyf']
hmtx = font['hmtx']
order = font.getGlyphOrder()


def clean(path, min_size=12):
    """Убирает крошки — обрезки соседних деталей меньше min_size единиц."""
    rec = RecordingPen()
    path.draw(rec)
    out, contour = pathops.Path(), []
    for op, args in rec.value:
        contour.append((op, args))
        if op in ('closePath', 'endPath'):
            bp = BoundsPen(None)
            replayRecording(contour, bp)
            x0, y0, x1, y1 = bp.bounds
            if x1 - x0 >= min_size and y1 - y0 >= min_size:
                replayRecording(contour, out.getPen())
            contour = []
    return out


def put(name, path, advance=None):
    """Записывает контур в glyf под именем name; ширина — по рамке + отступы."""
    path = clean(path)
    x0, _, x1, _ = path.bounds
    if x0 != SB:
        path = move(path, SB - x0)
        x0, _, x1, _ = path.bounds
    pen = TTGlyphPen(None)
    path.draw(Cu2QuPen(pen, max_err=1, reverse_direction=False))
    g = pen.glyph()
    if name not in glyf.glyphs:
        order.append(name)
    glyf[name] = g
    g.recalcBounds(glyf)
    hmtx[name] = (advance or round(x1 + SB), g.xMin)


def map_to(chars, name):
    for t in font['cmap'].tables:
        if t.isUnicode():
            for ch in chars:
                t.cmap[ord(ch)] = name


def build():
    new = {
        'kd.M': (make_M, 'Мм'),
        'kd.YA': (make_YA, 'Яя'),
        'kd.E': (make_E_rev, 'Ээ'),
        'kd.U': (make_U, 'Уу'),
        'kd.YO': (make_YO, 'Ёё'),
        'kd.HARD': (make_HARD, 'Ъъ'),
    }
    for name, (fn, chars) in new.items():
        path, adv = fn()
        put(name, path, adv)
        map_to(chars, name)
    for name, path in make_digits().items():
        put('kd.' + name, path)
    digits = 'zero one two three four five six seven eight nine'.split()
    for i, n in enumerate(digits):
        map_to(str(i), 'kd.' + n)
    for name, path in make_symbols().items():
        put('kd.' + name, path)
    for ch, n in {'?': 'question', '%': 'percent', '+': 'plus', '×': 'multiply', '№': 'numero', '&': 'ampersand', '₽': 'ruble'}.items():
        map_to(ch, 'kd.' + n)
    font.setGlyphOrder(order)

    # Хинтинг исходника рассчитан на старые знаки — убираем его целиком.
    for tag in ('fpgm', 'prep', 'cvt ', 'hdmx', 'LTSH', 'VDMX'):
        if tag in font:
            del font[tag]
    for n in glyf.keys():
        g = glyf[n]
        if hasattr(g, 'program'):
            g.program = ttProgram.Program()
            g.program.fromBytecode(b'')
    font['post'].formatType = 2.0

    name = font['name']
    for rec in list(name.names):
        if rec.nameID in (1, 3, 4, 6, 16, 17):
            name.removeNames(nameID=rec.nameID)
    name.setName(FAMILY, 1, 3, 1, 0x409)
    name.setName('Regular', 2, 3, 1, 0x409)
    name.setName(FAMILY + ' Regular', 3, 3, 1, 0x409)
    name.setName(FAMILY, 4, 3, 1, 0x409)
    name.setName('KalinaDisplay-Regular', 6, 3, 1, 0x409)

    font.save(OUT_TTF)
    font.flavor = 'woff2'
    OUT.parent.mkdir(parents=True, exist_ok=True)
    font.save(OUT)
    for out in (OUT, OUT_TTF):
        print(f'{out.relative_to(ROOT)}: {out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    build()
