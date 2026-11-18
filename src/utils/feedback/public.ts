import { Prisma } from "@prisma/client";
import prisma from "@/utils/prisma";
import { FEEDBACK_QUESTIONNAIRE } from "./questionnaire";
import { hashFeedbackToken, hashRequestMetadata, isPlausibleFeedbackToken } from "./tokens";
import { validateFeedbackSubmission, type FeedbackSubmissionPayload } from "./validation";

export type PublicInviteState =
  | "available"
  | "answered"
  | "expired"
  | "closed"
  | "invalid";

export interface PublicInviteView {
  state: PublicInviteState;
  campaign: {
    name: string;
    deadline: string | null;
  } | null;
  school: { name: string } | null;
  questionnaire: typeof FEEDBACK_QUESTIONNAIRE | null;
}

export interface SubmitContext {
  ip?: string;
  userAgent?: string;
}

export type LoadedInvite = Prisma.FeedbackInviteGetPayload<{
  include: { School: { select: { name: true } }; Campaign: true };
}> & { FeedbackResponse: { id: number } | null };

/**
 * Resolve o convite exclusivamente pelo hash do token. O token não carrega
 * IDs: não é possível trocar a escola alterando a URL.
 */
export async function loadPublicInvite(
  token: string,
): Promise<{ invite: LoadedInvite | null; state: PublicInviteState }> {
  if (!isPlausibleFeedbackToken(token)) {
    return { invite: null, state: "invalid" as PublicInviteState };
  }

  const invite = await prisma.feedbackInvite.findUnique({
    where: { tokenHash: hashFeedbackToken(token) },
    include: {
      School: { select: { name: true } },
      Campaign: true,
    },
  });

  if (!invite) return { invite: null, state: "invalid" };

  const response = await prisma.feedbackResponse.findUnique({
    where: { inviteId: invite.id },
    select: { id: true },
  });

  if (response) {
    return { invite: { ...invite, FeedbackResponse: response }, state: "answered" };
  }

  if (invite.Campaign.status === "CLOSED") {
    return { invite: { ...invite, FeedbackResponse: null }, state: "closed" };
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    if (invite.status !== "EXPIRED") {
      await prisma.feedbackInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
    }
    return { invite: { ...invite, FeedbackResponse: null }, state: "expired" };
  }

  if (invite.status === "EXPIRED") {
    return { invite: { ...invite, FeedbackResponse: null }, state: "expired" };
  }

  if (invite.status === "FAILED" || invite.status === "EXCLUDED") {
    return { invite: { ...invite, FeedbackResponse: null }, state: "invalid" };
  }

  return {
    invite: { ...invite, FeedbackResponse: null },
    state: "available",
  };
}

export async function getPublicInviteView(
  token: string,
): Promise<PublicInviteView> {
  const { invite, state } = await loadPublicInvite(token);

  if (!invite) {
    return { state, campaign: null, school: null, questionnaire: null };
  }

  const isUsable = state === "available";
  return {
    state,
    campaign: {
      name: invite.Campaign.name,
      deadline: invite.Campaign.deadline
        ? invite.Campaign.deadline.toISOString()
        : null,
    },
    school: { name: invite.School.name },
    questionnaire: isUsable ? FEEDBACK_QUESTIONNAIRE : null,
  };
}

export type SubmitResult =
  | { ok: true; responseId: number }
  | { ok: false; status: number; errors: string[] };

/**
 * Grava a resposta de forma atômica. A restrição UNIQUE(FeedbackResponse.inviteId)
 * garante uma única resposta por escola/campanha mesmo com duplo clique,
 * refresh ou requisições concorrentes.
 */
export async function submitFeedbackResponse(
  token: string,
  payload: FeedbackSubmissionPayload,
  context: SubmitContext = {},
): Promise<SubmitResult> {
  const { invite, state } = await loadPublicInvite(token);

  if (!invite) {
    return { ok: false, status: 404, errors: ["Link inválido."] };
  }
  if (state === "answered") {
    return {
      ok: false,
      status: 409,
      errors: ["Esta pesquisa já foi respondida para esta unidade escolar."],
    };
  }
  if (state === "expired") {
    return { ok: false, status: 410, errors: ["Este link expirou."] };
  }
  if (state === "closed") {
    return {
      ok: false,
      status: 410,
      errors: ["Esta campanha foi encerrada."],
    };
  }
  if (state === "invalid") {
    return { ok: false, status: 404, errors: ["Link inválido."] };
  }

  const validation = validateFeedbackSubmission(payload);
  if (!validation.ok) {
    return { ok: false, status: 422, errors: validation.errors };
  }

  try {
    const response = await prisma.$transaction(async (tx) => {
      const created = await tx.feedbackResponse.create({
        data: {
          campaignId: invite.campaignId,
          inviteId: invite.id,
          schoolId: invite.schoolId,
          channel: invite.Campaign.channel,
          respondentName: validation.respondent.name,
          respondentRegistration: validation.respondent.registration,
          respondentRole: validation.respondent.role,
          ipHash: hashRequestMetadata(context.ip),
          userAgentHash: hashRequestMetadata(context.userAgent),
          Answer: {
            create: validation.answers.map((answer) => ({
              questionKey: answer.questionKey,
              kind: answer.kind,
              optionKeys: answer.optionKeys,
              optionLabels: answer.optionLabels,
              textValue: answer.textValue,
              otherText: answer.otherText,
            })),
          },
        },
        select: { id: true },
      });

      await tx.feedbackInvite.update({
        where: { id: invite.id },
        data: { status: "ANSWERED", answeredAt: new Date() },
      });

      return created;
    });

    return { ok: true, responseId: response.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        status: 409,
        errors: ["Esta pesquisa já foi respondida para esta unidade escolar."],
      };
    }
    throw error;
  }
}
