import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import {
  buildCampaignIndicators,
  selectActiveOfficialCampaign,
  type CampaignLike,
} from "@/utils/feedback/adminQueries";

const readSrc = (relative: string) =>
  fs.readFileSync(path.join(process.cwd(), relative), "utf8");

const campaign = (
  id: number,
  overrides: Partial<CampaignLike> = {},
): CampaignLike => ({
  id,
  name: `Campanha ${id}`,
  status: "SENT",
  channel: "OFFICIAL",
  createdAt: new Date(`2026-11-${String(id).padStart(2, "0")}T12:00:00Z`),
  ...overrides,
});

describe("Card da Pesquisa de Feedback no Dashboard", () => {
  it("existe um card exclusivo ADMTOTAL apontando para /admin/feedback", () => {
    const dash = readSrc("src/components/Dashboard.tsx");
    expect(dash).toContain("id: 'feedback-survey'");
    expect(dash).toContain("title: 'Pesquisa de Feedback'");
    expect(dash).toContain("path: '/admin/feedback'");
    expect(dash).toContain("category: 'Administração'");
    expect(dash).toContain("roles: ['ADMTOTAL']");
    expect(dash).toContain("FeedbackSurveyCard");
    expect(dash).toContain("'Administração': ['register-users', 'feedback-survey']");
  });

  it("o componente consulta a API autenticada e revalida a cada 60s", () => {
    const card = readSrc("src/components/Feedback/FeedbackSurveyCard.tsx");
    expect(card).toContain("/api/feedback/admin/overview");
    expect(card).toContain("refreshInterval: 60_000");
    expect(card).toContain("revalidateOnFocus: false");
    expect(card).toContain("dedupingInterval: 30_000");
    expect(card).toContain("getAuthHeadersNoContentType");
  });

  it("não afirma entrega confirmada", () => {
    const card = readSrc("src/components/Feedback/FeedbackSurveyCard.tsx");
    expect(card).toContain("aceitos pelo SMTP");
    expect(card).toContain("entrega na caixa de entrada não é");
  });

  it("a API de overview exclui campanhas TEST do snapshot", () => {
    const queries = readSrc("src/utils/feedback/adminQueries.ts");
    const snapshotBlock = queries.slice(
      queries.indexOf("export async function getFeedbackDashboardSnapshot"),
      queries.indexOf("export async function markFeedbackResponsesViewed"),
    );
    expect(snapshotBlock).toContain('channel: "OFFICIAL"');
    expect(snapshotBlock).not.toContain('channel: "TEST"');
    expect(snapshotBlock).toContain("selectActiveOfficialCampaign");
  });

  it("o painel marca respostas como vistas apenas para ADMTOTAL na aba Respostas", () => {
    const page = readSrc("src/pages/admin/feedback.tsx");
    expect(page).toContain("/api/feedback/admin/mark-viewed");
    expect(page).toContain('status !== "allowed" || tab !== "responses"');
    const endpoint = readSrc("src/pages/api/feedback/admin/mark-viewed.ts");
    expect(endpoint).toContain("requireFeedbackAdmin");
  });

  it("seleciona a campanha oficial ativa mais recente e ignora TEST", () => {
    const selected = selectActiveOfficialCampaign([
      campaign(1, { status: "SENT" }),
      campaign(10, { status: "SENDING" }),
      campaign(20, { status: "SENDING", createdAt: new Date("2026-11-25T12:00:00Z") }),
      campaign(30, { channel: "TEST", status: "SENDING" }),
    ]);
    expect(selected?.id).toBe(20);
  });

  it("sem campanha em envio, usa a oficial mais recente", () => {
    const selected = selectActiveOfficialCampaign([
      campaign(1, { status: "SENT" }),
      campaign(15, { status: "CLOSED" }),
      campaign(40, { channel: "TEST", status: "SENDING" }),
    ]);
    expect(selected?.id).toBe(15);
  });

  it("retorna null quando só há campanhas TEST", () => {
    expect(
      selectActiveOfficialCampaign([
        campaign(1, { channel: "TEST" }),
        campaign(2, { channel: "TEST", status: "SENDING" }),
      ]),
    ).toBeNull();
  });

  it("calcula indicadores sem contar TEST e sem alegar entrega", () => {
    const indicators = buildCampaignIndicators({
      invitesByStatus: {
        PENDING: 0,
        SENT: 80,
        ANSWERED: 40,
        FAILED: 2,
        EXCLUDED: 3,
      },
      responses: 40,
    });

    expect(indicators.invitationsTotal).toBe(125);
    expect(indicators.invitationsSent).toBe(120);
    expect(indicators.invitationsFailed).toBe(2);
    expect(indicators.responses).toBe(40);
    expect(indicators.pendingResponses).toBe(85);
    expect(indicators.participationPercent).toBe(32);
  });

  it("participação é zero quando não há convites", () => {
    expect(
      buildCampaignIndicators({ invitesByStatus: {}, responses: 0 }),
    ).toMatchObject({
      invitationsTotal: 0,
      invitationsSent: 0,
      pendingResponses: 0,
      participationPercent: 0,
    });
  });
});
