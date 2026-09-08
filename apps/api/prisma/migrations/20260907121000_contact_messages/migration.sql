-- CreateTable: mensagens enviadas pelo site (inscrição no processo seletivo e
-- contato), lidas pelo painel em /admin/mensagens. Não há envio de e-mail.
-- O IP fica apenas como hash (sha256 + segredo do servidor), nunca em claro.
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "school" TEXT,
    "grade" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: a caixa de entrada filtra por status e por tipo, sempre da mais recente
CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_kind_createdAt_idx" ON "ContactMessage"("kind", "createdAt");
