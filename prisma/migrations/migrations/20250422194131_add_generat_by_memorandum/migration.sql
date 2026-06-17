/*
  Warnings:

  - Added the required column `generatedBy` to the `Memorandum` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Memorandum" ADD COLUMN     "generatedBy" TEXT NOT NULL;
