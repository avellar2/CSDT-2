import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testes da API de Devolucao com mocks do Prisma.
 *
 * IMPORTANTE: mocks NAO comprovam rollback real de banco. Estes testes
 * verificam o COMPORTAMENTO do callback da transacao:
 *  - excecao sai do callback e nenhuma resposta de sucesso e enviada;
 *  - etapas posteriores nao sao chamadas apos falha (ex.: newMemorandum.create
 *    nao e chamado quando a validacao de itens falha);
 *  - updateMany com count incorreto rejeita;
 *  - erro de PDF rejeita;
 *  - retry ocorre apenas para P2034/P2002;
 *  - nenhum school.upsert por schoolName; CSDT por ID canonico.
 *
 * Rollback real depende da garantia transacional do Prisma/PostgreSQL e
 * sera confirmado no E2E.
 */

// vi.hoisted permite que as variaveis sejam usadas dentro das factories hoisted do vi.mock
const mocks = vi.hoisted(() => {
  const fakeTx = {
    school: { findUnique: vi.fn() },
    item: { findMany: vi.fn(), updateMany: vi.fn() },
    newMemorandum: { findFirst: vi.fn(), create: vi.fn() },
    itemHistory: { createMany: vi.fn() },
  };
  const prismaMock = {
    profile: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  const fillMock = vi.fn();
  const loadMock = vi.fn();
  const supabaseMock = { auth: { getUser: vi.fn() } };
  return { fakeTx, prismaMock, fillMock, loadMock, supabaseMock };
});

vi.mock("@/lib/supabaseClient", () => ({ supabase: mocks.supabaseMock }));
vi.mock("@/utils/pdfMemorandoDevolucao", () => ({
  loadDevolucaoTemplateBytes: () => mocks.loadMock(),
  fillDevolucaoPdf: (...a: any[]) => mocks.fillMock(...a),
}));
vi.mock("@/utils/prisma", () => ({ default: mocks.prismaMock }));

// Importa DEPOIS dos mocks
import handler from "../src/pages/api/generate-memorandum-devolucao";

const { fakeTx, prismaMock, fillMock, loadMock, supabaseMock } = mocks;

function mockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function baseReq(overrides: any = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer token" },
    body: {
      itemIds: [1, 2, 3],
      sourceSchoolId: 300,
      district: "DISTRITO X",
      ...overrides,
    },
  } as any;
}

const SOURCE_SCHOOL = { id: 300, name: "EM Teste", district: "DISTRITO X" };
const CSDT_SCHOOL = { id: 225, name: "CSDT", district: "SEDE" };

beforeEach(() => {
  vi.clearAllMocks();
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  });
  prismaMock.profile.findUnique.mockResolvedValue({
    userId: "user-1",
    displayName: "Aurelio",
  });
  prismaMock.$transaction.mockImplementation(async (cb: any) => cb(fakeTx));
  loadMock.mockReturnValue(Buffer.from("TEMPLATE_BYTES"));
  fillMock.mockResolvedValue({ pdfBase64: "QkFTRTY0", pageCount: 1 });

  // school.findUnique por ID (robusto a ordem das chamadas)
  fakeTx.school.findUnique.mockImplementation(async ({ where }: any) => {
    if (where.id === 300) return SOURCE_SCHOOL;
    if (where.id === 225) return CSDT_SCHOOL;
    return null;
  });
  fakeTx.item.findMany.mockResolvedValue([
    { id: 1, name: "Nobreak", brand: "B", serialNumber: "S1", schoolId: 300, School: SOURCE_SCHOOL },
    { id: 2, name: "Nobreak", brand: "B", serialNumber: "S2", schoolId: 300, School: SOURCE_SCHOOL },
    { id: 3, name: "Nobreak", brand: "B", serialNumber: "S3", schoolId: 300, School: SOURCE_SCHOOL },
  ]);
  fakeTx.newMemorandum.findFirst.mockResolvedValue(null);
  fakeTx.newMemorandum.create.mockResolvedValue({
    id: 99,
    number: "1/2026",
    createdAt: new Date("2026-08-03T10:00:00Z"),
  });
  fakeTx.itemHistory.createMany.mockResolvedValue({ count: 3 });
  fakeTx.item.updateMany.mockResolvedValue({ count: 3 });
});

