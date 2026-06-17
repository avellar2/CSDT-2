/*
  Warnings:

  - A unique constraint covering the columns `[numeroOs]` on the table `OSExterna` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `numeroOs` to the `OSExterna` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OSExterna" ADD COLUMN     "numeroOs" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "OSExterna_numeroOs_key" ON "OSExterna"("numeroOs");
