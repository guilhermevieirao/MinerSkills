-- CreateTable: temporadas da FRC (um jogo por ano); só uma pode ser a atual
-- (regra garantida na API, dentro de uma transação — não há constraint).
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "game" TEXT,
    "summary" TEXT,
    "badgeId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_slug_key" ON "Season"("slug");

-- CreateIndex
CREATE INDEX "Season_year_idx" ON "Season"("year");

-- AlterTable: robôs vinculados à temporada (o campo texto "season" continua
-- como rótulo livre). Excluir a temporada deixa o vínculo nulo.
ALTER TABLE "EncyclopediaEntry" ADD COLUMN "seasonId" TEXT;

-- CreateIndex
CREATE INDEX "EncyclopediaEntry_seasonId_idx" ON "EncyclopediaEntry"("seasonId");

-- AlterTable: prêmios vinculados à temporada.
ALTER TABLE "Award" ADD COLUMN "seasonId" TEXT;

-- CreateIndex
CREATE INDEX "Award_seasonId_idx" ON "Award"("seasonId");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncyclopediaEntry" ADD CONSTRAINT "EncyclopediaEntry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