describe("API Devolucao - fluxo de sucesso", () => {
  it("retorna 200 com pdfBase64 e dados da tx", async () => {
    const res = mockRes();
    await handler(baseReq(), res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body.pdfBase64).toBe("QkFTRTY0");
    expect(res.body.type).toBe("devolucao");
    expect(res.body.fromSchool).toBe("EM Teste");
    expect(res.body.toSchool).toBe("CSDT");
  });

  it("NAO faz school.upsert por schoolName (usa findUnique por ID)", async () => {
    const res = mockRes();
    await handler(baseReq(), res as any);
    expect((fakeTx.school as any).upsert).toBeUndefined();
    expect(fakeTx.school.findUnique).toHaveBeenCalledWith({ where: { id: 300 } });
    expect(fakeTx.school.findUnique).toHaveBeenCalledWith({ where: { id: 225 } });
  });
});

describe("API Devolucao - rejeicoes de negocio (rollback sem sucesso)", () => {
  it("escola de origem inexistente -> 400 e NAO cria memorando", async () => {
    fakeTx.school.findUnique.mockImplementation(async () => null);
    const res = mockRes();
    await handler(baseReq(), res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Escola de origem/i);
    expect(fakeTx.newMemorandum.create).not.toHaveBeenCalled();
  });

  it("CSDT canonico inexistente -> 400 e NAO cria memorando", async () => {
    fakeTx.school.findUnique.mockImplementation(async ({ where }: any) =>
      where.id === 300 ? SOURCE_SCHOOL : null,
    );
    const res = mockRes();
    await handler(baseReq(), res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/CSDT canonico/i);
    expect(fakeTx.newMemorandum.create).not.toHaveBeenCalled();
  });

  it("item de outra escola -> 400 e NAO cria memorando", async () => {
    fakeTx.item.findMany.mockResolvedValue([
      { id: 1, name: "N", brand: "B", serialNumber: "S1", schoolId: 300, School: SOURCE_SCHOOL },
      { id: 2, name: "N", brand: "B", serialNumber: "S2", schoolId: 300, School: SOURCE_SCHOOL },
      { id: 3, name: "N", brand: "B", serialNumber: "S3", schoolId: 999, School: {} },
    ]);
    const res = mockRes();
    await handler(baseReq(), res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/nao pertencem/i);
    expect(fakeTx.newMemorandum.create).not.toHaveBeenCalled();
  });

  it("updateMany com count < esperado -> erro (rollback) e sem resposta de sucesso", async () => {
    fakeTx.item.updateMany.mockResolvedValue({ count: 2 });
    const res = mockRes();
    await handler(baseReq(), res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/cancelada|rollback|concorrencia/i);
    expect(res.body.pdfBase64).toBeUndefined();
  });

  it("erro na geracao do PDF -> erro (rollback), sem sucesso", async () => {
    fillMock.mockRejectedValue(new Error("pdf-lib falhou"));
    const res = mockRes();
    await handler(baseReq(), res as any);
    expect(res.statusCode).toBe(500);
    expect(res.body.pdfBase64).toBeUndefined();
  });
});

describe("API Devolucao - retry de concorrencia", () => {
  it("repete em P2034 e sucesso na 2a tentativa", async () => {
    const txError = Object.assign(new Error("conflict"), { code: "P2034" });
    let calls = 0;
    prismaMock.$transaction.mockImplementation(async (cb: any) => {
      calls++;
      if (calls === 1) throw txError;
      return cb(fakeTx);
    });
    const res = mockRes();
    await handler(baseReq(), res as any);
    expect(res.statusCode).toBe(200);
    expect(calls).toBe(2);
  });

  it("NAO repete em erro nao-retentavel (P5000)", async () => {
    const txError = Object.assign(new Error("other"), { code: "P5000" });
    prismaMock.$transaction.mockRejectedValue(txError);
    const res = mockRes();
    await handler(baseReq(), res as any);
    expect(res.statusCode).toBe(500);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("esgota apos MAX_RETRIES em P2034 -> 500", async () => {
    const txError = Object.assign(new Error("conflict"), { code: "P2034" });
    prismaMock.$transaction.mockRejectedValue(txError);
    const res = mockRes();
    await handler(baseReq(), res as any);
    expect(res.statusCode).toBe(500);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(3);
  });
});