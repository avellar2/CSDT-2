import prisma from "@/utils/prisma";
import { computeAllDistributions, type FeedbackAnswerRow } from "./stats";
import type { ExportResponseRow } from "./csv";

export type ResponseChannel = "OFFICIAL" | "TEST";

export interface ResponseFilters {
  campaignId?: number;
  district?: string;
  schoolQuery?: string;
  includeTest?: boolean;
  /** Filtro explícito de canal; tem precedência sobre includeTest. */
  channel?: ResponseChannel;
  page?: number;
  pageSize?: number;
}

/**
 * Filtro compartilhado entre a listagem e a exportação CSV, garantindo que
 * ambos respeitem exatamente os mesmos critérios.
 *
 * Sem `channel` e sem `includeTest`, o padrão seguro é somente OFFICIAL.
 */
export function buildResponseWhere(filters: ResponseFilters) {
  const channelCondition =
    filters.channel === "OFFICIAL" || filters.channel === "TEST"
      ? { channel: filters.channel }
      : filters.includeTest
        ? {}
        : { channel: "OFFICIAL" as const };

  return {
    ...channelCondition,
    ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    ...(filters.district || filters.schoolQuery
      ? {
          School: {
            ...(filters.district ? { district: filters.district } : {}),
            ...(filters.schoolQuery
              ? {
                  name: {
                    contains: filters.schoolQuery,
                    mode: "insensitive" as const,
                  },
                }
              : {}),
          },
        }
      : {}),
  };
}

export interface InviteFilters {
  campaignId?: number;
  status?: string;
  district?: string;
  schoolQuery?: string;
  page?: number;
  pageSize?: number;
}

function clampPage(page?: number, pageSize?: number) {
  const safePage = Number.isFinite(page) && (page as number) > 0 ? (page as number) : 1;
  const safeSize = Math.min(Math.max(pageSize ?? 25, 1), 200);
  return { page: safePage, size: safeSize, skip: (safePage - 1) * safeSize };
}

