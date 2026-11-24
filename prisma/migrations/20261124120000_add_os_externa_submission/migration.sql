-- Idempotência de lançamentos de OS externa.
-- A chave é `${userId}:${clientRequestId}`; a unique constraint garante que
-- duas requisições simultâneas da mesma tentativa não criem duas OS.
-- Tabela aditiva: não altera nem remove registros existentes.

CREATE TABLE IF NOT EXISTS "OsExternaSubmission" (
    "id" SERIAL NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "osId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OsExternaSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OsExternaSubmission_requestId_key" ON "OsExternaSubmission"("requestId");
CREATE INDEX IF NOT EXISTS "OsExternaSubmission_userId_createdAt_idx" ON "OsExternaSubmission"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "OsExternaSubmission_osId_idx" ON "OsExternaSubmission"("osId");
