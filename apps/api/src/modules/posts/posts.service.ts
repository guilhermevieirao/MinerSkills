import { Prisma } from '@prisma/client';
import type { PostInput } from '@minerskills/shared';
import { prisma } from '../../lib/prisma.js';
import { uniquePostSlug } from '../../lib/slug.js';
import { sanitizePostHtml } from '../../lib/sanitize.js';

export const postInclude = {
  cover: true,
  media: { include: { media: true }, orderBy: { order: 'asc' } },
  youtube: { orderBy: { order: 'asc' } },
  links: { orderBy: { order: 'asc' } },
} satisfies Prisma.PostInclude;

export type PostWithRelations = Prisma.PostGetPayload<{ include: typeof postInclude }>;

export async function createPost(input: PostInput): Promise<PostWithRelations> {
  const slug = await uniquePostSlug(input.title);
  const contentHtml = sanitizePostHtml(input.contentHtml);
  return prisma.post.create({
    data: {
      title: input.title,
      slug,
      excerpt: input.excerpt,
      contentHtml,
      published: input.published,
      publishedAt: input.published ? new Date() : null,
      coverId: input.coverId ?? null,
      media: {
        create: input.mediaIds.map((mediaId, order) => ({ mediaId, order })),
      },
      youtube: {
        create: input.youtube.map((y, order) => ({
          youtubeId: y.youtubeId,
          title: y.title ?? null,
          order,
        })),
      },
      links: {
        create: input.links.map((l, order) => ({ label: l.label, url: l.url, order })),
      },
    },
    include: postInclude,
  });
}

export async function updatePost(id: string, input: PostInput): Promise<PostWithRelations> {
  const existing = await prisma.post.findUniqueOrThrow({ where: { id } });
  const slug = await uniquePostSlug(input.title, id);
  const contentHtml = sanitizePostHtml(input.contentHtml);
  const publishedAt = input.published
    ? (existing.publishedAt ?? new Date())
    : null;

  return prisma.$transaction(async (tx) => {
    await tx.postMedia.deleteMany({ where: { postId: id } });
    await tx.postYoutube.deleteMany({ where: { postId: id } });
    await tx.postLink.deleteMany({ where: { postId: id } });
    return tx.post.update({
      where: { id },
      data: {
        title: input.title,
        slug,
        excerpt: input.excerpt,
        contentHtml,
        published: input.published,
        publishedAt,
        coverId: input.coverId ?? null,
        media: { create: input.mediaIds.map((mediaId, order) => ({ mediaId, order })) },
        youtube: {
          create: input.youtube.map((y, order) => ({
            youtubeId: y.youtubeId,
            title: y.title ?? null,
            order,
          })),
        },
        links: {
          create: input.links.map((l, order) => ({ label: l.label, url: l.url, order })),
        },
      },
      include: postInclude,
    });
  });
}
