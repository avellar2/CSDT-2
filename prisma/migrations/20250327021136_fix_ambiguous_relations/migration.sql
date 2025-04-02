/*
  Warnings:

  - You are about to drop the column `memorandumId` on the `Item` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_memorandumId_fkey";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "memorandumId";

-- CreateTable
CREATE TABLE "MemorandumItem" (
    "id" SERIAL NOT NULL,
    "memorandumId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemorandumItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemorandumItem_memorandumId_itemId_key" ON "MemorandumItem"("memorandumId", "itemId");

-- AddForeignKey
ALTER TABLE "MemorandumItem" ADD CONSTRAINT "MemorandumItem_memorandumId_fkey" FOREIGN KEY ("memorandumId") REFERENCES "Memorandum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemorandumItem" ADD CONSTRAINT "MemorandumItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
