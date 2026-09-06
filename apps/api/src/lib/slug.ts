import slugify from 'slugify';
import { prisma } from './prisma.js';

/**
 * Slug puro (sem checar colisão): minúsculo, sem acentos, só [a-z0-9-],
 * cortado em `max` chars sem deixar hífen no final. Vazio vira `fallback`.
 */
export function slugBase(input: string, max = 140, fallback = 'item'): string {
  return (
    slugify(input, { lower: true, strict: true, locale: 'pt' })
      .slice(0, max)
      .replace(/-+$/, '') || fallback
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

/**
 * Chave única de MemberTag a partir do rótulo (max 60 chars, formato de
 * memberTagKeySchema). Só é gerada na criação — a chave nunca muda depois.
 */
export async function uniqueMemberTagKey(label: string): Promise<string> {
  return uniqueSlug('memberTag', label);
}

type SlugModel = 'post' | 'encyclopediaEntry' | 'memberTag';

async function findExisting(model: SlugModel, candidate: string) {
  switch (model) {
    case 'post':
      return prisma.post.findUnique({ where: { slug: candidate }, select: { id: true } });
    case 'encyclopediaEntry':
      return prisma.encyclopediaEntry.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
    case 'memberTag':
      return prisma.memberTag.findUnique({ where: { key: candidate }, select: { id: true } });
  }
}

async function uniqueSlug(
  model: SlugModel,
  input: string,
  ignoreId?: string,
): Promise<string> {
  const root = model === 'memberTag' ? slugBase(input, 60, 'tag') : slugBase(input);
  let candidate = root;
  let n = 1;
  while (true) {
    const existing = await findExisting(model, candidate);
    if (!existing || existing.id === ignoreId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}
