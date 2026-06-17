-- CreateTable
CREATE TABLE "Locados" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "pcs" INTEGER NOT NULL,
    "notebooks" INTEGER NOT NULL,
    "tablets" INTEGER NOT NULL,
    "estabilizadores" INTEGER NOT NULL,
    "monitors" INTEGER NOT NULL,
    "impressoras" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Locados_pkey" PRIMARY KEY ("id")
);
