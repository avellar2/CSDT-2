import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";

const { requireRoleMock } = vi.hoisted(() => ({ requireRoleMock: vi.fn() }));

vi.mock("@/utils/api-auth", () => ({
  requireRole: requireRoleMock,
  requireAuth: vi.fn(),
  AUTH_ROLES: {
    ADMIN: "ADMIN",
    TECH: "TECH",
    ADMTOTAL: "ADMTOTAL",
    ONLYREAD: "ONLYREAD",
    SCHOOL: "SCHOOL",
  },
}));

import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";

const readSrc = (relative: string) =>
  fs.readFileSync(path.join(process.cwd(), relative), "utf8");

const ADMIN_ENDPOINTS = [
  "src/pages/api/feedback/admin/overview.ts",
  "src/pages/api/feedback/admin/campaigns/index.ts",
  "src/pages/api/feedback/admin/campaigns/[id]/index.ts",
  "src/pages/api/feedback/admin/campaigns/[id]/preview.ts",
  "src/pages/api/feedback/admin/campaigns/[id]/prepare.ts",
  "src/pages/api/feedback/admin/campaigns/[id]/send.ts",
  "src/pages/api/feedback/admin/campaigns/[id]/action.ts",
  "src/pages/api/feedback/admin/test-email.ts",
  "src/pages/api/feedback/admin/queue.ts",
  "src/pages/api/feedback/admin/responses/index.ts",
  "src/pages/api/feedback/admin/responses/[id].ts",
  "src/pages/api/feedback/admin/stats.ts",
  "src/pages/api/feedback/admin/comments.ts",
  "src/pages/api/feedback/admin/export.ts",
  "src/pages/api/feedback/admin/audit.ts",
  "src/pages/api/feedback/admin/invites/[id]/reopen.ts",
  "src/pages/api/feedback/admin/schools-audit.ts",
  "src/pages/api/feedback/admin/schools/[id]/eligibility.ts",
];

describe("Controle de acesso da Pesquisa de Feedback", () => {
  beforeEach(() => {
    requireRoleMock.mockReset();
  });

  it("exige exclusivamente a role ADMTOTAL no servidor", async () => {
    requireRoleMock.mockResolvedValue({
      id: "user-1",
      profile: { role: "ADMTOTAL", displayName: "Operador" },
    });

    const req = {} as never;
    const res = {} as never;
    const actor = await requireFeedbackAdmin(req, res);

    expect(requireRoleMock).toHaveBeenCalledTimes(1);
    expect(requireRoleMock.mock.calls[0][2]).toEqual(["ADMTOTAL"]);
    expect(actor).toEqual({ userId: "user-1", name: "Operador", role: "ADMTOTAL" });
  });

  it("retorna null quando a role não é autorizada", async () => {
    requireRoleMock.mockResolvedValue(null);
    const actor = await requireFeedbackAdmin({} as never, {} as never);
    expect(actor).toBeNull();
  });

  it("todas as APIs administrativas exigem requireFeedbackAdmin", () => {
    for (const file of ADMIN_ENDPOINTS) {
      const source = readSrc(file);
      expect(source, file).toContain("requireFeedbackAdmin");
      expect(source, file).not.toContain("requireAuth(");
    }
  });

  it("a API pública não importa autenticação nem expõe dados administrativos", () => {
    const source = readSrc("src/pages/api/feedback/public/[token].ts");
    expect(source).not.toContain("requireAuth");
    expect(source).not.toContain("requireRole");
    expect(source).not.toContain("prisma");
    expect(source).not.toContain("respondentName");
  });

  it("a página administrativa bloqueia não-ADMTOTAL no cliente", () => {
    const source = readSrc("src/pages/admin/feedback.tsx");
    expect(source).toContain('data.role === "ADMTOTAL"');
    expect(source).toContain("Acesso restrito");
  });

  it("o item de menu é exibido apenas para ADMTOTAL", () => {
    const header = readSrc("src/components/Header.tsx");
    const index = header.indexOf("admin-feedback");
    expect(index).toBeGreaterThan(-1);
    const block = header.slice(index, index + 300);
    expect(block).toContain("roles: ['ADMTOTAL']");
    expect(block).toContain("path: '/admin/feedback'");
  });

  it("o endpoint genérico de e-mail só aceita operadores autenticados", () => {
    const source = readSrc("src/pages/api/send-email.ts");
    const methodGuardIndex = source.indexOf('req.method !== "POST"');
    const authIndex = source.indexOf("await requireRole");
    const sendIndex = source.indexOf("await sendMail(");

    expect(methodGuardIndex).toBeGreaterThan(-1);
    expect(authIndex).toBeGreaterThan(methodGuardIndex);
    expect(sendIndex).toBeGreaterThan(authIndex);
    expect(source).toContain("ADMIN");
    expect(source).toContain("ADMTOTAL");
    expect(source).toContain("TECH");
    // Não aceita remetente vindo do corpo.
    expect(source).not.toContain("from: req.body");
    expect(source).not.toContain("req.body.from");
  });
});
