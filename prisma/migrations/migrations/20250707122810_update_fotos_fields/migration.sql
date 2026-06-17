/*
  Warnings:

  - The `fotosAntes` column on the `OSExterna` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `fotosDepois` column on the `OSExterna` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "OSExterna" DROP COLUMN "fotosAntes",
ADD COLUMN     "fotosAntes" TEXT[],
DROP COLUMN "fotosDepois",
ADD COLUMN     "fotosDepois" TEXT[];
