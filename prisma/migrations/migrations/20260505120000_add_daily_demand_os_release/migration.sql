-- CreateTable
CREATE TABLE "DailyDemandOsRelease" (
    "id" SERIAL NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "demandDate" TIMESTAMP(3) NOT NULL,
    "releasedById" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyDemandOsRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyDemandOsRelease_demandDate_idx" ON "DailyDemandOsRelease"("demandDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyDemandOsRelease_technicianId_demandDate_key" ON "DailyDemandOsRelease"("technicianId", "demandDate");

-- AddForeignKey
ALTER TABLE "DailyDemandOsRelease" ADD CONSTRAINT "DailyDemandOsRelease_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDemandOsRelease" ADD CONSTRAINT "DailyDemandOsRelease_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
