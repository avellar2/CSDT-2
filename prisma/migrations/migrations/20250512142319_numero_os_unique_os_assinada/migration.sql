/*
  Warnings:

  - A unique constraint covering the columns `[numeroOs]` on the table `OsAssinada` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "OsAssinada_numeroOs_key" ON "OsAssinada"("numeroOs");
