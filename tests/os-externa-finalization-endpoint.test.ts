import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O estado de finalização não pode ser marcado como concluído sem as etapas
 * obrigatórias, mesmo que o cliente (ou uma chamada manual) tente.
 */

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profileFindUnique: vi.fn(),
  osFindUnique: vi.fn(),
  authorize: vi.fn(),
  saveState: vi.fn(),
  loadChamados: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: { getUser: mocks.getUser } },
}));

vi.mock("@/utils/prisma", () => ({
  default: {
    profile: { findUnique: mocks.profileFindUnique },
    oSExterna: { findUnique: mocks.osFindUnique },
  },
}));

vi.mock("@/utils/osExternaAuthorization", () => ({
  authorizeOsExterna: mocks.authorize,
}));

vi.mock("@/utils/osExternaFinalizationState", () => ({
  saveOsExternaFinalizationState: mocks.saveState,
  loadOsWithReagendamentoChamado: mocks.loadChamados,
}));

import handler from "@/pages/api/os-externa-finalization";

function makeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
    setHeader() {
      return res;
    },
  };
  return res;
}

function makeReq(body: unknown) {
  return {
    method: "POST",
    body,
    query: {},
    headers: { authorization: "Bearer tok" },
  } as any;
}

function loginAs(role = "TECH") {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "tech@example.com" } },
    error: null,
  });
  mocks.profileFindUnique.mockResolvedValue({
    id: 10,
    role,
    displayName: "Tecnico Teste",
    schoolId: null,
  });
}

const baseOs = {
  id: 77,
  numeroOs: "77/2026",
  status: "Pendente",
  routeId: null,
  data: "2026-11-27",
  createdAt: new Date(),
  tecnicoResponsavel: "Tecnico Teste",
  assinado: null as string | null,
  lastEmailSent: null as Date | null,
  solucionado: "Sim",
};

beforeEach(() => {
  vi.clearAllMocks();
  loginAs("TECH");
  mocks.authorize.mockResolvedValue({ allowed: true, reason: "responsible" });
  mocks.saveState.mockResolvedValue(true);
  mocks.loadChamados.mockResolvedValue(new Set<string>());
});

describe("POST /api/os-externa-finalization — conclusão validada no servidor", () => {
  it("não marca 'aguardando-assinatura' sem token", async () => {
    mocks.osFindUnique.mockResolvedValue(baseOs);
    const res = makeRes();

    await handler(
      makeReq({ numeroOs: "77/2026", stage: "aguardando-assinatura" }),
      res
    );

    expect(res.statusCode).toBe(409);
    expect(res.body.missing).toContain("token de confirmação");
    expect(mocks.saveState).not.toHaveBeenCalled();
  });

  it("não marca 'aguardando-assinatura' sem e-mail", async () => {
    mocks.osFindUnique.mockResolvedValue({
      ...baseOs,
      assinado: "token-existente-123456",
    });
    const res = makeRes();

    await handler(
      makeReq({ numeroOs: "77/2026", stage: "aguardando-assinatura" }),
      res
    );

    expect(res.statusCode).toBe(409);
    expect(res.body.missing).toContain("envio do e-mail para a escola");
    expect(mocks.saveState).not.toHaveBeenCalled();
  });

  it("não marca 'aguardando-assinatura' sem chamado quando não solucionado", async () => {
    mocks.osFindUnique.mockResolvedValue({
      ...baseOs,
      assinado: "token-existente-123456",
      lastEmailSent: new Date(),
      solucionado: "Nao",
    });
    mocks.loadChamados.mockResolvedValue(new Set<string>());
    const res = makeRes();

    await handler(
      makeReq({ numeroOs: "77/2026", stage: "aguardando-assinatura" }),
      res
    );

    expect(res.statusCode).toBe(409);
    expect(res.body.missing).toContain("chamado de reagendamento");
    expect(mocks.saveState).not.toHaveBeenCalled();
  });

  it("marca concluído quando token, e-mail e chamado existem", async () => {
    mocks.osFindUnique.mockResolvedValue({
      ...baseOs,
      assinado: "token-existente-123456",
      lastEmailSent: new Date(),
      solucionado: "Nao",
    });
    mocks.loadChamados.mockResolvedValue(new Set(["77/2026"]));
    const res = makeRes();

    await handler(
      makeReq({ numeroOs: "77/2026", stage: "aguardando-assinatura" }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(mocks.saveState).toHaveBeenCalledWith(
      expect.objectContaining({
        osId: 77,
        stage: "aguardando-assinatura",
      })
    );
  });

  it("reconhece e aceita a etapa 'pdf' com token", async () => {
    mocks.osFindUnique.mockResolvedValue({
      ...baseOs,
      assinado: "token-existente-123456",
    });
    const res = makeRes();

    await handler(makeReq({ numeroOs: "77/2026", stage: "pdf" }), res);

    expect(res.statusCode).toBe(200);
    expect(mocks.saveState).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "pdf" })
    );
  });

  it("não aceita 'pdf' sem token", async () => {
    mocks.osFindUnique.mockResolvedValue(baseOs);
    const res = makeRes();

    await handler(makeReq({ numeroOs: "77/2026", stage: "pdf" }), res);

    expect(res.statusCode).toBe(409);
    expect(mocks.saveState).not.toHaveBeenCalled();
  });

  it("nega usuário sem autorização sobre a OS", async () => {
    mocks.osFindUnique.mockResolvedValue(baseOs);
    mocks.authorize.mockResolvedValue({
      allowed: false,
      reason: "Esta OS pertence a outro técnico ou a outra rota.",
    });
    const res = makeRes();

    await handler(makeReq({ numeroOs: "77/2026", stage: "fotos" }), res);

    expect(res.statusCode).toBe(403);
    expect(mocks.saveState).not.toHaveBeenCalled();
  });
});
