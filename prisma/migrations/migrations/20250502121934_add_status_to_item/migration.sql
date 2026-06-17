-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DISPONIVEL';

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "students" INTEGER DEFAULT 0;
