-- CreateTable
CREATE TABLE "InternalOS" (
    "id" SERIAL NOT NULL,
    "setorId" TEXT NOT NULL,
    "tecnicoId" INTEGER NOT NULL,
    "problema" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalOS_pkey" PRIMARY KEY ("id")
);
