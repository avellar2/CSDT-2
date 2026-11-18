import crypto from "crypto";
import { Prisma, type FeedbackCampaign } from "@prisma/client";
import prisma from "@/utils/prisma";
import {
  FEEDBACK_DEFAULT_INTRO,
  FEEDBACK_DEFAULT_SUBJECT,
  FEEDBACK_MAX_RECIPIENTS,
  FEEDBACK_QUEUE_BATCH_SIZE,
  FEEDBACK_TEST_RECIPIENT,
  FEEDBACK_TOKEN_TTL_DAYS,
  feedbackAppBaseUrl,
  feedbackQueueWorkerEnabled,
  feedbackSenderAddress,
  feedbackSurveyPath,
} from "./config";
import {
  FEEDBACK_QUESTIONNAIRE,
  FEEDBACK_QUESTIONNAIRE_VERSION,
  serializeQuestionnaireDefinition,
} from "./questionnaire";
import { planRecipients, type SchoolRecipientRow } from "./recipients";
import {
  classifySchoolUnit,
  type SchoolUnitType,
} from "./schoolEligibility";
import {
  buildFeedbackInviteEmail,
  formatDeadlineLabel,
  isAuthorizedTestRecipient,
} from "./email";
import {
  decryptFeedbackToken,
  encryptFeedbackToken,
  generateFeedbackToken,
  feedbackTokenHint,
  hashFeedbackToken,
} from "./tokens";
import { computeBackoffDelayMs, classifySmtpError, sendMail } from "@/utils/mailer";

export interface AuditActor {
  userId: string;
  name?: string | null;
  role: string;
}

export class FeedbackServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function logFeedbackAudit(input: {
  campaignId?: number | null;
  actor: AuditActor;
  action: string;
  inviteId?: number | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.feedbackAuditLog.create({
    data: {
      campaignId: input.campaignId ?? null,
      actorUserId: input.actor.userId,
      actorName: input.actor.name ?? null,
      actorRole: input.actor.role,
      action: input.action,
      inviteId: input.inviteId ?? null,
      metadata: input.metadata,
    },
  });
}

/** Garante a versão ativa do questionário e devolve seu id. */
export async function ensureQuestionnaireVersion(): Promise<string> {
  const existing = await prisma.feedbackQuestionnaireVersion.findUnique({
    where: { version: FEEDBACK_QUESTIONNAIRE_VERSION },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.feedbackQuestionnaireVersion.create({
    data: {
      version: FEEDBACK_QUESTIONNAIRE_VERSION,
      title: FEEDBACK_QUESTIONNAIRE.title,
      questionCount: FEEDBACK_QUESTIONNAIRE.questions.length,
      definition: serializeQuestionnaireDefinition(),
      isActive: true,
    },
    select: { id: true },
  });
  return created.id;
}

export async function createCampaign(input: {
  name: string;
  subject?: string;
  introText?: string;
  deadline?: Date | null;
  actor: AuditActor;
  channel?: "OFFICIAL" | "TEST";
}): Promise<FeedbackCampaign> {
  const name = (input.name ?? "").trim();
  if (!name) throw new FeedbackServiceError("Informe um nome para a campanha.");
  if (name.length > 160) throw new FeedbackServiceError("Nome da campanha muito longo.");

  const questionnaireVersionId = await ensureQuestionnaireVersion();

  const campaign = await prisma.feedbackCampaign.create({
    data: {
      name,
      subject: (input.subject || FEEDBACK_DEFAULT_SUBJECT).slice(0, 300),
      introText: (input.introText || FEEDBACK_DEFAULT_INTRO).slice(0, 2000),
      deadline: input.deadline ?? null,
      channel: input.channel ?? "OFFICIAL",
      questionnaireVersionId,
      createdBy: input.actor.userId,
      createdByName: input.actor.name ?? null,
      status: "DRAFT",
    },
  });

  await logFeedbackAudit({
    campaignId: campaign.id,
    actor: input.actor,
    action: "CAMPAIGN_CREATED",
    metadata: { name: campaign.name, channel: campaign.channel },
  });

  return campaign;
}

async function loadSchoolRows(): Promise<SchoolRecipientRow[]> {
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      district: true,
      parentSchoolId: true,
      inep: true,
      students: true,
      surveyUnitType: true,
      surveyEligible: true,
      surveyAuditReason: true,
    },
    orderBy: { name: "asc" },
  });
  return schools;
}

export async function getRecipientPlan() {
  return planRecipients(await loadSchoolRows());
}

