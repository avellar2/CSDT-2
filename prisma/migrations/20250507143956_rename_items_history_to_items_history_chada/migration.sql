-- CreateTable
CREATE TABLE "ItemsHistoryChada" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "resolvedBy" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemsHistoryChada_pkey" PRIMARY KEY ("id")
);
