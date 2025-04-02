-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "memorandumId" INTEGER;

-- CreateTable
CREATE TABLE "Memorandum" (
    "id" SERIAL NOT NULL,
    "schoolName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Memorandum_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_memorandumId_fkey" FOREIGN KEY ("memorandumId") REFERENCES "Memorandum"("id") ON DELETE SET NULL ON UPDATE CASCADE;
