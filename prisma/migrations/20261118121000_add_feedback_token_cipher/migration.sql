-- O token bruto do convite é guardado cifrado (AES-256-GCM) apenas até o
-- envio bem-sucedido; a busca no formulário público usa exclusivamente o hash.
ALTER TABLE "public"."FeedbackInvite" ADD COLUMN "tokenCipher" TEXT;
