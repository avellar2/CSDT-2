import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireFeedbackAdmin, requestBaseUrl } from "@/utils/feedback/adminAuth";
import { getRecipientPlan } from "@/utils/feedback/service";
import {
  buildFeedbackInviteEmail,
  formatDeadlineLabel,
} from "@/utils/feedback/email";
import { summarizeRecipientPlan } from "@/utils/feedback/recipients";
import { decryptFeedbackToken } from "@/utils/feedback/tokens";
import {
  FEEDBACK_INSTITUTIONAL_CONTACT,
  FEEDBACK_OFFICIAL_CC,
  feedbackAppBaseUrl,
  feedbackSurveyPath,
  isOfficialBaseUrlValid,
} from "@/utils/feedback/config";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const actor = await requireFeedbackAdmin(req, res);
  if (!actor) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const campaignId = Number(req.query.id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return res.status(400).json({ error: "Campanha inválida." });
  }

  try {
    const campaign = await prisma.feedbackCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) return res.status(404).json({ error: "Campanha não encontrada." });

    const plan = await getRecipientPlan();

    // Campanhas oficiais usam exclusivamente a URL canônica de produção
    // (a mesma que o worker usará). TESTEs usam a URL real da requisição.
    const isOfficial = campaign.channel === "OFFICIAL";
    const officialBaseUrl = feedbackAppBaseUrl();
    const officialUrlCheck = isOfficialBaseUrlValid(officialBaseUrl);
    const baseUrl = isOfficial ? officialBaseUrl : requestBaseUrl(req);

    // Se a campanha já foi preparada, usa um link real (primeiro convite) para
    // que a pré-visualização seja fiel. Caso contrário, usa um token de exemplo.
    const firstInvite = await prisma.feedbackInvite.findFirst({
      where: { campaignId, isPrimaryForEmail: true },
      include: { School: { select: { name: true } } },
      orderBy: { id: "asc" },
    });

    const rawToken = firstInvite?.tokenCipher
      ? decryptFeedbackToken(firstInvite.tokenCipher)
      : null;
    const sampleToken = rawToken || "TOKEN_DE_EXEMPLO_SERA_GERADO_NO_ENVIO";
    const firstGroup = plan.groups[0];

    const preview = buildFeedbackInviteEmail({
      schoolLinks: firstGroup
        ? firstGroup.schools.map((school) => ({
            schoolName: school.name,
            url: `${baseUrl}${feedbackSurveyPath(sampleToken)}`,
          }))
        : [{ schoolName: "Unidade escolar de exemplo", url: `${baseUrl}${feedbackSurveyPath(sampleToken)}` }],
      deadlineLabel: formatDeadlineLabel(campaign.deadline),
      recipientEmail: firstGroup?.email ?? null,
      isTest: campaign.channel === "TEST",
      baseUrl,
      subject: campaign.subject,
      introText: campaign.introText ?? undefined,
    });

    return res.status(200).json({
      summary: summarizeRecipientPlan(plan),
      plan: {
        /** Unidades escolares que receberão convite (com e-mail válido). */
        includedSchools: plan.groups.flatMap((group) =>
          group.schools.map((school) => ({
            id: school.id,
            name: school.name,
            district: school.district ?? null,
            email: school.email,
            sharedEmail: group.schools.length > 1,
          })),
        ),
        /** Todos os registros que NÃO receberão convite, com motivo. */
        excludedSchools: plan.excludedSchools.map((school) => ({
          id: school.id,
          name: school.name,
          email: school.email,
          district: school.district,
          type: school.type,
          reason: school.reason,
          emailIssue: school.emailIssue,
        })),
        duplicateGroups: plan.duplicateGroups.map((group) => ({
          email: group.email,
          schools: group.schools.map((school) => school.name),
        })),
        totalMessages: plan.totalMessages,
      },
      preview,
      alreadyPrepared: Boolean(firstInvite),
      previewSchool: firstInvite?.School.name ?? null,
      delivery: {
        to: isOfficial ? "e-mail da unidade escolar" : "destinatário de teste autorizado",
        cc: FEEDBACK_OFFICIAL_CC,
        replyTo: FEEDBACK_INSTITUTIONAL_CONTACT,
        linkBaseUrl: baseUrl,
        officialBaseUrl,
        officialBaseUrlValid: officialUrlCheck.ok,
        officialBaseUrlError: officialUrlCheck.reason ?? null,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar pré-visualização:", error);
    return res.status(500).json({ error: "Erro ao gerar pré-visualização." });
  }
}