export async function listCampaignSummaries() {
  const campaigns = await prisma.feedbackCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  if (campaigns.length === 0) return [];

  const ids = campaigns.map((campaign) => campaign.id);

  const [inviteGroups, jobGroups, responseGroups] = await Promise.all([
    prisma.feedbackInvite.groupBy({
      by: ["campaignId", "status"],
      where: { campaignId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.feedbackSendJob.groupBy({
      by: ["campaignId", "status"],
      where: { campaignId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.feedbackResponse.groupBy({
      by: ["campaignId"],
      where: { campaignId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  return campaigns.map((campaign) => {
    const invites = inviteGroups.filter((group) => group.campaignId === campaign.id);
    const jobs = jobGroups.filter((group) => group.campaignId === campaign.id);
    const countInvites = (statuses: string[]) =>
      invites
        .filter((group) => statuses.includes(group.status))
        .reduce((acc, group) => acc + group._count._all, 0);
    const countJobs = (statuses: string[]) =>
      jobs
        .filter((group) => statuses.includes(group.status))
        .reduce((acc, group) => acc + group._count._all, 0);

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      channel: campaign.channel,
      subject: campaign.subject,
      deadline: campaign.deadline,
      createdAt: campaign.createdAt,
      sentAt: campaign.sentAt,
      preparedAt: campaign.preparedAt,
      authorizedAt: campaign.authorizedAt,
      totalInvites: invites.reduce((acc, group) => acc + group._count._all, 0),
      invitesSent: countInvites(["SENT", "ANSWERED"]),
      invitesFailed: countInvites(["FAILED"]),
      invitesPending: countInvites(["PENDING", "QUEUED", "SENDING"]),
      jobsPending: countJobs(["PENDING", "PROCESSING"]),
      jobsTemporaryFailure: countJobs(["FAILED_TEMPORARY"]),
      jobsPermanentFailure: countJobs(["FAILED_PERMANENT"]),
      responses:
        responseGroups.find((group) => group.campaignId === campaign.id)?._count
          ._all ?? 0,
    };
  });
}

export async function getCampaignDetail(campaignId: number) {
  const campaign = await prisma.feedbackCampaign.findUnique({
    where: { id: campaignId },
    include: {
      QuestionnaireVersion: {
        select: { version: true, questionCount: true, title: true },
      },
    },
  });
  if (!campaign) return null;

  const [inviteGroups, jobGroups, responseCount, inviteTotal, ccGroups] =
    await Promise.all([
      prisma.feedbackInvite.groupBy({
        by: ["status"],
        where: { campaignId },
        _count: { _all: true },
      }),
      prisma.feedbackSendJob.groupBy({
        by: ["status"],
        where: { campaignId },
        _count: { _all: true },
      }),
      prisma.feedbackResponse.count({
        where: { campaignId, channel: "OFFICIAL" },
      }),
      prisma.feedbackInvite.count({ where: { campaignId } }),
      prisma.feedbackSendJob.groupBy({
        by: ["ccStatus"],
        where: { campaignId },
        _count: { _all: true },
      }),
    ]);

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      channel: campaign.channel,
      subject: campaign.subject,
      introText: campaign.introText,
      deadline: campaign.deadline,
      createdAt: campaign.createdAt,
      preparedAt: campaign.preparedAt,
      authorizedAt: campaign.authorizedAt,
      authorizedBy: campaign.authorizedBy,
      sentAt: campaign.sentAt,
      pausedAt: campaign.pausedAt,
      closedAt: campaign.closedAt,
      createdBy: campaign.createdBy,
      createdByName: campaign.createdByName,
      questionnaireVersion: campaign.QuestionnaireVersion,
    },
    counts: {
      invitesTotal: inviteTotal,
      invitesByStatus: Object.fromEntries(
        inviteGroups.map((group) => [group.status, group._count._all]),
      ),
      jobsByStatus: Object.fromEntries(
        jobGroups.map((group) => [group.status, group._count._all]),
      ),
      jobsByCcStatus: Object.fromEntries(
        ccGroups
          .filter((group) => group.ccStatus != null)
          .map((group) => [group.ccStatus as string, group._count._all]),
      ),
      responses: responseCount,
    },
  };
}

export async function listInvites(filters: InviteFilters) {
  const { page, size, skip } = clampPage(filters.page, filters.pageSize);

  const where = {
    ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.district ? { School: { district: filters.district } } : {}),
    ...(filters.schoolQuery
      ? {
          School: {
            ...(filters.district ? { district: filters.district } : {}),
            name: { contains: filters.schoolQuery, mode: "insensitive" as const },
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.feedbackInvite.count({ where }),
    prisma.feedbackInvite.findMany({
      where,
      orderBy: [{ status: "asc" }, { schoolId: "asc" }],
      skip,
      take: size,
      select: {
        id: true,
        schoolId: true,
        recipientEmail: true,
        status: true,
        attempts: true,
        sendCount: true,
        lastError: true,
        sentAt: true,
        answeredAt: true,
        expiresAt: true,
        isPrimaryForEmail: true,
        School: { select: { name: true, district: true } },
        Campaign: { select: { id: true, name: true, channel: true } },
      },
    }),
  ]);

  return { page, pageSize: size, total, rows };
}

export async function listResponses(filters: ResponseFilters) {
  const { page, size, skip } = clampPage(filters.page, filters.pageSize);
  const where = buildResponseWhere(filters);

  const [total, rows] = await Promise.all([
    prisma.feedbackResponse.count({ where }),
    prisma.feedbackResponse.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip,
      take: size,
      select: {
        id: true,
        respondentName: true,
        respondentRegistration: true,
        respondentRole: true,
        submittedAt: true,
        channel: true,
        schoolId: true,
        School: { select: { name: true, district: true } },
        Campaign: { select: { id: true, name: true, channel: true } },
        Invite: { select: { sentAt: true, recipientEmail: true } },
      },
    }),
  ]);

  return { page, pageSize: size, total, rows };
}

export async function getResponseDetail(responseId: number) {
  const response = await prisma.feedbackResponse.findUnique({
    where: { id: responseId },
    include: {
      School: { select: { name: true, district: true } },
      Campaign: { select: { id: true, name: true, channel: true } },
      Invite: { select: { sentAt: true, recipientEmail: true } },
      Answer: {
        select: {
          questionKey: true,
          kind: true,
          optionKeys: true,
          optionLabels: true,
          textValue: true,
          otherText: true,
        },
      },
    },
  });
  if (!response) return null;

  return {
    id: response.id,
    school: response.School,
    campaign: response.Campaign,
    sentAt: response.Invite?.sentAt ?? null,
    recipientEmail: response.Invite?.recipientEmail ?? null,
    submittedAt: response.submittedAt,
    channel: response.channel,
    respondent: {
      name: response.respondentName,
      registration: response.respondentRegistration,
      role: response.respondentRole,
    },
    answers: response.Answer,
  };
}

/**
 * Estatísticas oficiais. Respostas de campanhas TEST são excluídas por padrão.
 */
export async function computeStats(options?: {
  campaignId?: number;
  includeTest?: boolean;
  district?: string;
}) {
  const where = {
    ...(options?.campaignId ? { campaignId: options.campaignId } : {}),
    ...(!options?.includeTest ? { channel: "OFFICIAL" as const } : {}),
    ...(options?.district ? { School: { district: options.district } } : {}),
  };

  const responses = await prisma.feedbackResponse.findMany({
    where,
    select: {
      id: true,
      Answer: {
        select: {
          questionKey: true,
          kind: true,
          optionKeys: true,
          optionLabels: true,
          textValue: true,
          otherText: true,
        },
      },
    },
  });

  const total = responses.length;
  const allAnswers = responses.flatMap((response) =>
    response.Answer.map((answer) => ({
      ...answer,
      kind: answer.kind as FeedbackAnswerRow["kind"],
    })),
  );

  return {
    totalResponses: total,
    note:
      "A pergunta 10 usa faixas de nota. Os resultados são exibidos por faixa; não há média numérica nem NPS.",
    questions: computeAllDistributions(allAnswers, total),
    participation: await computeParticipation(options),
  };
}

export async function computeParticipation(options?: {
  campaignId?: number;
  includeTest?: boolean;
}) {
  const campaignWhere = options?.campaignId
    ? { id: options.campaignId }
    : options?.includeTest
      ? {}
      : { channel: "OFFICIAL" as const };

  const campaigns = await prisma.feedbackCampaign.findMany({
    where: campaignWhere,
    select: { id: true, status: true, channel: true },
  });
  const ids = campaigns.map((campaign) => campaign.id);

  const [inviteGroups, responses] = await Promise.all([
    prisma.feedbackInvite.groupBy({
      by: ["campaignId", "status"],
      where: { campaignId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.feedbackResponse.groupBy({
      by: ["campaignId"],
      where: { campaignId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  const invitesTotal = inviteGroups.reduce((acc, group) => acc + group._count._all, 0);
  const sent = inviteGroups
    .filter((group) => ["SENT", "ANSWERED"].includes(group.status))
    .reduce((acc, group) => acc + group._count._all, 0);
  const failed = inviteGroups
    .filter((group) => group.status === "FAILED")
    .reduce((acc, group) => acc + group._count._all, 0);
  const answered = responses.reduce((acc, group) => acc + group._count._all, 0);

  return {
    campaigns: campaigns.length,
    campaignsSending: campaigns.filter((campaign) => campaign.status === "SENDING").length,
    invitationsTotal: invitesTotal,
    invitationsSent: sent,
    invitationsFailed: failed,
    responses: answered,
    pendingResponses: Math.max(0, invitesTotal - answered),
    participationPercent:
      invitesTotal > 0
        ? Math.round((answered / invitesTotal) * 1000) / 10
        : 0,
  };
}

export interface CommentFilters {
  campaignId?: number;
  district?: string;
  schoolQuery?: string;
  textQuery?: string;
  questionKey?: "q14" | "q16";
  includeTest?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listComments(filters: CommentFilters) {
  const { page, size, skip } = clampPage(filters.page, filters.pageSize);

  const where = {
    textValue: { not: null },
    questionKey: filters.questionKey
      ? filters.questionKey
      : { in: ["q14", "q16"] },
    Response: {
      ...(!filters.includeTest ? { channel: "OFFICIAL" as const } : {}),
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
      ...(filters.district || filters.schoolQuery
        ? {
            School: {
              ...(filters.district ? { district: filters.district } : {}),
              ...(filters.schoolQuery
                ? {
                    name: {
                      contains: filters.schoolQuery,
                      mode: "insensitive" as const,
                    },
                  }
                : {}),
            },
          }
        : {}),
    },
    ...(filters.textQuery
      ? { textValue: { contains: filters.textQuery, mode: "insensitive" as const } }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.feedbackAnswer.count({ where }),
    prisma.feedbackAnswer.findMany({
      where,
      orderBy: { id: "desc" },
      skip,
      take: size,
      select: {
        id: true,
        questionKey: true,
        textValue: true,
        Response: {
          select: {
            id: true,
            submittedAt: true,
            respondentName: true,
            School: { select: { name: true, district: true } },
            Campaign: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  return { page, pageSize: size, total, rows };
}

export async function loadExportRows(
  filters: ResponseFilters,
): Promise<ExportResponseRow[]> {
  const where = buildResponseWhere(filters);

  const responses = await prisma.feedbackResponse.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    select: {
      respondentName: true,
      respondentRegistration: true,
      respondentRole: true,
      submittedAt: true,
      School: { select: { name: true, district: true } },
      Campaign: { select: { name: true } },
      Invite: { select: { sentAt: true } },
      Answer: {
        select: {
          questionKey: true,
          optionLabels: true,
          textValue: true,
          otherText: true,
        },
      },
    },
  });

  return responses.map((response) => ({
    campaignName: response.Campaign.name,
    schoolName: response.School.name,
    district: response.School.district,
    sentAt: response.Invite?.sentAt ?? null,
    submittedAt: response.submittedAt,
    respondentName: response.respondentName,
    respondentRegistration: response.respondentRegistration,
    respondentRole: response.respondentRole,
    answers: response.Answer,
  }));
}

export async function listDistricts(): Promise<string[]> {
  const districts = await prisma.school.findMany({
    where: { district: { not: null } },
    select: { district: true },
    distinct: ["district"],
    orderBy: { district: "asc" },
  });
  return districts
    .map((row) => row.district)
    .filter((value): value is string => Boolean(value && value.trim()));
}

export interface CampaignLike {
  id: number;
  name: string;
  status: string;
  channel: string;
  createdAt: Date | string;
}

/**
 * Campanha exibida no card do Dashboard:
 * 1) oficial em envio/pausada (a mais recente);
 * 2) se não houver, a campanha oficial mais recente.
 * Campanhas TEST são sempre ignoradas.
 */
export function selectActiveOfficialCampaign<T extends CampaignLike>(
  campaigns: T[],
): T | null {
  const official = campaigns.filter((campaign) => campaign.channel === "OFFICIAL");
  if (official.length === 0) return null;

  const inProgress = official.filter((campaign) =>
    ["SENDING", "PAUSED"].includes(campaign.status),
  );
  const pool = inProgress.length > 0 ? inProgress : official;

  return [...pool].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0] ?? null;
}

export interface CampaignIndicators {
  invitationsTotal: number;
  invitationsSent: number;
  invitationsFailed: number;
  responses: number;
  pendingResponses: number;
  participationPercent: number;
}

/**
 * Indicadores de uma campanha. `invitationsSent` significa "aceito pelo SMTP"
 * (estado SENT/ANSWERED), nunca entrega confirmada na caixa de entrada.
 */
export function buildCampaignIndicators(input: {
  invitesByStatus: Record<string, number>;
  responses: number;
}): CampaignIndicators {
  const invitationsTotal = Object.values(input.invitesByStatus).reduce(
    (acc, value) => acc + value,
    0,
  );
  const invitationsSent =
    (input.invitesByStatus.SENT ?? 0) + (input.invitesByStatus.ANSWERED ?? 0);
  const invitationsFailed = input.invitesByStatus.FAILED ?? 0;
  const responses = input.responses;

  return {
    invitationsTotal,
    invitationsSent,
    invitationsFailed,
    responses,
    pendingResponses: Math.max(0, invitationsTotal - responses),
    participationPercent:
      invitationsTotal > 0
        ? Math.round((responses / invitationsTotal) * 1000) / 10
        : 0,
  };
}

export interface FeedbackDashboardSnapshot {
  activeCampaign:
    | (CampaignIndicators & {
        id: number;
        name: string;
        status: string;
        createdAt: string;
        newResponses: number;
      })
    | null;
  hasOfficialCampaigns: boolean;
  newResponses: number;
  lastSeenAt: string | null;
}

/**
 * Snapshot enxuto para o card do Dashboard. Exclui campanhas TEST de todas as
 * contagens e calcula "respostas novas" desde a última visualização do
 * operador (controle persistente por usuário).
 */
export async function getFeedbackDashboardSnapshot(
  userId: string,
): Promise<FeedbackDashboardSnapshot> {
  const [campaigns, adminView] = await Promise.all([
    prisma.feedbackCampaign.findMany({
      where: { channel: "OFFICIAL" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        channel: true,
        createdAt: true,
      },
    }),
    prisma.feedbackAdminView.findUnique({ where: { userId } }),
  ]);

  const activeCampaign = selectActiveOfficialCampaign(campaigns);
  const lastSeenAt = adminView?.lastSeenAt ?? null;

  const newResponsesWhere = {
    channel: "OFFICIAL" as const,
    ...(lastSeenAt ? { submittedAt: { gt: lastSeenAt } } : {}),
  };

  const [newResponses, activeInviteGroups, activeResponses, activeNewResponses] =
    await Promise.all([
      prisma.feedbackResponse.count({ where: newResponsesWhere }),
      activeCampaign
        ? prisma.feedbackInvite.groupBy({
            by: ["status"],
            where: { campaignId: activeCampaign.id },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      activeCampaign
        ? prisma.feedbackResponse.count({
            where: { campaignId: activeCampaign.id, channel: "OFFICIAL" },
          })
        : Promise.resolve(0),
      activeCampaign
        ? prisma.feedbackResponse.count({
            where: {
              campaignId: activeCampaign.id,
              channel: "OFFICIAL",
              ...(lastSeenAt ? { submittedAt: { gt: lastSeenAt } } : {}),
            },
          })
        : Promise.resolve(0),
    ]);

  const indicators = buildCampaignIndicators({
    invitesByStatus: Object.fromEntries(
      activeInviteGroups.map((group) => [group.status, group._count._all]),
    ),
    responses: activeResponses,
  });

  return {
    activeCampaign: activeCampaign
      ? {
          id: activeCampaign.id,
          name: activeCampaign.name,
          status: activeCampaign.status,
          createdAt: new Date(activeCampaign.createdAt).toISOString(),
          ...indicators,
          newResponses: activeNewResponses,
        }
      : null,
    hasOfficialCampaigns: campaigns.length > 0,
    newResponses,
    lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
  };
}

/** Marca a lista de respostas como visualizada agora, para este operador. */
export async function markFeedbackResponsesViewed(userId: string) {
  const now = new Date();
  const view = await prisma.feedbackAdminView.upsert({
    where: { userId },
    create: { userId, lastSeenAt: now },
    update: { lastSeenAt: now },
    select: { lastSeenAt: true },
  });
  return view.lastSeenAt;
}
