/*
  Warnings:

  - The primary key for the `ItemsChada` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "ItemsChada" DROP CONSTRAINT "ItemsChada_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "ItemsChada_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ItemsChada_id_seq";
