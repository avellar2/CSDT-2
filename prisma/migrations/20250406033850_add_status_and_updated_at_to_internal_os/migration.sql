/*
  Warnings:

  - Added the required column `updatedAt` to the `InternalOS` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InternalOS" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Pendente',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
