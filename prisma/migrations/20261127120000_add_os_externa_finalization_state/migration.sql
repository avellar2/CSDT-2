-- Migração EXCLUSIVAMENTE ADITIVA (não altera nem remove colunas existentes).
-- Não executar com `prisma migrate deploy` sem revisão: o histórico de
-- migrations do banco possui divergências antigas. Aplique manualmente após
-- aprovação e registre com `prisma migrate resolve --applied`.
-- Enquanto não for aplicada, o sistema deriva o estado de finalização a
-- partir de OSExterna (fotos, assinado, lastEmailSent).

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

-- RLS habilitado sem policies: o cliente Supabase (anon/authenticated) não
-- acessa a tabela. O Prisma usa a conexão do owner (postgres), que continua
-- funcionando. Não usar FORCE RLS, pois isso bloquearia o próprio servidor.
ALTER TABLE "OsExternaFinalizationState" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "OsExternaFinalizationState" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "OsExternaFinalizationState" FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON SEQUENCE "OsExternaFinalizationState_id_seq" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON SEQUENCE "OsExternaFinalizationState_id_seq" FROM authenticated';
  END IF;
END
$$;
