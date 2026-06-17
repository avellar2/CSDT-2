-- CreateTable
CREATE TABLE "ItemsChada" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "problem" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemsChada_pkey" PRIMARY KEY ("id")
);
