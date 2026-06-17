/*
  Warnings:

  - A unique constraint covering the columns `[number]` on the table `Memorandum` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `number` to the `Memorandum` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Memorandum" ADD COLUMN     "number" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Memorandum_number_key" ON "Memorandum"("number");
