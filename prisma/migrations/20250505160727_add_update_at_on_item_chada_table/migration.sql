/*
  Warnings:

  - Added the required column `updatedAt` to the `ItemsChada` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ItemsChada" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
