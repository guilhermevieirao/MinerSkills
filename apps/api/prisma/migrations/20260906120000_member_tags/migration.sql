-- CreateTable
CREATE TABLE "MemberTag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberTag_key_key" ON "MemberTag"("key");

-- CreateIndex
CREATE INDEX "MemberTag_order_idx" ON "MemberTag"("order");

-- Dados iniciais: tags padrão (DEFAULT_MEMBER_TAGS em packages/shared/src/constants.ts)
INSERT INTO "MemberTag" ("id", "key", "label", "icon", "order") VALUES
    ('mtag_competidor', 'competidor', 'Competidor', 'swords', 0),
    ('mtag_treinador', 'treinador', 'Treinador', 'graduation-cap', 1),
    ('mtag_mecanica', 'mecanica', 'Mecânica', 'wrench', 2),
    ('mtag_eletronica', 'eletronica', 'Eletrônica', 'circuit-board', 3),
    ('mtag_programacao', 'programacao', 'Programação', 'code', 4),
    ('mtag_cad', 'cad', 'Cadista', 'box', 5),
    ('mtag_marketing', 'marketing', 'Marketing', 'megaphone', 6),
    ('mtag_piloto', 'piloto', 'Piloto', 'gamepad', 7);

-- Chaves já usadas por registros existentes e ausentes acima viram tags
-- (label = key, sem ícone) para nenhum filtro sumir do site.
INSERT INTO "MemberTag" ("id", "key", "label", "icon", "order")
SELECT 'mtag_' || t."tag", t."tag", t."tag", NULL, 100
FROM (SELECT DISTINCT "tag" FROM "EncyclopediaTag") AS t
WHERE NOT EXISTS (SELECT 1 FROM "MemberTag" m WHERE m."key" = t."tag");
