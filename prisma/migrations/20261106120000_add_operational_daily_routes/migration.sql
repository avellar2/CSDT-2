-- Rota operacional diária de visitas técnicas.
-- Migração aditiva: não remove nem recria tabelas existentes. Colunas novas
-- são anuláveis para preservar todo o histórico de demandas/chamados.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RouteEntityType" AS ENUM ('DEMAND', 'TECHNICAL_TICKET', 'CHAMADO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "SchoolDemand" ADD COLUMN IF NOT EXISTS "routeId" INTEGER;
ALTER TABLE "TechnicalTicket" ADD COLUMN IF NOT EXISTS "routeId" INTEGER;
ALTER TABLE "chamados_escalas" ADD COLUMN IF NOT EXISTS "routeId" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DailyRoute" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "vehicle" TEXT,
    "status" "RouteStatus" NOT NULL DEFAULT 'PLANNED',
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DailyRouteTechnician" (
    "id" SERIAL NOT NULL,
    "routeId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "routeDate" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "conflictKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "removedBy" TEXT,

    CONSTRAINT "DailyRouteTechnician_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RouteTransfer" (
    "id" SERIAL NOT NULL,
    "entityType" "RouteEntityType" NOT NULL,
    "entityId" INTEGER NOT NULL,
    "fromRouteId" INTEGER,
    "toRouteId" INTEGER,
    "movedBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DailyRoute_date_name_key" ON "DailyRoute"("date", "name");
CREATE INDEX IF NOT EXISTS "DailyRoute_date_status_idx" ON "DailyRoute"("date", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "DailyRouteTechnician_routeId_technicianId_key" ON "DailyRouteTechnician"("routeId", "technicianId");
CREATE UNIQUE INDEX IF NOT EXISTS "DailyRouteTechnician_conflictKey_key" ON "DailyRouteTechnician"("conflictKey");
CREATE INDEX IF NOT EXISTS "DailyRouteTechnician_technicianId_routeDate_idx" ON "DailyRouteTechnician"("technicianId", "routeDate");
CREATE INDEX IF NOT EXISTS "DailyRouteTechnician_routeDate_idx" ON "DailyRouteTechnician"("routeDate");

CREATE INDEX IF NOT EXISTS "RouteTransfer_entityType_entityId_idx" ON "RouteTransfer"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "RouteTransfer_createdAt_idx" ON "RouteTransfer"("createdAt");

CREATE INDEX IF NOT EXISTS "SchoolDemand_routeId_idx" ON "SchoolDemand"("routeId");
CREATE INDEX IF NOT EXISTS "TechnicalTicket_routeId_idx" ON "TechnicalTicket"("routeId");
CREATE INDEX IF NOT EXISTS "chamados_escalas_routeId_idx" ON "chamados_escalas"("routeId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "SchoolDemand" ADD CONSTRAINT "SchoolDemand_routeId_fkey"
    FOREIGN KEY ("routeId") REFERENCES "DailyRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TechnicalTicket" ADD CONSTRAINT "TechnicalTicket_routeId_fkey"
    FOREIGN KEY ("routeId") REFERENCES "DailyRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "chamados_escalas" ADD CONSTRAINT "chamados_escalas_routeId_fkey"
    FOREIGN KEY ("routeId") REFERENCES "DailyRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DailyRouteTechnician" ADD CONSTRAINT "DailyRouteTechnician_routeId_fkey"
    FOREIGN KEY ("routeId") REFERENCES "DailyRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DailyRouteTechnician" ADD CONSTRAINT "DailyRouteTechnician_technicianId_fkey"
    FOREIGN KEY ("technicianId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RouteTransfer" ADD CONSTRAINT "RouteTransfer_fromRouteId_fkey"
    FOREIGN KEY ("fromRouteId") REFERENCES "DailyRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RouteTransfer" ADD CONSTRAINT "RouteTransfer_toRouteId_fkey"
    FOREIGN KEY ("toRouteId") REFERENCES "DailyRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
