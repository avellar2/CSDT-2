/*
  Warnings:

  - The `outrasImpressoras` column on the `OSExterna` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "OSExterna" DROP COLUMN "outrasImpressoras",
ADD COLUMN     "outrasImpressoras" INTEGER;
