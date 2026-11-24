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

-- RLS habilitado sem policies: o cliente Supabase (anon/authenticated) não
-- acessa a tabela. O Prisma usa a conexão do owner (postgres), que continua
-- funcionando. Não usar FORCE RLS, pois isso bloquearia o próprio servidor.
ALTER TABLE "OsExternaSubmission" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "OsExternaSubmission" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "OsExternaSubmission" FROM authenticated';
  END IF;
END
$$;
