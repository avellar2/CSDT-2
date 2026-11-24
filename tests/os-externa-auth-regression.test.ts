import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

const mocks = vi.hoisted(() => {
  const profileFindUnique = vi.fn();
  const oSExternaFindFirst = vi.fn();
  const oSExternaCreate = vi.fn();
  const oSExternaUpdate = vi.fn();
  const oSExternaFindUnique = vi.fn();
  const chamadoFindFirst = vi.fn();
  const chamadoCreate = vi.fn();
  const submissionFindFirst = vi.fn();
  const submissionCreate = vi.fn();
  const submissionFindUnique = vi.fn();
  const submissionUpdate = vi.fn();
  const submissionDeleteMany = vi.fn();
  const getUser = vi.fn();
  const getSession = vi.fn();
  const refreshSession = vi.fn();
  const onAuthStateChange = vi.fn();
  const sendMail = vi.fn();
  const fetchMock = vi.fn();

  const prismaMock = {
    profile: { findUnique: profileFindUnique },
    oSExterna: {
      findFirst: oSExternaFindFirst,
      findUnique: oSExternaFindUnique,
      create: oSExternaCreate,
      update: oSExternaUpdate,
    },
    chamados_escalas: { findFirst: chamadoFindFirst, create: chamadoCreate },
    osExternaSubmission: {
      findFirst: submissionFindFirst,
      findUnique: submissionFindUnique,
      create: submissionCreate,
      update: submissionUpdate,
      deleteMany: submissionDeleteMany,
    },
    schoolDemand: { findUnique: vi.fn(), update: vi.fn() },
    dailyRoute: { count: vi.fn(), findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    dailyRouteTechnician: { findMany: vi.fn().mockResolvedValue([]) },
    visitTechnician: { findFirst: vi.fn() },
    dailyDemandOsRelease: { findFirst: vi.fn() },
    async $disconnect() {},
  };

  return {
    profileFindUnique,
    oSExternaFindFirst,
    oSExternaCreate,
    oSExternaUpdate,
    oSExternaFindUnique,
    chamadoFindFirst,
    chamadoCreate,
    submissionFindFirst,
    submissionCreate,
    submissionFindUnique,
    submissionUpdate,
    submissionDeleteMany,
    getUser,
    getSession,
    refreshSession,
    onAuthStateChange,
    sendMail,
    fetchMock,
    prismaMock,
  };
});

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      getSession: mocks.getSession,
      refreshSession: mocks.refreshSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}));

vi.mock("@prisma/client", () => ({
  Prisma: {},
  PrismaClient: class {
    profile = mocks.prismaMock.profile;
    oSExterna = mocks.prismaMock.oSExterna;
    osExternaSubmission = mocks.prismaMock.osExternaSubmission;
    chamados_escalas = mocks.prismaMock.chamados_escalas;
    schoolDemand = mocks.prismaMock.schoolDemand;
    dailyRoute = mocks.prismaMock.dailyRoute;
    dailyRouteTechnician = mocks.prismaMock.dailyRouteTechnician;
    visitTechnician = mocks.prismaMock.visitTechnician;
    dailyDemandOsRelease = mocks.prismaMock.dailyDemandOsRelease;
    async $transaction(fn: any) {
      return fn(this);
    }
    async $disconnect() {}
  },
}));

vi.mock("@/utils/prisma", () => ({ default: mocks.prismaMock }));

vi.mock("@/utils/mailer", () => ({
  MailConfigurationError: class MailConfigurationError extends Error {},
  sendMail: mocks.sendMail,
}));

vi.mock("@/utils/schoolPendingDailyDemandAvailability", () => ({
  getSchoolPendingDailyDemandAvailability: vi.fn().mockResolvedValue({ applies: false }),
}));

vi.mock("@/utils/operationalOsScope", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/utils/operationalOsScope")
  >();
  return {
    ...actual,
    resolveRouteIdForResponsible: vi.fn().mockResolvedValue(null),
  };
});

import { authedFetch, AuthSessionError, getFreshAccessToken } from "@/utils/client-auth";
import schoolsHandler from "@/pages/api/schools";
import updateFotosHandler from "@/pages/api/update-os-externa-fotos";
import updateTokenHandler from "@/pages/api/update-os-externa-token";
import osExternaAccessHandler from "@/pages/api/os-externa-access";
import saveOsExternaHandler from "@/pages/api/save-os-externa";
import chamadosEscalasHandler from "@/pages/api/chamados-escalas";
import sendEmailHandler from "@/pages/api/send-email";

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