export interface SchoolAuditItem {
  id: number;
  name: string;
  district: string | null;
  email: string | null;
  inep: number;
  students: number;
  type: SchoolUnitType;
  eligible: boolean;
  reason: string;
  source: string;
}

/**
 * Auditoria dos cadastros de School. Pode apenas relatar (dry-run) ou persistir
 * a classificação em surveyUnitType/surveyEligible/surveyAuditReason.
 *
 * A persistência é aditiva: não altera nome, e-mail, vínculos nem qualquer
 * outro campo da escola. Serve para congelar a decisão auditada e evitar que
 * mudanças de heurística afetem campanhas futuras sem revisão.
 */
export async function auditSchoolEligibility(
  actor: AuditActor,
  persist: boolean,
): Promise<{
  summary: {
    total: number;
    schools: number;
    adminSectors: number;
    review: number;
    persisted: number;
  };
  items: SchoolAuditItem[];
}> {
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      district: true,
      email: true,
      inep: true,
      students: true,
      parentSchoolId: true,
      surveyUnitType: true,
      surveyEligible: true,
      surveyAuditReason: true,
    },
    orderBy: [{ district: "asc" }, { name: "asc" }],
  });

  const items: SchoolAuditItem[] = schools.map((school) => {
    const decision = classifySchoolUnit(school);
    return {
      id: school.id,
      name: school.name,
      district: school.district ?? null,
      email: school.email ?? null,
      inep: school.inep ?? 0,
      students: school.students ?? 0,
      type: decision.type,
      eligible: decision.eligible,
      reason: decision.reason,
      source: decision.source,
    };
  });

  const summary = {
    total: schools.length,
    schools: items.filter((item) => item.type === "SCHOOL").length,
    adminSectors: items.filter((item) => item.type === "ADMIN_SECTOR").length,
    review: items.filter((item) => item.type === "REVIEW").length,
    persisted: 0,
  };

  if (persist) {
    const auditedAt = new Date();
    const CHUNK = 50;
    for (let index = 0; index < items.length; index += CHUNK) {
      const chunk = items.slice(index, index + CHUNK);
      await prisma.$transaction(
        chunk.map((item) =>
          prisma.school.update({
            where: { id: item.id },
            data: {
              surveyUnitType: item.type,
              surveyEligible: item.eligible,
              surveyAuditReason: item.reason,
              surveyAuditedAt: auditedAt,
              surveyAuditedBy: actor.userId,
            },
          }),
        ),
      );
    }
    summary.persisted = items.length;

    await logFeedbackAudit({
      actor,
      action: "SCHOOL_ELIGIBILITY_AUDITED",
      metadata: {
        total: summary.total,
        schools: summary.schools,
        adminSectors: summary.adminSectors,
        review: summary.review,
      },
    });
  }

  return { summary, items };
}

/** Override manual e auditado para uma unidade específica. */
export async function setSchoolEligibilityOverride(input: {
  schoolId: number;
  eligible: boolean;
  type?: SchoolUnitType;
  reason: string;
  actor: AuditActor;
}) {
  const school = await prisma.school.findUnique({
    where: { id: input.schoolId },
    select: { id: true, name: true },
  });
  if (!school) throw new FeedbackServiceError("Escola não encontrada.", 404);

  const type: SchoolUnitType =
    input.type ?? (input.eligible ? "SCHOOL" : "ADMIN_SECTOR");

  await prisma.school.update({
    where: { id: input.schoolId },
    data: {
      surveyUnitType: type,
      surveyEligible: input.eligible,
      surveyAuditReason: input.reason.slice(0, 500),
      surveyAuditedAt: new Date(),
      surveyAuditedBy: input.actor.userId,
    },
  });

  await logFeedbackAudit({
    actor: input.actor,
    action: "SCHOOL_ELIGIBILITY_OVERRIDDEN",
    metadata: {
      schoolId: school.id,
      schoolName: school.name,
      eligible: input.eligible,
      type,
      reason: input.reason.slice(0, 500),
    },
  });

  return { schoolId: school.id, name: school.name, eligible: input.eligible, type };
}

/**
 * Remove de uma campanha oficial quaisquer convites cujo cadastro não seja
 * unidade escolar. Defesa em profundidade para campanhas preparadas antes da
 * regra ou manipuladas diretamente no banco.
 */
