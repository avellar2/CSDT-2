/*
  Warnings:

  - A unique constraint covering the columns `[itemId]` on the table `ItemsChada` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ItemsChada_itemId_key" ON "ItemsChada"("itemId");
