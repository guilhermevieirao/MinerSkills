import { DEFAULT_MEMBER_TAGS } from '@minerskills/shared';
import { prisma, disconnectPrisma } from '../src/lib/prisma.js';

/**
 * Backfill idempotente de MemberTag — o equivalente, para o SQLite (`db push`),
 * do que a migration 20260906120000_member_tags faz em SQL no PostgreSQL:
 *
 *   1. tabela vazia → cria as 8 tags padrão (DEFAULT_MEMBER_TAGS);
 *   2. chaves já gravadas em EncyclopediaTag sem MemberTag correspondente
 *      viram tags (label = key, sem ícone) para nenhum filtro sumir do site.
 *
 * Nunca altera nem apaga tags existentes: uma tag excluída pelo admin (que já
 * removeu seus vínculos) não volta. Encadeado em `npm run db:push` e no
 * docker-entrypoint (ramo SQLite).
 */
async function backfillMemberTags(): Promise<void> {
  let created = 0;

  if ((await prisma.memberTag.count()) === 0) {
    for (let i = 0; i < DEFAULT_MEMBER_TAGS.length; i++) {
      const t = DEFAULT_MEMBER_TAGS[i]!;
      await prisma.memberTag.create({
        data: { key: t.key, label: t.label, icon: t.icon, order: i },
      });
      created++;
    }
  }

  const known = new Set(
    (await prisma.memberTag.findMany({ select: { key: true } })).map((t) => t.key),
  );
  const used = await prisma.encyclopediaTag.groupBy({ by: ['tag'] });
  for (const { tag } of used) {
    if (known.has(tag)) continue;
    await prisma.memberTag.create({ data: { key: tag, label: tag, icon: null, order: 100 } });
    known.add(tag);
    created++;
  }

  console.log(
    created > 0
      ? `  ✓ tags da equipe: ${created} criada(s) (${known.size} no total)`
      : `  ✓ tags da equipe: nada a fazer (${known.size} no total)`,
  );
}

backfillMemberTags()
  .catch((err) => {
    console.error('❌ Backfill das tags da equipe falhou:', err);
    process.exitCode = 1;
  })
  .finally(() => disconnectPrisma());
