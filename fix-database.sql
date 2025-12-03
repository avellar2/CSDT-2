-- Adicionar colunas que faltam na tabela ItemsChada
ALTER TABLE "ItemsChada"
ADD COLUMN IF NOT EXISTS "numeroChadaOS" TEXT,
ADD COLUMN IF NOT EXISTS "emailSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "emailMessageId" TEXT;