export async function excludeIneligibleInvites(
  campaignId: number,
  actor: AuditActor,
): Promise<{ excluded: number; names: string[] }> {
  const invites = await prisma.feedbackInvite.findMany({
    // Respostas já recebidas são preservadas; o bloqueio vale para envios
    // futuros e para convites ainda pendentes.
    where: {
      campaignId,
      status: { notIn: ["EXCLUDED", "EXPIRED", "ANSWERED"] },
    },
    include: {
      School: {
        select: {
          id: true,
          name: true,
          district: true,
          inep: true,
          students: true,
          parentSchoolId: true,
          surveyUnitType: true,
          surveyEligible: true,
          surveyAuditReason: true,
        },
      },
    },
  });

  const targets = invites.filter(
    (invite) => classifySchoolUnit(invite.School).type !== "SCHOOL",
  );

  if (targets.length === 0) return { excluded: 0, names: [] };

  const ids = targets.map((invite) => invite.id);

  await prisma.$transaction([
    prisma.feedbackSendJob.updateMany({
      where: { inviteId: { in: ids } },
      data: {
        status: "CANCELLED",
        lastError: "Convite inelegível: cadastro não é unidade escolar.",
      },
    }),
    prisma.feedbackInvite.updateMany({
      where: { id: { in: ids } },
      data: {
        status: "EXCLUDED",
        lastError: "Cadastro não é unidade escolar; excluído do envio oficial.",
      },
    }),
  ]);

  await logFeedbackAudit({
    campaignId,
    actor,
    action: "INELIGIBLE_INVITES_EXCLUDED",
    metadata: {
      excluded: targets.length,
      schools: targets.map((invite) => ({
        id: invite.schoolId,
        name: invite.School.name,
      })),
    },
  });

  return {
    excluded: targets.length,
    names: targets.map((invite) => invite.School.name),
  };
}

