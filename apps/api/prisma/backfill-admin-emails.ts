import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prisma, disconnectPrisma } from '../src/lib/prisma.js';
import { normalizeEmail } from '../src/lib/email.js';

/**
 * Backfill idempotente dos e-mails de Admin — o equivalente, para o SQLite
 * (`db push`), do UPDATE da migration 20260906130000_admin_session_revocation:
 * o login e a gestão de admins normalizam o e-mail (minúsculas, sem espaços),
 * então registros antigos gravados com outra caixa precisam acompanhar, ou o
 * dono deixa de conseguir entrar. Quando outro admin já ocupa o valor
 * normalizado, o registro é mantido como está (com aviso) — resolver à mão.
 */
export async function backfillAdminEmails(): Promise<void> {
  const admins = await prisma.admin.findMany({ select: { id: true, email: true } });
  const taken = new Set(admins.map((a) => a.email));
  let updated = 0;
  let conflicts = 0;

  for (const admin of admins) {
    const email = normalizeEmail(admin.email);
    if (email === admin.email) continue;
    if (taken.has(email)) {
      conflicts++;
      console.warn(`  ⚠ admin ${admin.email}: ${email} já pertence a outro registro, mantido`);
      continue;
    }
    await prisma.admin.update({ where: { id: admin.id }, data: { email } });
    taken.delete(admin.email);
    taken.add(email);
    updated++;
  }

  console.log(
    updated > 0 || conflicts > 0
      ? `  ✓ e-mails de admin: ${updated} normalizado(s)${conflicts > 0 ? `, ${conflicts} em conflito` : ''}`
      : `  ✓ e-mails de admin: nada a fazer (${admins.length} no total)`,
  );
}

// Só executa quando chamado diretamente (`tsx prisma/backfill-admin-emails.ts`);
// importado pelo agregador, apenas exporta a função.
const isMain =
  !!process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  backfillAdminEmails()
    .catch((err) => {
      console.error('❌ Backfill dos e-mails de admin falhou:', err);
      process.exitCode = 1;
    })
    .finally(() => disconnectPrisma());
}