function makeReq(method: string, body?: unknown, token?: string, query: Record<string, unknown> = {}) {
  return {
    method,
    body,
    query,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as any;
}

function loginAs(role = "TECH", userId = "user-1", displayName = "Tecnico Teste") {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: userId, email: `${userId}@example.com` } },
    error: null,
  });
  mocks.profileFindUnique.mockResolvedValue({
    id: 10,
    role,
    displayName,
    schoolId: null,
  });
}

beforeAll(() => {
  (globalThis as any).window = globalThis;
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
  vi.stubGlobal("fetch", mocks.fetchMock);
});

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).localStorage.clear();
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mocks.prismaMock.dailyRouteTechnician.findMany.mockResolvedValue([]);
});

describe("client-auth: token vem da sessão do Supabase", () => {
  it("usa o access_token da sessão e espelha no localStorage", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-atual",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });

    await expect(getFreshAccessToken()).resolves.toBe("token-atual");
    expect(globalThis.localStorage.getItem("token")).toBe("token-atual");
  });

  it("envia Authorization Bearer no authedFetch", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-atual",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });
    mocks.fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await authedFetch("/api/schools");

    const headers = mocks.fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token-atual");
  });

  it("sem sessão nem token salvo, falha com erro de sessão ausente", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });

    await expect(authedFetch("/api/schools")).rejects.toMatchObject({
      name: "AuthSessionError",
      reason: "missing",
    });
    expect(mocks.fetchMock).not.toHaveBeenCalled();
  });

  it("em 401 de GET renova a sessão e repete uma única vez", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-velho",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });
    mocks.refreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-novo",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });
    mocks.fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const response = await authedFetch("/api/schools");

    expect(response.status).toBe(200);
    expect(mocks.fetchMock).toHaveBeenCalledTimes(2);
    const retryHeaders = mocks.fetchMock.mock.calls[1][1].headers as Headers;
    expect(retryHeaders.get("Authorization")).toBe("Bearer token-novo");
  });

  it("não repete escrita em 401 sem autorização explícita", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-velho",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });
    mocks.fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));

    await expect(
      authedFetch("/api/save-os-externa", { method: "POST" })
    ).rejects.toBeInstanceOf(AuthSessionError);
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });
});

describe("endpoints de OS exigem autenticação de fato", () => {
  it("GET /api/schools sem token responde 401", async () => {
    const res = makeRes();
    await schoolsHandler(makeReq("GET"), res);
    expect(res.statusCode).toBe(401);
  });

  it("POST /api/update-os-externa-fotos sem token responde 401", async () => {
    const res = makeRes();
    await updateFotosHandler(makeReq("POST", {}), res);
    expect(res.statusCode).toBe(401);
  });

  it("POST /api/update-os-externa-token sem token responde 401", async () => {
    const res = makeRes();
    await updateTokenHandler(makeReq("POST", {}), res);
    expect(res.statusCode).toBe(401);
  });

  it("não sobrescreve token de OS já assinada", async () => {
    loginAs("ADMIN");
    mocks.oSExternaFindFirst.mockResolvedValue({
      id: 1,
      status: "Assinado",
      numeroOs: "1/2026",
      unidadeEscolar: "EM ZIRALDO",
      tecnicoResponsavel: "Yuri",
      data: "2026-11-24",
      routeId: null,
      createdAt: new Date(),
      assinado: "Fabiana",
    });

    const res = makeRes();
    await updateTokenHandler(
      makeReq("POST", { numeroOs: "1/2026", assinado: "novo-token" }, "tok"),
      res
    );

    expect(res.statusCode).toBe(409);
    expect(mocks.oSExternaUpdate).not.toHaveBeenCalled();
  });
});

