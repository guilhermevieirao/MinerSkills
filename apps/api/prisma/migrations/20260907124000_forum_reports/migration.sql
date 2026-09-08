-- AlterTable: quem moderou cada tópico/resposta (id do admin, sem FK — admins
-- podem ser excluídos e o histórico de moderação precisa sobreviver a isso).
ALTER TABLE "ForumTopic" ADD COLUMN "moderatedBy" TEXT;

-- AlterTable
ALTER TABLE "ForumReply" ADD COLUMN "moderatedBy" TEXT;

-- CreateTable: denúncias de visitantes sobre tópicos/respostas aprovados, lidas
-- na aba Denúncias de /admin/forum. O IP fica só como hash (sha256 + segredo do
-- servidor), usado para não contar a mesma denúncia duas vezes em 24h.
CREATE TABLE "ForumReport" (
    "id" TEXT NOT NULL,
    "topicId" TEXT,
    "replyId" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "ipHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "ForumReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: a fila do painel filtra por status, da mais recente
CREATE INDEX "ForumReport_status_createdAt_idx" ON "ForumReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ForumReport_topicId_idx" ON "ForumReport"("topicId");

-- CreateIndex
CREATE INDEX "ForumReport_replyId_idx" ON "ForumReport"("replyId");

-- AddForeignKey: excluir o alvo apaga as denúncias dele
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ForumTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "ForumReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
