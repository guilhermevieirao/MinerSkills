-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "tier" TEXT NOT NULL,
    "logoId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sponsor_active_order_idx" ON "Sponsor"("active", "order");

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dados iniciais: patrocinadores que até aqui estavam fixos no rodapé
-- (DEFAULT_SPONSORS em packages/shared/src/constants.ts). Ids fixos + WHERE NOT
-- EXISTS para a migration ser segura em bancos que já receberam os registros.
INSERT INTO "Sponsor" ("id", "name", "url", "tier", "order", "active")
SELECT 'spon_fiemg', 'FIEMG', 'https://www.fiemg.com.br', 'principal', 0, true
WHERE NOT EXISTS (SELECT 1 FROM "Sponsor" WHERE "id" = 'spon_fiemg');

INSERT INTO "Sponsor" ("id", "name", "url", "tier", "order", "active")
SELECT 'spon_sesi', 'SESI', 'https://www.fiemg.com.br/sesi', 'apoio', 1, true
WHERE NOT EXISTS (SELECT 1 FROM "Sponsor" WHERE "id" = 'spon_sesi');

INSERT INTO "Sponsor" ("id", "name", "url", "tier", "order", "active")
SELECT 'spon_senai', 'SENAI', 'https://www.fiemg.com.br/senai', 'apoio', 2, true
WHERE NOT EXISTS (SELECT 1 FROM "Sponsor" WHERE "id" = 'spon_senai');