describe("idempotência do lançamento de OS", () => {
  it("retry com o mesmo conteúdo reaproveita a OS existente", async () => {
    loginAs("ADMIN");
    mocks.oSExternaFindFirst.mockResolvedValue({
      id: 77,
      numeroOs: "77/2026",
      unidadeEscolar: "EM ZIRALDO",
      tecnicoResponsavel: "Yuri",
      data: "2026-11-24",
      status: "Pendente",
      routeId: null,
      createdAt: new Date(),
      solicitacaoDaVisita: "Sem internet",
      relatorio: "Roteador reiniciado",
      solucionado: "Sim",
    });

    const res = makeRes();
    await saveOsExternaHandler(
      makeReq(
        "POST",
        {
          formData: {
            unidadeEscolar: "EM ZIRALDO",
            tecnicoResponsavel: "Yuri",
            data: "2026-11-24",
            solicitacaoDaVisita: "Sem internet",
            relatorio: "Roteador reiniciado",
            solucionado: "Sim",
          },
          context: { userId: "user-1" },
        },
        "tok"
      ),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ id: 77, numeroOs: "77/2026", deduplicated: true });
    expect(mocks.oSExternaCreate).not.toHaveBeenCalled();
  });

  it("chamado automático não é duplicado para a mesma OS", async () => {
    loginAs("TECH");
    mocks.chamadoFindFirst.mockResolvedValue({ id: 9, osOriginal: "77/2026", automatico: true });

    const res = makeRes();
    await chamadosEscalasHandler(
      makeReq(
        "POST",
        {
          escola: "EM ZIRALDO",
          titulo: "Reagendamento",
          descricao: "Problema não solucionado",
          categoria: "Reagendamento",
          tecnico: "Yuri",
          osOriginal: "77/2026",
          automatico: true,
        },
        "tok"
      ),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ deduplicated: true });
    expect(mocks.chamadoCreate).not.toHaveBeenCalled();
  });

  it("e-mail da OS não é reenviado no mesmo dia", async () => {
    loginAs("ADMIN");
    mocks.oSExternaFindUnique.mockResolvedValue({
      id: 77,
      lastEmailSent: new Date(),
      status: "Pendente",
      routeId: null,
      data: "2026-11-24",
      createdAt: new Date(),
      tecnicoResponsavel: "Yuri",
      unidadeEscolar: "EM ZIRALDO",
    });

    const res = makeRes();
    await sendEmailHandler(
      makeReq(
        "POST",
        {
          to: "escola@example.com",
          subject: "OS Externa 77/2026",
          html: "<p>OS</p>",
          osExternaNumero: "77/2026",
        },
        "tok"
      ),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ deduplicated: true });
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});

