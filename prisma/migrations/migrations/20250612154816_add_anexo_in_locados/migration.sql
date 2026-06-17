/*
  Warnings:

  - Added the required column `estabilizadores2` to the `Locados` table without a default value. This is not possible if the table is not empty.
  - Added the required column `impressoras2` to the `Locados` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monitors2` to the `Locados` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name2` to the `Locados` table without a default value. This is not possible if the table is not empty.
  - Added the required column `notebooks2` to the `Locados` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pcs2` to the `Locados` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tablets2` to the `Locados` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Locados" ADD COLUMN     "estabilizadores2" INTEGER NOT NULL,
ADD COLUMN     "impressoras2" INTEGER NOT NULL,
ADD COLUMN     "monitors2" INTEGER NOT NULL,
ADD COLUMN     "name2" TEXT NOT NULL,
ADD COLUMN     "notebooks2" INTEGER NOT NULL,
ADD COLUMN     "pcs2" INTEGER NOT NULL,
ADD COLUMN     "tablets2" INTEGER NOT NULL;
