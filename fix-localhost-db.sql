-- Adicionar colunas no banco localhost
ALTER TABLE "ItemsChada"
ADD COLUMN IF NOT EXISTS "numeroChadaOS" TEXT,
ADD COLUMN IF NOT EXISTS "emailSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "emailMessageId" TEXT;