function expiryFor(campaign: FeedbackCampaign): Date {
  const fallback = new Date(
    Date.now() + FEEDBACK_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  if (campaign.deadline && campaign.deadline < fallback) return campaign.deadline;
  return fallback;
}

/**
 * Cria os convites (um por escola elegível) e enfileira uma mensagem por
 * e-mail normalizado. Não envia nada: apenas prepara a campanha.
 */
export async function prepareCampaign(campaignId: number, actor: AuditActor) {
  const campaign = await prisma.feedbackCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new FeedbackServiceError("Campanha não encontrada.", 404);
  if (campaign.channel !== "OFFICIAL") {
    throw new FeedbackServiceError(
      "Campanhas de teste não geram convites em massa.",
    );
  }
  if (campaign.status === "SENDING" || campaign.status === "SENT") {
    throw new FeedbackServiceError(
      "Campanha já iniciada. Crie uma nova campanha para um novo envio.",
    );
  }
  if (campaign.status === "CLOSED") {
    throw new FeedbackServiceError("Campanha encerrada.");
  }

  const existing = await prisma.feedbackInvite.count({
    where: { campaignId },
  });
  if (existing > 0) {
    return { alreadyPrepared: true, invites: existing };
  }

  const plan = await getRecipientPlan();
  if (plan.totalInvites === 0) {
    throw new FeedbackServiceError("Nenhuma escola elegível com e-mail válido.");
  }
  if (plan.totalInvites > FEEDBACK_MAX_RECIPIENTS) {
    throw new FeedbackServiceError(
      `A campanha excede o limite de ${FEEDBACK_MAX_RECIPIENTS} convites.`,
    );
  }

  const expiresAt = expiryFor(campaign);

  await prisma.$transaction(async (tx) => {
    let created = 0;
    for (const group of plan.groups) {
      let primaryInviteId: number | null = null;
      for (let index = 0; index < group.schools.length; index += 1) {
        const school = group.schools[index];
        const isPrimary = index === 0;
        const rawToken = generateFeedbackToken();

        const invite = await tx.feedbackInvite.create({
          data: {
            campaignId,
            schoolId: school.id,
            tokenHash: hashFeedbackToken(rawToken),
            tokenCipher: encryptFeedbackToken(rawToken),
            tokenHint: feedbackTokenHint(rawToken),
            recipientEmail: (school.email ?? "").trim(),
            recipientEmailNormalized: group.email,
            groupKey: group.email,
            isPrimaryForEmail: isPrimary,
            status: "PENDING",
            expiresAt,
          },
        });
        created += 1;

        if (isPrimary) {
          primaryInviteId = invite.id;
        }
      }

      if (primaryInviteId) {
        await tx.feedbackSendJob.create({
          data: {
            campaignId,
            inviteId: primaryInviteId,
            status: "PENDING",
          },
        });
      }
    }

    await tx.feedbackCampaign.update({
      where: { id: campaignId },
      data: { status: "READY", preparedAt: new Date() },
    });

    if (created === 0) {
      throw new FeedbackServiceError("Nenhum convite foi criado.");
    }
  });

  await logFeedbackAudit({
    campaignId,
    actor,
    action: "CAMPAIGN_PREPARED",
    metadata: {
      invites: plan.totalInvites,
      messages: plan.totalMessages,
      missingEmail: plan.missingEmail.length,
      invalidEmail: plan.invalidEmail.length,
      excluded: plan.excludedSchools.length,
    },
  });

  return {
    alreadyPrepared: false,
    invites: plan.totalInvites,
    messages: plan.totalMessages,
  };
}

/**
 * Autoriza o envio real. Só deve ser chamado após confirmação explícita do
 * ADMTOTAL na interface. Não envia diretamente: enfileira/retoma a fila.
 */
export async function authorizeCampaignSend(
  campaignId: number,
  actor: AuditActor,
): Promise<{ queued: number; total: number; excluded: number; excludedNames: string[] }> {
  const campaign = await prisma.feedbackCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new FeedbackServiceError("Campanha não encontrada.", 404);
  if (campaign.channel !== "OFFICIAL") {
    throw new FeedbackServiceError(
      "Use o envio de teste para campanhas de teste.",
    );
  }
  if (!["READY", "PAUSED"].includes(campaign.status)) {
    throw new FeedbackServiceError(
      campaign.status === "DRAFT"
        ? "Prepare os convites antes de autorizar o envio."
        : "Esta campanha não está disponível para envio.",
    );
  }

  // Revalida TODOS os convites antes de liberar o disparo: nenhum setor
  // administrativo pode receber e-mail de campanha oficial, mesmo que o
  // convite tenha sido criado por versão anterior ou manipulado no banco.
  const exclusion = await excludeIneligibleInvites(campaignId, actor);

  const total = await prisma.feedbackSendJob.count({
    where: { campaignId, status: { not: "CANCELLED" } },
  });
  if (total === 0) {
    throw new FeedbackServiceError(
      exclusion.excluded > 0
        ? "Todos os convites desta campanha foram excluídos por não serem unidades escolares."
        : "Não há convites enfileirados.",
    );
  }

  const queued = await prisma.feedbackSendJob.count({
    where: {
      campaignId,
      status: { in: ["PENDING", "FAILED_TEMPORARY"] },
    },
  });

  await prisma.$transaction([
    prisma.feedbackSendJob.updateMany({
      where: {
        campaignId,
        status: "FAILED_TEMPORARY",
      },
      data: { status: "PENDING", nextAttemptAt: new Date() },
    }),
    prisma.feedbackCampaign.update({
      where: { id: campaignId },
      data: {
        status: "SENDING",
        authorizedAt: new Date(),
        authorizedBy: actor.userId,
        pausedAt: null,
      },
    }),
  ]);

  await logFeedbackAudit({
    campaignId,
    actor,
    action: "CAMPAIGN_SEND_AUTHORIZED",
    metadata: {
      totalJobs: total,
      queuedJobs: queued,
      excludedInvites: exclusion.excluded,
    },
  });

  return {
    queued,
    total,
    excluded: exclusion.excluded,
    excludedNames: exclusion.names,
  };
}

export async function setCampaignStatus(
  campaignId: number,
  action: "PAUSE" | "RESUME" | "CLOSE",
  actor: AuditActor,
) {
  const campaign = await prisma.feedbackCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new FeedbackServiceError("Campanha não encontrada.", 404);

  if (action === "PAUSE") {
    if (campaign.status !== "SENDING") {
      throw new FeedbackServiceError("Somente campanhas em envio podem ser pausadas.");
    }
    await prisma.feedbackCampaign.update({
      where: { id: campaignId },
      data: { status: "PAUSED", pausedAt: new Date() },
    });
  } else if (action === "RESUME") {
    if (campaign.status !== "PAUSED") {
      throw new FeedbackServiceError("Somente campanhas pausadas podem ser retomadas.");
    }
    await prisma.feedbackCampaign.update({
      where: { id: campaignId },
      data: { status: "SENDING", pausedAt: null },
    });
  } else {
    await prisma.feedbackCampaign.update({
      where: { id: campaignId },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    await prisma.feedbackInvite.updateMany({
      where: { campaignId, status: { in: ["PENDING", "QUEUED", "SENT"] } },
      data: { status: "EXPIRED" },
    });
    await prisma.feedbackSendJob.updateMany({
      where: { campaignId, status: { in: ["PENDING", "FAILED_TEMPORARY", "PROCESSING"] } },
      data: { status: "CANCELLED" },
    });
  }

  await logFeedbackAudit({
    campaignId,
    actor,
    action: `CAMPAIGN_${action}`,
  });
}

/**
 * Reabertura administrativa explícita de um convite já respondido.
 *
 * Preserva o histórico: a resposta anterior continua no banco e um NOVO
 * convite (novo token) é criado para a mesma unidade. Assim a escola pode
 * responder novamente sem que se perca a resposta anterior.
 */
export async function reopenInvite(
  inviteId: number,
  actor: AuditActor,
  baseUrl: string,
): Promise<{ url: string; inviteId: number; previousInviteId: number }> {
  const invite = await prisma.feedbackInvite.findUnique({
    where: { id: inviteId },
    include: { FeedbackResponse: { select: { id: true } } },
  });
  if (!invite) throw new FeedbackServiceError("Convite não encontrado.", 404);
  if (!invite.FeedbackResponse) {
    throw new FeedbackServiceError("Este convite ainda não foi respondido.");
  }

  const rawToken = generateFeedbackToken();
  const baseExpiry = new Date(
    Date.now() + FEEDBACK_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  const expiresAt = invite.expiresAt > baseExpiry ? invite.expiresAt : baseExpiry;

  const newInvite = await prisma.feedbackInvite.create({
    data: {
      campaignId: invite.campaignId,
      schoolId: invite.schoolId,
      tokenHash: hashFeedbackToken(rawToken),
      tokenCipher: encryptFeedbackToken(rawToken),
      tokenHint: feedbackTokenHint(rawToken),
      recipientEmail: invite.recipientEmail,
      recipientEmailNormalized: invite.recipientEmailNormalized,
      groupKey: invite.groupKey,
      isPrimaryForEmail: invite.isPrimaryForEmail,
      status: "SENT",
      expiresAt,
      reopenedAt: new Date(),
      reopenedBy: actor.userId,
    },
    select: { id: true },
  });

  await logFeedbackAudit({
    campaignId: invite.campaignId,
    inviteId: newInvite.id,
    actor,
    action: "INVITE_REOPENED",
    metadata: {
      schoolId: invite.schoolId,
      previousInviteId: invite.id,
      preservedResponseId: invite.FeedbackResponse.id,
    },
  });

  return {
    url: `${baseUrl}${feedbackSurveyPath(rawToken)}`,
    inviteId: newInvite.id,
    previousInviteId: invite.id,
  };
}

interface GroupInvite {
  id: number;
  schoolId: number;
  tokenCipher: string | null;
  School: { name: string };
}

function ensureGroupTokens(
  invites: GroupInvite[],
): Array<{ inviteId: number; schoolName: string; token: string }> {
  const results: Array<{ inviteId: number; schoolName: string; token: string }> = [];
  for (const invite of invites) {
    const token = invite.tokenCipher
      ? decryptFeedbackToken(invite.tokenCipher)
      : null;
    results.push({
      inviteId: invite.id,
      schoolName: invite.School.name,
      token: token ?? "",
    });
  }
  return results;
}

export interface QueueProcessResult {
  processed: number;
  sent: number;
  failedTemporary: number;
  failedPermanent: number;
  skipped: number;
}

/**
 * Processa um lote pequeno da fila. Idempotente por job: cada job só é
 * reivindicado por um worker (updateMany condicional). Não roda em loop.
 */
export async function processFeedbackQueue(options?: {
  limit?: number;
  baseUrl?: string;
}): Promise<QueueProcessResult> {
  if (!feedbackQueueWorkerEnabled()) {
    throw new FeedbackServiceError(
      "Worker de envio desabilitado. Defina FEEDBACK_QUEUE_WORKER_ENABLED=true para habilitar.",
      503,
    );
  }

  const limit = Math.min(
    Math.max(options?.limit ?? FEEDBACK_QUEUE_BATCH_SIZE, 1),
    25,
  );
  const baseUrl = options?.baseUrl ?? feedbackAppBaseUrl();
  const now = new Date();

  const dueJobs = await prisma.feedbackSendJob.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: now } },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
    include: { Campaign: true },
  });

  const result: QueueProcessResult = {
    processed: 0,
    sent: 0,
    failedTemporary: 0,
    failedPermanent: 0,
    skipped: 0,
  };

  for (const job of dueJobs) {
    if (job.Campaign.status !== "SENDING") {
      result.skipped += 1;
      continue;
    }

    const claim = await prisma.feedbackSendJob.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: {
        status: "PROCESSING",
        claimedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    if (claim.count === 0) {
      result.skipped += 1;
      continue;
    }

    result.processed += 1;

    const attempts = job.attempts + 1;
    try {
      const invite = await prisma.feedbackInvite.findUnique({
        where: { id: job.inviteId },
        include: {
          School: {
            select: {
              id: true,
              name: true,
              district: true,
              inep: true,
              students: true,
              parentSchoolId: true,
              surveyUnitType: true,
              surveyEligible: true,
              surveyAuditReason: true,
            },
          },
        },
      });
      if (!invite) {
        await prisma.feedbackSendJob.update({
          where: { id: job.id },
          data: { status: "FAILED_PERMANENT", lastError: "Convite não encontrado." },
        });
        result.failedPermanent += 1;
        continue;
      }

      // Campanha OFICIAL nunca envia para setor interno, mesmo que o convite
      // tenha sido criado antes da regra ou manipulado diretamente no banco.
      if (
        job.Campaign.channel === "OFFICIAL" &&
        classifySchoolUnit(invite.School).type !== "SCHOOL"
      ) {
        await prisma.$transaction([
          prisma.feedbackSendJob.update({
            where: { id: job.id },
            data: {
              status: "FAILED_PERMANENT",
              lastError:
                "Destinatário não é unidade escolar; envio oficial bloqueado.",
            },
          }),
          prisma.feedbackInvite.update({
            where: { id: invite.id },
            data: {
              status: "EXCLUDED",
              lastError:
                "Destinatário não é unidade escolar; envio oficial bloqueado.",
            },
          }),
        ]);

        await logFeedbackAudit({
          campaignId: invite.campaignId,
          inviteId: invite.id,
          actor: { userId: "system:queue", name: "Worker de envio", role: "SYSTEM" },
          action: "OFFICIAL_SEND_BLOCKED_INELIGIBLE",
          metadata: { schoolId: invite.schoolId, schoolName: invite.School.name },
        });

        result.failedPermanent += 1;
        continue;
      }

      const groupInvites = await prisma.feedbackInvite.findMany({
        where: {
          campaignId: invite.campaignId,
          recipientEmailNormalized: invite.recipientEmailNormalized,
          // Reaberturas administrativas não entram em um novo disparo em massa.
          reopenedAt: null,
        },
        include: { School: { select: { name: true } } },
        orderBy: { schoolId: "asc" },
      });

      const tokens = ensureGroupTokens(groupInvites);
      const missingToken = tokens.find((entry) => !entry.token);
      if (missingToken) {
        throw new Error("Token do convite indisponível para envio.");
      }

      const schoolLinks = tokens.map((entry) => ({
        schoolName: entry.schoolName,
        url: `${baseUrl}${feedbackSurveyPath(entry.token)}`,
      }));

      const email = buildFeedbackInviteEmail({
        schoolLinks,
        deadlineLabel: formatDeadlineLabel(job.Campaign.deadline),
        recipientEmail: invite.recipientEmail,
        isTest: job.Campaign.channel === "TEST",
        baseUrl,
        subject: job.Campaign.subject,
        introText: job.Campaign.introText ?? undefined,
      });

      const sendResult = await sendMail({
        to: invite.recipientEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });

      const accepted = sendResult.accepted.length > 0;

      await prisma.$transaction([
        prisma.feedbackSendJob.update({
          where: { id: job.id },
          data: {
            status: accepted ? "SENT" : "FAILED_PERMANENT",
            sentAt: accepted ? new Date() : null,
            messageId: sendResult.messageId || null,
            smtpResponse: sendResult.response || null,
            lastError: accepted
              ? null
              : "Servidor SMTP não aceitou o destinatário.",
          },
        }),
        prisma.feedbackInvite.updateMany({
          where: { id: { in: groupInvites.map((entry) => entry.id) } },
          data: {
            status: accepted ? "SENT" : "FAILED",
            sentAt: accepted ? new Date() : undefined,
            sendCount: accepted ? { increment: 1 } : undefined,
            attempts: { increment: 1 },
            lastError: accepted ? null : "Servidor SMTP não aceitou o destinatário.",
            // Depois de enviado o token bruto não precisa mais existir.
            tokenCipher: accepted ? null : undefined,
          },
        }),
      ]);

      if (accepted) {
        result.sent += 1;
      } else {
        result.failedPermanent += 1;
      }

      await logFeedbackAudit({
        campaignId: invite.campaignId,
        inviteId: invite.id,
        actor: { userId: "system:queue", name: "Worker de envio", role: "SYSTEM" },
        action: accepted ? "EMAIL_SENT" : "EMAIL_REJECTED",
        metadata: {
          to: invite.recipientEmail,
          messageId: sendResult.messageId,
          accepted: sendResult.accepted,
          rejected: sendResult.rejected,
        },
      });
    } catch (error) {
      const classified = classifySmtpError(error);
      const retryable = classified.kind === "TEMPORARY" && attempts < job.maxAttempts;

      await prisma.feedbackSendJob.update({
        where: { id: job.id },
        data: {
          status: retryable ? "PENDING" : classified.kind === "TEMPORARY"
            ? "FAILED_TEMPORARY"
            : "FAILED_PERMANENT",
          lastError: classified.message,
          nextAttemptAt: retryable
            ? new Date(Date.now() + computeBackoffDelayMs(attempts))
            : new Date(),
        },
      });

      // Todos os convites do mesmo e-mail compartilhado compartilham a mesma
      // mensagem: a falha precisa refletir em todas as unidades do grupo.
      const failedInvite = await prisma.feedbackInvite.findUnique({
        where: { id: job.inviteId },
        select: { campaignId: true, recipientEmailNormalized: true },
      });

      if (failedInvite) {
        await prisma.feedbackInvite.updateMany({
          where: {
            campaignId: failedInvite.campaignId,
            recipientEmailNormalized: failedInvite.recipientEmailNormalized,
          },
          data: {
            status: retryable ? "QUEUED" : "FAILED",
            lastError: classified.message,
            attempts: { increment: 1 },
          },
        });
      }

      if (!retryable && classified.kind === "TEMPORARY") result.failedTemporary += 1;
      else if (!retryable) result.failedPermanent += 1;

      await logFeedbackAudit({
        campaignId: job.campaignId,
        inviteId: job.inviteId,
        actor: { userId: "system:queue", name: "Worker de envio", role: "SYSTEM" },
        action: "EMAIL_SEND_FAILED",
        metadata: {
          kind: classified.kind,
          retryable,
          attempts,
          error: classified.message,
        },
      });
    }

    await finalizeCampaignIfDone(job.campaignId);
  }

  return result;
}

/** Marca a campanha como SENT quando não restam jobs pendentes. */
export async function finalizeCampaignIfDone(campaignId: number) {
  const pending = await prisma.feedbackSendJob.count({
    where: {
      campaignId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });
  if (pending > 0) return;

  const campaign = await prisma.feedbackCampaign.findUnique({
    where: { id: campaignId },
    select: { status: true },
  });
  if (!campaign || campaign.status !== "SENDING") return;

  await prisma.feedbackCampaign.update({
    where: { id: campaignId },
    data: { status: "SENT", sentAt: new Date() },
  });
}

/**
 * Envia um e-mail de teste para o único destinatário autorizado e cria uma
 * campanha TEST isolada, garantindo que a resposta fique fora das estatísticas
 * oficiais.
 */
export async function sendTestEmail(input: {
  actor: AuditActor;
  baseUrl: string;
  subject?: string;
  introText?: string;
}): Promise<{
  campaignId: number;
  inviteId: number;
  url: string;
  accepted: string[];
  rejected: string[];
  messageId: string;
  response: string;
  subject: string;
  html: string;
  text: string;
}> {
  if (!feedbackSenderAddress()) {
    throw new FeedbackServiceError(
      "SMTP não configurado: defina EMAIL_USER e EMAIL_PASS.",
      503,
    );
  }

  const testCampaign = await createCampaign({
    name: `Teste interno — ${new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    })}`,
    subject: input.subject,
    introText: input.introText,
    actor: input.actor,
    channel: "TEST",
  });

  // Exceção autorizada: testes podem usar o registro interno CSDT (id 225),
  // mas SOMENTE em campanha TEST. Campanhas oficiais nunca passam por aqui.
  if (testCampaign.channel !== "TEST") {
    throw new FeedbackServiceError(
      "Envio de teste exige uma campanha do canal TEST.",
      500,
    );
  }

  const rawToken = generateFeedbackToken();
  const expiresAt = new Date(Date.now() + FEEDBACK_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const csdtSchool = await prisma.school.findFirst({
    where: { name: "CSDT" },
    select: { id: true, name: true },
  });
  if (!csdtSchool) {
    throw new FeedbackServiceError(
      "Unidade CSDT não encontrada para registrar o teste.",
      500,
    );
  }

  const invite = await prisma.feedbackInvite.create({
    data: {
      campaignId: testCampaign.id,
      schoolId: csdtSchool.id,
      tokenHash: hashFeedbackToken(rawToken),
      tokenCipher: encryptFeedbackToken(rawToken),
      tokenHint: feedbackTokenHint(rawToken),
      recipientEmail: FEEDBACK_TEST_RECIPIENT,
      recipientEmailNormalized: FEEDBACK_TEST_RECIPIENT,
      groupKey: FEEDBACK_TEST_RECIPIENT,
      isPrimaryForEmail: true,
      status: "PENDING",
      expiresAt,
    },
  });

  const url = `${input.baseUrl}${feedbackSurveyPath(rawToken)}`;

  const email = buildFeedbackInviteEmail({
    schoolLinks: [{ schoolName: `${csdtSchool.name} — Teste`, url }],
    deadlineLabel: null,
    recipientEmail: FEEDBACK_TEST_RECIPIENT,
    isTest: true,
    baseUrl: input.baseUrl,
    subject: input.subject,
    introText: input.introText,
  });

  const job = await prisma.feedbackSendJob.create({
    data: {
      campaignId: testCampaign.id,
      inviteId: invite.id,
      status: "PROCESSING",
      attempts: 1,
      claimedAt: new Date(),
    },
  });

  try {
    const result = await sendMail({
      to: FEEDBACK_TEST_RECIPIENT,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    const accepted = result.accepted.length > 0;
    await prisma.$transaction([
      prisma.feedbackSendJob.update({
        where: { id: job.id },
        data: {
          status: accepted ? "SENT" : "FAILED_PERMANENT",
          sentAt: accepted ? new Date() : null,
          messageId: result.messageId || null,
          smtpResponse: result.response || null,
          lastError: accepted ? null : "SMTP não aceitou o destinatário de teste.",
        },
      }),
      prisma.feedbackInvite.update({
        where: { id: invite.id },
        data: {
          status: accepted ? "SENT" : "FAILED",
          sentAt: accepted ? new Date() : null,
          sendCount: accepted ? 1 : 0,
          lastError: accepted ? null : "SMTP não aceitou o destinatário de teste.",
        },
      }),
      prisma.feedbackCampaign.update({
        where: { id: testCampaign.id },
        data: {
          status: accepted ? "SENT" : "READY",
          sentAt: accepted ? new Date() : null,
          authorizedAt: new Date(),
          authorizedBy: input.actor.userId,
        },
      }),
    ]);

    await logFeedbackAudit({
      campaignId: testCampaign.id,
      inviteId: invite.id,
      actor: input.actor,
      action: accepted ? "TEST_EMAIL_SENT" : "TEST_EMAIL_REJECTED",
      metadata: {
        to: FEEDBACK_TEST_RECIPIENT,
        accepted: result.accepted,
        rejected: result.rejected,
        messageId: result.messageId,
      },
    });

    return {
      campaignId: testCampaign.id,
      inviteId: invite.id,
      url,
      accepted: result.accepted,
      rejected: result.rejected,
      messageId: result.messageId,
      response: result.response,
      subject: email.subject,
      html: email.html,
      text: email.text,
    };
  } catch (error) {
    const classified = classifySmtpError(error);
    await prisma.feedbackSendJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED_PERMANENT",
        lastError: classified.message,
      },
    });
    await prisma.feedbackInvite.update({
      where: { id: invite.id },
      data: { status: "FAILED", lastError: classified.message },
    });
    await logFeedbackAudit({
      campaignId: testCampaign.id,
      inviteId: invite.id,
      actor: input.actor,
      action: "TEST_EMAIL_FAILED",
      metadata: { error: classified.message, kind: classified.kind },
    });
    throw new FeedbackServiceError(
      `Falha no envio de teste: ${classified.message}`,
      502,
    );
  }
}

/** Somente o destinatário de teste autorizado. */
export function assertTestRecipient(email: string) {
  if (!isAuthorizedTestRecipient(email)) {
    throw new FeedbackServiceError(
      `Envio de teste permitido apenas para ${FEEDBACK_TEST_RECIPIENT}.`,
      403,
    );
  }
}

/** Identificador aleatório para hashes que não podem ser adivinhados. */
export function randomHashPlaceholder(): string {
  return crypto.createHash("sha256").update(crypto.randomBytes(32)).digest("hex");
}
