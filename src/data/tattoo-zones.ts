import { z } from 'astro/zod';
import raw from './tattoo-zones.json';

// id зон совпадают с ZONES в tools/build-models.mjs: по ним сцена находит участок модели body.glb.
const schema = z.array(
  z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    /** Насколько больно: 1 – почти не больно, 5 – очень больно. */
    pain: z.number().int().min(1).max(5),
    why: z.string().min(1),
    tip: z.string().min(1),
  }),
);

const parsed = schema.safeParse(raw);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${(raw as { id?: string }[])[Number(i.path[0])]?.id ?? i.path[0]} → ${i.path.slice(1).join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`tattoo-zones.json заполнен с ошибками:\n${issues}`);
}

export type TattooZone = z.infer<typeof schema>[number];
export const tattooZones: TattooZone[] = parsed.data;

export const painLabel = ['', 'Почти не больно', 'Терпимо', 'Ощутимо', 'Больно', 'Очень больно'];
