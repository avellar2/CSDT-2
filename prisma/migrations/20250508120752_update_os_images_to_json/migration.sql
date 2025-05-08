/*
  Warnings:

  - The `osImages` column on the `ItemsChada` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ItemsChada" DROP COLUMN "osImages",
ADD COLUMN     "osImages" JSONB[];
