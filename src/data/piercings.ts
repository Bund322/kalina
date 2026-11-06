import type { ImageMetadata } from 'astro';
import { z } from 'astro/zod';
import raw from './piercings.json';

// Координаты точек – в системе координат public/models/head.glb (метры модели, ось Y вверх, лицо смотрит в +Z).
// p – точка на коже, n – нормаль наружу: по ней маркер чуть приподнимается над поверхностью.
const vec3 = z.tuple([z.number(), z.number(), z.number()]);

const schema = z.array(
  z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    group: z.enum(['ear', 'nose', 'face', 'body']),
    /** Одна точка или две (индастриал, симметрия губ). У проколов на теле точек нет. */
    points: z.array(z.object({ p: vec3, n: vec3 })).max(2).optional(),
    /** Индастриал: две точки соединяются штангой. */
    bar: z.boolean().optional(),
    /** Проколы с одинаковым spot делят один маркер (язык и смайл – «внутри рта»). */
    spot: z.string().optional(),
    description: z.string().min(1),
    /** Строкой, как на сайте: «от 3 500 ₽». */
    price: z.string().min(1),
    healing: z.string().min(1),
    /** Имена файлов в src/content/piercings/. */
    photos: z.array(z.string().min(1)).min(1).max(3, 'не больше 3 фото на прокол'),
  }),
);

type RawPiercing = z.infer<typeof schema>[number];
export type PiercingGroup = RawPiercing['group'];
export type Piercing = Omit<RawPiercing, 'photos'> & { photos: ImageMetadata[] };

const files = import.meta.glob<{ default: ImageMetadata }>('/src/content/piercings/*.{jpg,jpeg,png,webp,avif}', { eager: true });

function photo(id: string, file: string): ImageMetadata {
  const found = files[`/src/content/piercings/${file}`];
  if (!found) throw new Error(`piercings.json: у прокола «${id}» нет файла src/content/piercings/${file}. Проверьте имя файла.`);
  return found.default;
}

const parsed = schema.safeParse(raw);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${(raw as { id?: string }[])[Number(i.path[0])]?.id ?? i.path[0]} → ${i.path.slice(1).join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`piercings.json заполнен с ошибками:\n${issues}`);
}

export const piercings: Piercing[] = parsed.data.map((p) => ({ ...p, photos: p.photos.map((f) => photo(p.id, f)) }));

export const groupLabel: Record<PiercingGroup, string> = {
  ear: 'Ухо',
  nose: 'Нос',
  face: 'Лицо',
  body: 'На теле',
};