describe("idempotência vinculada à identidade autenticada", () => {
  const requestId = "11111111-1111-4111-8111-111111111111";
  const formData = {
    unidadeEscolar: "EM ZIRALDO",
    tecnicoResponsavel: "Yuri",
    data: "2026-11-24",
    solicitacaoDaVisita: "Sem internet",
    relatorio: "Roteador reiniciado",
    solucionado: "Sim",
  };

  it("reserva a tentativa com userId e cria uma única OS", async () => {
    loginAs("ADMIN");
    mocks.submissionCreate.mockResolvedValue({ id: 1 });
    mocks.oSExternaCreate.mockResolvedValue({ id: 88 });
    mocks.oSExternaUpdate.mockResolvedValue({ id: 88, numeroOs: "88/2026" });

    const res = makeRes();
    await saveOsExternaHandler(
      makeReq(
        "POST",
        { formData, context: { clientRequestId: requestId } },
        "tok"
      ),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(mocks.submissionCreate).toHaveBeenCalledWith({
      data: { requestId: `user-1:${requestId}`, userId: "user-1" },
    });
    expect(mocks.oSExternaCreate).toHaveBeenCalledTimes(1);
    expect(mocks.submissionUpdate).toHaveBeenCalledWith({
      where: { requestId: `user-1:${requestId}` },
      data: { osId: 88 },
    });
  });

  it("requisições simultâneas devolvem a mesma OS sem criar outra", async () => {
    loginAs("ADMIN");
    mocks.submissionCreate.mockRejectedValue({ code: "P2002" });
    mocks.submissionFindUnique.mockResolvedValue({
      osId: 88,
      userId: "user-1",
      createdAt: new Date(),
    });
    mocks.oSExternaFindUnique.mockResolvedValue({
      id: 88,
      numeroOs: "88/2026",
      unidadeEscolar: "EM ZIRALDO",
      tecnicoResponsavel: "Yuri",
      data: "2026-11-24",
      status: "Pendente",
      routeId: null,
      createdAt: new Date(),
      solicitacaoDaVisita: "Sem internet",
      relatorio: "Roteador reiniciado",
      solucionado: "Sim",
    });

    const res = makeRes();
    await saveOsExternaHandler(
      makeReq(
        "POST",
        { formData, context: { clientRequestId: requestId } },
        "tok"
      ),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      id: 88,
      numeroOs: "88/2026",
      deduplicated: true,
    });
    expect(mocks.oSExternaCreate).not.toHaveBeenCalled();
  });

  it("o mesmo requestId de outro usuário usa uma chave diferente", async () => {
    loginAs("ADMIN", "user-2");
    mocks.submissionCreate.mockResolvedValue({ id: 2 });
    mocks.oSExternaCreate.mockResolvedValue({ id: 99 });
    mocks.oSExternaUpdate.mockResolvedValue({ id: 99, numeroOs: "99/2026" });

    const res = makeRes();
    await saveOsExternaHandler(
      makeReq(
        "POST",
        { formData, context: { clientRequestId: requestId } },
        "tok-2"
      ),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(mocks.submissionCreate).toHaveBeenCalledWith({
      data: { requestId: `user-2:${requestId}`, userId: "user-2" },
    });
  });
});

describe("autorização por OS específica", () => {
  it("TECH não altera fotos de OS de outro técnico", async () => {
    loginAs("TECH", "user-1", "Ana");
    mocks.oSExternaFindFirst.mockResolvedValue({
      id: 77,
      numeroOs: "77/2026",
      unidadeEscolar: "EM ZIRALDO",
      tecnicoResponsavel: "Yuri",
      data: "2026-11-01",
      status: "Pendente",
      routeId: null,
      createdAt: new Date("2026-11-01T12:00:00-03:00"),
      fotosAntes: [],
      fotosDepois: [],
    });
    mocks.submissionFindFirst.mockResolvedValue(null);

    const res = makeRes();
    await updateFotosHandler(
      makeReq("POST", { numeroOs: "77/2026", fotosAntes: [], fotosDepois: [] }, "tok"),
      res
    );

    expect(res.statusCode).toBe(403);
    expect(mocks.oSExternaUpdate).not.toHaveBeenCalled();
  });

  it("TECH responsável atualiza fotos sem apagar as existentes", async () => {
    loginAs("TECH", "user-1", "Tecnico Teste");
    mocks.oSExternaFindFirst.mockResolvedValue({
      id: 77,
      numeroOs: "77/2026",
      unidadeEscolar: "EM ZIRALDO",
      tecnicoResponsavel: "Tecnico Teste",
      data: "2026-11-01",
      status: "Pendente",
      routeId: null,
      createdAt: new Date("2026-11-01T12:00:00-03:00"),
      fotosAntes: ["antes-1"],
      fotosDepois: ["depois-1"],
    });
    mocks.submissionFindFirst.mockResolvedValue(null);
    mocks.oSExternaUpdate.mockResolvedValue({
      id: 77,
      fotosAntes: ["antes-1"],
      fotosDepois: ["depois-1"],
    });

    const res = makeRes();
    await updateFotosHandler(
      makeReq("POST", { numeroOs: "77/2026", fotosAntes: [], fotosDepois: [] }, "tok"),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(mocks.oSExternaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { fotosAntes: ["antes-1"], fotosDepois: ["depois-1"] },
      })
    );
  });
});

describe("GET /api/os-externa-access", () => {
  it("autoriza o responsável e devolve fotos e token existentes", async () => {
    loginAs("TECH", "user-1", "Tecnico Teste");
    mocks.oSExternaFindUnique.mockResolvedValue({
      id: 77,
      numeroOs: "77/2026",
      unidadeEscolar: "EM ZIRALDO",
      tecnicoResponsavel: "Tecnico Teste",
      data: "2026-11-24",
      status: "Pendente",
      routeId: null,
      createdAt: new Date(),
      assinado: "token-existente-123",
      fotosAntes: ["antes-1"],
      fotosDepois: ["depois-1"],
      lastEmailSent: null,
    });
    mocks.submissionFindFirst.mockResolvedValue(null);

    const res = makeRes();
    await osExternaAccessHandler(
      makeReq("GET", undefined, "tok", { numeroOs: "77/2026" }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      allowed: true,
      confirmToken: "token-existente-123",
      alreadySigned: false,
    });
    expect(res.body.os.fotosAntes).toEqual(["antes-1"]);
  });

  it("nega a retomada de OS de outro técnico", async () => {
    loginAs("TECH", "user-1", "Ana");
    mocks.oSExternaFindUnique.mockResolvedValue({
      id: 77,
      numeroOs: "77/2026",
      unidadeEscolar: "EM ZIRALDO",
      tecnicoResponsavel: "Yuri",
      data: "2026-11-01",
      status: "Pendente",
      routeId: null,
      createdAt: new Date("2026-11-01T12:00:00-03:00"),
      assinado: "token-existente-123",
      fotosAntes: [],
      fotosDepois: [],
      lastEmailSent: null,
    });
    mocks.submissionFindFirst.mockResolvedValue(null);

    const res = makeRes();
    await osExternaAccessHandler(
      makeReq("GET", undefined, "tok", { numeroOs: "77/2026" }),
      res
    );

    expect(res.statusCode).toBe(403);
  });
});

