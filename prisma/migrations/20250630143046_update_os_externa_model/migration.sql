/*
  Warnings:

  - Added the required column `data` to the `OSExterna` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hora` to the `OSExterna` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OSExterna" ADD COLUMN     "data" TEXT NOT NULL,
ADD COLUMN     "hora" TEXT NOT NULL;
