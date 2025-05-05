-- CreateEnum
CREATE TYPE "ItemsChadaStatus" AS ENUM ('PENDENTE', 'RESOLVIDO');

-- AlterTable
ALTER TABLE "ItemsChada" ADD COLUMN     "status" "ItemsChadaStatus" NOT NULL DEFAULT 'PENDENTE';
