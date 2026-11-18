-- Reabertura de convite deve preservar o histórico de respostas.
-- Em vez de sobrescrever a resposta, o administrador cria um novo convite
-- para a mesma unidade; por isso (campaignId, schoolId) deixa de ser único.
-- A garantia de uma resposta por convite continua em UNIQUE(FeedbackResponse.inviteId).
DROP INDEX IF EXISTS "public"."FeedbackInvite_campaignId_schoolId_key";

CREATE INDEX IF NOT EXISTS "FeedbackInvite_campaignId_schoolId_idx"
  ON "public"."FeedbackInvite"("campaignId", "schoolId");
