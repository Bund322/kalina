import type { ImageMetadata } from 'astro';
import { z } from 'astro/zod';
import raw from './masters.json';

// Фото мастеров лежат в src/content/masters/<slug>/, в masters.json — только имя файла.
const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/masters/*/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

const MAX_WORKS = 9;

const schema = z.array(
  z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/, 'только латинские буквы в нижнем регистре, цифры и дефис'),
    name: z.string().min(1),
    photo: z.string().min(1),
    direction: z.enum(['tattoo', 'piercing', 'both']),
    styles: z.array(z.string()).default([]),
    about: z.array(z.string()).default([]),
    telegram: z.string().optional(),
    instagram: z.string().optional(),
    works: z
      .array(z.object({ photo: z.string().min(1), caption: z.string().optional() }))
      .max(MAX_WORKS, `у мастера может быть не больше ${MAX_WORKS} работ`),
  }),
);

export type Direction = 'tattoo' | 'piercing' | 'both';

export interface Work {
  image: ImageMetadata;
  caption?: string;
}

export interface Master {
  slug: string;
  name: string;
  photo: ImageMetadata;
  direction: Direction;
  styles: string[];
  about: string[];
  telegram?: string;
  instagram?: string;
  works: Work[];
}

export const directionLabel: Record<Direction, string> = {
  tattoo: 'Тату',
  piercing: 'Пирсинг',
  both: 'Тату и пирсинг',
};

function photo(slug: string, file: string): ImageMetadata {
  const found = files[`/src/content/masters/${slug}/${file}`];
  if (!found) {
    throw new Error(
      `masters.json: у мастера «${slug}» нет файла src/content/masters/${slug}/${file}. ` +
        'Проверьте имя файла и папку.',
    );
  }
  return found.default;
}

function load(): Master[] {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    // Путь вида [0, 'works'] превращаем в «мастер alina → works», чтобы было понятно, где ошибка.
    const issues = parsed.error.issues
      .map((i) => {
        const [index, ...rest] = i.path;
        const entry = (raw as { slug?: string }[])[Number(index)];
        const who = entry?.slug ? `мастер «${entry.slug}»` : `мастер №${Number(index) + 1}`;
        return `  • ${who} → ${rest.join('.') || 'запись'}: ${i.message}`;
      })
      .join('\n');
    throw new Error(`masters.json заполнен с ошибками:\n${issues}`);
  }
  const slugs = new Set<string>();
  return parsed.data.map((m) => {
    if (slugs.has(m.slug)) throw new Error(`masters.json: slug «${m.slug}» встречается дважды`);
    slugs.add(m.slug);
    return {
      ...m,
      telegram: m.telegram || undefined,
      instagram: m.instagram || undefined,
      photo: photo(m.slug, m.photo),
      works: m.works.map((w) => ({ image: photo(m.slug, w.photo), caption: w.caption })),
    };
  });
}

export const masters = load();

export interface GalleryItem extends Work {
  master: Master;
}

/**
 * Работы всех мастеров для общей галереи: сначала обложки (первая работа каждого мастера),
 * затем вторые работы и т. д. — так мастера чередуются, а не идут блоками.
 */
export function gallery(): GalleryItem[] {
  const rounds = Math.max(0, ...masters.map((m) => m.works.length));
  const items: GalleryItem[] = [];
  for (let i = 0; i < rounds; i++) {
    for (const master of masters) {
      const work = master.works[i];
      if (work) items.push({ ...work, master });
    }
  }
  return items;
}

/** Категории для фильтра галереи: «both» относится и к тату, и к пирсингу. */
export const directionCategories = (d: Direction) => (d === 'both' ? ['tattoo', 'piercing'] : [d]);
