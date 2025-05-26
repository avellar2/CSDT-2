-- AlterTable
ALTER TABLE "InternalOS" ADD COLUMN     "assinado" TEXT,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "email" TEXT DEFAULT 'Não enviado';
