-- Migração EXCLUSIVAMENTE ADITIVA (não altera nem remove colunas existentes).
-- Não executar com `prisma migrate deploy` sem revisão: o histórico de
-- migrations do banco possui divergências antigas. Aplique manualmente após
-- aprovação. Enquanto não for aplicada, o sistema deriva o estado de
-- finalização a partir de OSExterna (fotos, assinado, lastEmailSent).

CREATE TABLE IF NOT EXISTS "OsExternaFinalizationState" (
    "id" SERIAL NOT NULL,
    "osId" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "lastError" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OsExternaFinalizationState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OsExternaFinalizationState_osId_key"
    ON "OsExternaFinalizationState"("osId");

CREATE INDEX IF NOT EXISTS "OsExternaFinalizationState_stage_idx"
    ON "OsExternaFinalizationState"("stage");
