import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A assinatura de upload não pode ser um "cheque em branco": precisa validar
 * a AUTORIZAÇÃO sobre a OS específica, derivar a pasta no servidor e gerar um
 * public_id novo (impedindo sobrescrever arquivos de outra OS).
 */

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profileFindUnique: vi.fn(),
  osFindUnique: vi.fn(),
  authorize: vi.fn(),
  sign: vi.fn(),
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

vi.mock("cloudinary", () => ({
  v2: {
    utils: { api_sign_request: mocks.sign },
  },
}));

import handler from "@/pages/api/cloudinary-signature";

function makeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {} as Record<string, unknown>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
    setHeader(name: string, value: unknown) {
      res.headers[name] = value;
      return res;
    },
  };
  return res;
}

function makeReq(body: unknown, token?: string) {
  return {
    method: "POST",
    body,
    query: {},
    headers: token ? { authorization: `Bearer ${token}` } : {},
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

const os = {
  id: 77,
  numeroOs: "77/2026",
  status: "Pendente",
  routeId: null,
  data: "2026-11-27",
  createdAt: new Date(),
  tecnicoResponsavel: "Tecnico Teste",
};

beforeAll(() => {
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "test-key";
  process.env.CLOUDINARY_API_SECRET = "test-secret";
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sign.mockReturnValue("assinatura-fake");
});

describe("POST /api/cloudinary-signature", () => {
  it("exige autenticação", async () => {
    const res = makeRes();
    await handler(makeReq({ scope: "os-externa", numeroOs: "77/2026", field: "fotos-antes" }), res);
    expect(res.statusCode).toBe(401);
    expect(mocks.osFindUnique).not.toHaveBeenCalled();
  });

  it("nega OS de outro técnico (não basta estar autenticado)", async () => {
    loginAs("TECH");
    mocks.osFindUnique.mockResolvedValue({ ...os, tecnicoResponsavel: "Outro" });
    mocks.authorize.mockResolvedValue({
      allowed: false,
      reason: "Esta OS pertence a outro técnico ou a outra rota.",
    });

    const res = makeRes();
    await handler(
      makeReq({ scope: "os-externa", numeroOs: "77/2026", field: "fotos-antes" }, "tok"),
      res
    );

    expect(res.statusCode).toBe(403);
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it("assina com pasta derivada da OS autorizada e public_id novo", async () => {
    loginAs("TECH");
    mocks.osFindUnique.mockResolvedValue(os);
    mocks.authorize.mockResolvedValue({ allowed: true, reason: "responsive" });

    const res = makeRes();
    await handler(
      makeReq({ scope: "os-externa", numeroOs: "77/2026", field: "fotos-antes" }, "tok"),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.folder).toBe("os-externa-img/fotos-antes/77/2026");
    expect(res.body.publicId).toMatch(/^\d+-[0-9a-f-]{36}$/);
    expect(mocks.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: "os-externa-img/fotos-antes/77/2026",
        public_id: res.body.publicId,
      }),
      "test-secret"
    );

    // Cada upload recebe um public_id diferente: não sobrescreve arquivo
    // existente nem de outra OS.
    const res2 = makeRes();
    await handler(
      makeReq({ scope: "os-externa", numeroOs: "77/2026", field: "fotos-antes" }, "tok"),
      res2
    );
    expect(res2.body.publicId).not.toBe(res.body.publicId);
  });

  it("ignora caminho/nome enviados pelo cliente", async () => {
    loginAs("TECH");
    mocks.osFindUnique.mockResolvedValue(os);
    mocks.authorize.mockResolvedValue({ allowed: true, reason: "responsible" });

    const res = makeRes();
    await handler(
      makeReq(
        {
          scope: "os-externa",
          numeroOs: "77/2026",
          field: "fotos-depois",
          folder: "os-externa-img/fotos-depois/OUTRA-OS",
          publicId: "arquivo-existente",
        },
        "tok"
      ),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.folder).toBe("os-externa-img/fotos-depois/77/2026");
    expect(res.body.publicId).not.toBe("arquivo-existente");
  });

  it("não assina para OS já assinada", async () => {
    loginAs("ADMIN");
    mocks.osFindUnique.mockResolvedValue({ ...os, status: "Assinado" });
    mocks.authorize.mockResolvedValue({ allowed: true, reason: "manager" });

    const res = makeRes();
    await handler(
      makeReq({ scope: "os-externa", numeroOs: "77/2026", field: "fotos-antes" }, "tok"),
      res
    );

    expect(res.statusCode).toBe(409);
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it("preserva o upload do CHADA com public_id do servidor", async () => {
    loginAs("TECH");
    const res = makeRes();
    await handler(makeReq({ scope: "chada", itemId: "item-123" }, "tok"), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.folder).toBe("os-images");
    expect(res.body.publicId).toMatch(/^item-123-\d+-[0-9a-f-]{36}$/);
    expect(mocks.sign).toHaveBeenCalledWith(
      expect.objectContaining({ folder: "os-images" }),
      "test-secret"
    );
  });

  it("rejeita escopo desconhecido (cliente antigo cai para o proxy)", async () => {
    loginAs("TECH");
    const res = makeRes();
    await handler(makeReq({ folder: "qualquer", publicId: "x" }, "tok"), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.fallback).toBe("proxy");
  });
});
