-- Status de aceitação do CC institucional em cada job de envio.
-- Colunas anuláveis; nenhum dado existente é alterado.
ALTER TABLE "public"."FeedbackSendJob" ADD COLUMN "ccStatus" TEXT;
ALTER TABLE "public"."FeedbackSendJob" ADD COLUMN "ccError" TEXT;
