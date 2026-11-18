-- CreateEnum
CREATE TYPE "public"."FeedbackCampaignStatus" AS ENUM ('DRAFT', 'READY', 'SENDING', 'PAUSED', 'SENT', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."FeedbackChannelKind" AS ENUM ('OFFICIAL', 'TEST');

-- CreateEnum
CREATE TYPE "public"."FeedbackInviteStatus" AS ENUM ('PENDING', 'QUEUED', 'SENDING', 'SENT', 'FAILED', 'ANSWERED', 'EXCLUDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."FeedbackSendJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED_TEMPORARY', 'FAILED_PERMANENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."FeedbackAnswerKind" AS ENUM ('SINGLE', 'MULTI', 'OPEN');

-- AlterTable

-- CreateTable
CREATE TABLE "public"."FeedbackQuestionnaireVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackQuestionnaireVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeedbackCampaign" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."FeedbackCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "channel" "public"."FeedbackChannelKind" NOT NULL DEFAULT 'OFFICIAL',
    "questionnaireVersionId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "introText" TEXT,
    "deadline" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT,
    "preparedAt" TIMESTAMP(3),
    "authorizedAt" TIMESTAMP(3),
    "authorizedBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeedbackInvite" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenHint" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "recipientEmailNormalized" TEXT NOT NULL,
    "groupKey" TEXT,
    "isPrimaryForEmail" BOOLEAN NOT NULL DEFAULT true,
    "status" "public"."FeedbackInviteStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sendCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reopenedAt" TIMESTAMP(3),
    "reopenedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeedbackResponse" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "inviteId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "channel" "public"."FeedbackChannelKind" NOT NULL DEFAULT 'OFFICIAL',
    "respondentName" TEXT NOT NULL,
    "respondentRegistration" TEXT NOT NULL,
    "respondentRole" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgentHash" TEXT,

    CONSTRAINT "FeedbackResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeedbackAnswer" (
    "id" SERIAL NOT NULL,
    "responseId" INTEGER NOT NULL,
    "questionKey" TEXT NOT NULL,
    "kind" "public"."FeedbackAnswerKind" NOT NULL,
    "optionKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "optionLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "textValue" TEXT,
    "otherText" TEXT,

    CONSTRAINT "FeedbackAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeedbackSendJob" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "inviteId" INTEGER NOT NULL,
    "status" "public"."FeedbackSendJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 4,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "messageId" TEXT,
    "smtpResponse" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackSendJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeedbackAuditLog" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "inviteId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackQuestionnaireVersion_version_key" ON "public"."FeedbackQuestionnaireVersion"("version");

-- CreateIndex
CREATE INDEX "FeedbackCampaign_status_idx" ON "public"."FeedbackCampaign"("status");

-- CreateIndex
CREATE INDEX "FeedbackCampaign_channel_createdAt_idx" ON "public"."FeedbackCampaign"("channel", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackInvite_tokenHash_key" ON "public"."FeedbackInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "FeedbackInvite_campaignId_status_idx" ON "public"."FeedbackInvite"("campaignId", "status");

-- CreateIndex
CREATE INDEX "FeedbackInvite_recipientEmailNormalized_idx" ON "public"."FeedbackInvite"("recipientEmailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackInvite_campaignId_schoolId_key" ON "public"."FeedbackInvite"("campaignId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackResponse_inviteId_key" ON "public"."FeedbackResponse"("inviteId");

-- CreateIndex
CREATE INDEX "FeedbackResponse_campaignId_submittedAt_idx" ON "public"."FeedbackResponse"("campaignId", "submittedAt");

-- CreateIndex
CREATE INDEX "FeedbackResponse_schoolId_idx" ON "public"."FeedbackResponse"("schoolId");

-- CreateIndex
CREATE INDEX "FeedbackAnswer_questionKey_idx" ON "public"."FeedbackAnswer"("questionKey");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackAnswer_responseId_questionKey_key" ON "public"."FeedbackAnswer"("responseId", "questionKey");

-- CreateIndex
CREATE INDEX "FeedbackSendJob_status_nextAttemptAt_idx" ON "public"."FeedbackSendJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "FeedbackSendJob_campaignId_status_idx" ON "public"."FeedbackSendJob"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackSendJob_inviteId_key" ON "public"."FeedbackSendJob"("inviteId");

-- CreateIndex
CREATE INDEX "FeedbackAuditLog_campaignId_createdAt_idx" ON "public"."FeedbackAuditLog"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackAuditLog_action_createdAt_idx" ON "public"."FeedbackAuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."FeedbackCampaign" ADD CONSTRAINT "FeedbackCampaign_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "public"."FeedbackQuestionnaireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackInvite" ADD CONSTRAINT "FeedbackInvite_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."FeedbackCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackInvite" ADD CONSTRAINT "FeedbackInvite_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."FeedbackCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "public"."FeedbackInvite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackAnswer" ADD CONSTRAINT "FeedbackAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "public"."FeedbackResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackSendJob" ADD CONSTRAINT "FeedbackSendJob_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."FeedbackCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackSendJob" ADD CONSTRAINT "FeedbackSendJob_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "public"."FeedbackInvite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackAuditLog" ADD CONSTRAINT "FeedbackAuditLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."FeedbackCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

