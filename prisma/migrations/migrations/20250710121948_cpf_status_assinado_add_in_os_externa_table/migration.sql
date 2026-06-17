/*
  Warnings:

  - Added the required column `updatedAt` to the `OSExterna` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OSExterna" ADD COLUMN     "assinado" TEXT,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Pendente',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