describe("confirmação do destinatário principal do e-mail", () => {
  const osBase = {
    id: 77,
    lastEmailSent: null,
    status: "Pendente",
    routeId: null,
    data: "2026-11-24",
    createdAt: new Date(),
    tecnicoResponsavel: "Yuri",
    unidadeEscolar: "EM ZIRALDO",
  };

  it("não registra envio quando o destinatário principal é rejeitado", async () => {
    loginAs("ADMIN");
    mocks.oSExternaFindUnique.mockResolvedValue(osBase);
    mocks.sendMail.mockResolvedValue({
      messageId: "1",
      accepted: ["cc@example.com"],
      rejected: ["escola@example.com"],
      response: "",
    });

    const res = makeRes();
    await sendEmailHandler(
      makeReq(
        "POST",
        {
          to: "escola@example.com",
          cc: "cc@example.com",
          subject: "OS Externa 77/2026",
          html: "<p>OS</p>",
          osExternaNumero: "77/2026",
        },
        "tok"
      ),
      res
    );

    expect(res.statusCode).toBe(502);
    expect(mocks.oSExternaUpdate).not.toHaveBeenCalled();
  });

  it("sinaliza falha do CC sem impedir o envio ao destinatário principal", async () => {
    loginAs("ADMIN");
    mocks.oSExternaFindUnique.mockResolvedValue(osBase);
    mocks.sendMail.mockResolvedValue({
      messageId: "2",
      accepted: ["escola@example.com"],
      rejected: ["cc@example.com"],
      response: "",
    });

    const res = makeRes();
    await sendEmailHandler(
      makeReq(
        "POST",
        {
          to: "escola@example.com",
          cc: "cc@example.com",
          subject: "OS Externa 77/2026",
          html: "<p>OS</p>",
          osExternaNumero: "77/2026",
        },
        "tok"
      ),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ mainAccepted: true, ccStatus: "failed" });
    expect(mocks.oSExternaUpdate).toHaveBeenCalled();
  });

  it("rejeita destinatário diferente do e-mail cadastrado na OS", async () => {
    loginAs("ADMIN");
    mocks.oSExternaFindUnique.mockResolvedValue({
      ...osBase,
      emailResponsavel: "cadastrado@example.com",
    });

    const res = makeRes();
    await sendEmailHandler(
      makeReq(
        "POST",
        {
          to: "outro@example.com",
          subject: "OS Externa 77/2026",
          html: "<p>OS</p>",
          osExternaNumero: "77/2026",
        },
        "tok"
      ),
      res
    );

    expect(res.statusCode).toBe(403);
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});

describe("token de confirmação existente", () => {
  it("não sobrescreve um token já gravado e o devolve", async () => {
    loginAs("ADMIN");
    mocks.oSExternaFindFirst.mockResolvedValue({
      id: 1,
      numeroOs: "1/2026",
      status: "Pendente",
      assinado: "token-existente-123",
      unidadeEscolar: "EM ZIRALDO",
      tecnicoResponsavel: "Yuri",
      data: "2026-11-24",
      routeId: null,
      createdAt: new Date(),
    });

    const res = makeRes();
    await updateTokenHandler(
      makeReq(
        "POST",
        { numeroOs: "1/2026", assinado: "novo-token-1234" },
        "tok"
      ),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      existing: true,
      token: "token-existente-123",
    });
    expect(mocks.oSExternaUpdate).not.toHaveBeenCalled();
  });
});

