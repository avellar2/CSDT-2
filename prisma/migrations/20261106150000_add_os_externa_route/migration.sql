-- Associação explícita entre OS externas e rotas operacionais.
-- Migração aditiva e idempotente: a coluna é anulável para preservar todo o
-- histórico de OS já existente (OS antigas permanecem com routeId nulo).

ALTER TABLE "OSExterna" ADD COLUMN IF NOT EXISTS "routeId" INTEGER;

CREATE INDEX IF NOT EXISTS "OSExterna_routeId_idx" ON "OSExterna"("routeId");

DO $$ BEGIN
  ALTER TABLE "OSExterna" ADD CONSTRAINT "OSExterna_routeId_fkey"
    FOREIGN KEY ("routeId") REFERENCES "DailyRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
