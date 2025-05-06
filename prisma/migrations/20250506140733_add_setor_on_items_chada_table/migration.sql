/*
  Warnings:

  - Added the required column `setor` to the `ItemsChada` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ItemsChada" ADD COLUMN     "setor" TEXT NOT NULL;
