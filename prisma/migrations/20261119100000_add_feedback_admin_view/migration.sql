-- Controle persistente de "respostas novas" por operador ADMTOTAL.
-- Tabela nova e isolada; nenhum dado existente é alterado.
CREATE TABLE "public"."FeedbackAdminView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackAdminView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeedbackAdminView_userId_key" ON "public"."FeedbackAdminView"("userId");
