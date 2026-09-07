-- AlterTable: a troca de senha registra o instante e o requireAdmin rejeita
-- tokens emitidos antes dele (ver apps/api/src/middleware/auth.ts).
ALTER TABLE "Admin" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

-- O login e a gestão de admins passaram a normalizar o e-mail (minúsculas, sem
-- espaços). Registros antigos acompanham, exceto quando outro admin já ocupa o
-- valor normalizado — esse fica como está, para resolver à mão.
UPDATE "Admin" AS a
SET "email" = lower(trim(a."email"))
WHERE a."email" <> lower(trim(a."email"))
  AND NOT EXISTS (
    SELECT 1 FROM "Admin" AS b
    WHERE b."id" <> a."id" AND b."email" = lower(trim(a."email"))
  );
