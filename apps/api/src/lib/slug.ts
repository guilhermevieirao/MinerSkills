import slugify from 'slugify';
import { prisma } from './prisma.js';

function base(input: string): string {
  return (
    slugify(input, { lower: true, strict: true, locale: 'pt' }).slice(0, 140) || 'item'
  );
}

/** Gera um slug único para Post, checando colisões (ignora o próprio id em updates). */
export async function uniquePostSlug(title: string, ignoreId?: string): Promise<string> {
  return uniqueSlug('post', title, ignoreId);
}

export async function uniqueEncyclopediaSlug(
  name: string,
  ignoreId?: string,
): Promise<string> {
  return uniqueSlug('encyclopediaEntry', name, ignoreId);
}

type SlugModel = 'post' | 'encyclopediaEntry';

async function uniqueSlug(
  model: SlugModel,
  input: string,
  ignoreId?: string,
): Promise<string> {
  const root = base(input);
  let candidate = root;
  let n = 1;
  while (true) {
    const existing =
      model === 'post'
        ? await prisma.post.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await prisma.encyclopediaEntry.findUnique({
            where: { slug: candidate },
            select: { id: true },
          });
    if (!existing || existing.id === ignoreId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}
