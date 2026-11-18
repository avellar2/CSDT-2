-- Classificação persistente de elegibilidade da Pesquisa de Feedback.
-- Colunas novas e anuláveis: nenhum dado existente é alterado ou removido.
-- surveyUnitType: SCHOOL | ADMIN_SECTOR | REVIEW
-- surveyEligible: override auditado (true/false); NULL = usar classificação estrutural.
ALTER TABLE "public"."School" ADD COLUMN "surveyUnitType" TEXT;
ALTER TABLE "public"."School" ADD COLUMN "surveyEligible" BOOLEAN;
ALTER TABLE "public"."School" ADD COLUMN "surveyAuditReason" TEXT;
ALTER TABLE "public"."School" ADD COLUMN "surveyAuditedAt" TIMESTAMP(3);
ALTER TABLE "public"."School" ADD COLUMN "surveyAuditedBy" TEXT;
