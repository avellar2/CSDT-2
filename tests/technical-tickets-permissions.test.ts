import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Revisão de permissões (item 3): ONLYREAD e SCHOOL não operam chamados
 * técnicos; SCHOOL só acessa os chamados da própria escola; o autor de
 * comentários vem da sessão autenticada, nunca do corpo.
 */
const {
  ticketFindUnique,
  ticketUpdate,
  ticketCreate,
  ticketFindMany,
  commentCreate,
  commentFindMany,
  membershipFindMany,
  routeFindMany,
  requireAuthMock,
} = vi.hoisted(() => ({
  ticketFindUnique: vi.fn(),
  ticketUpdate: vi.fn(),
  ticketCreate: vi.fn(),
  ticketFindMany: vi.fn(),
  commentCreate: vi.fn(),
  commentFindMany: vi.fn(),
  membershipFindMany: vi.fn(),
  routeFindMany: vi.fn(),
  requireAuthMock: vi.fn(),
}));

vi.mock("@prisma/client", () => ({
  Prisma: {},
  PrismaClient: class {
    technicalTicket = {
      findUnique: ticketFindUnique,
      update: ticketUpdate,
      create: ticketCreate,
      findMany: ticketFindMany,
    };
    ticketComment = { create: commentCreate, findMany: commentFindMany };
    async $transaction(fn: (tx: unknown) => unknown) {
      return fn(this);
    }
    async $disconnect() {}
  },
}));

vi.mock("@/utils/prisma", () => ({
  default: {
    dailyRouteTechnician: { findMany: membershipFindMany },
    dailyRoute: { findMany: routeFindMany, count: vi.fn() },
  },
}));

vi.mock("@/utils/api-auth", () => ({
  requireAuth: requireAuthMock,
  requireRole: vi.fn(),
  AUTH_ROLES: {
    ADMIN: "ADMIN",
    TECH: "TECH",
    ADMTOTAL: "ADMTOTAL",
    ONLYREAD: "ONLYREAD",
    SCHOOL: "SCHOOL",
  },
  TICKET_OPERATOR_ROLES: ["ADMIN", "ADMTOTAL", "TECH"],
  canOperateTickets: (role: string) =>
    ["ADMIN", "ADMTOTAL", "TECH"].includes(role),
}));

import deleteHandler from "@/pages/api/technical-tickets/delete";
import deletedHandler from "@/pages/api/technical-tickets/deleted";
import commentsHandler from "@/pages/api/technical-tickets/comments";
import createHandler from "@/pages/api/technical-tickets/create";

function createResponse() {
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

function authenticateAs(
  role: string,
  profileId = 10,
  schoolId: number | null = null,
  displayName = "Usuário"
) {
  requireAuthMock.mockResolvedValue({
    id: `user-${profileId}`,
    email: "user@example.com",
    profile: { id: profileId, role, displayName, schoolId },
  });
}

function authenticateNone() {
  requireAuthMock.mockImplementation(async (_req, res) => {
    res.status(401).json({ error: "Token de autorização obrigatório" });
    return null;
  });
}

const routeDay = "2026-11-06";

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    schoolId: 25,
    status: "SCHEDULED",
    routeId: 10,
    scheduledDate: new Date(`${routeDay}T12:00:00-03:00`),
    eventId: null,
    ...overrides,
  };
}

describe("DELETE /api/technical-tickets/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ticketFindUnique.mockResolvedValue(makeTicket());
    ticketUpdate.mockResolvedValue(makeTicket({ status: "DELETED" }));
    membershipFindMany.mockResolvedValue([{ routeId: 10 }]);
    routeFindMany.mockResolvedValue([
      { date: new Date(`${routeDay}T00:00:00.000Z`) },
    ]);
  });

  const callDelete = async () => {
    const res = createResponse();
    await deleteHandler(
      {
        method: "DELETE",
        query: { ticketId: "5" },
        body: { deletionReason: "teste" },
        headers: {},
      } as any,
      res
    );
    return res;
  };

  it("ONLYREAD não exclui chamados", async () => {
    authenticateAs("ONLYREAD", 30);
    const res = await callDelete();
    expect(res.statusCode).toBe(403);
    expect(ticketUpdate).not.toHaveBeenCalled();
  });

  it("SCHOOL não exclui chamados", async () => {
    authenticateAs("SCHOOL", 31, 25);
    const res = await callDelete();
    expect(res.statusCode).toBe(403);
    expect(ticketUpdate).not.toHaveBeenCalled();
  });

  it("técnico não exclui chamado de outra rota", async () => {
    authenticateAs("TECH", 10);
    ticketFindUnique.mockResolvedValue(makeTicket({ routeId: 20 }));

    const res = await callDelete();
    expect(res.statusCode).toBe(403);
    expect(ticketUpdate).not.toHaveBeenCalled();
  });

  it("técnico exclui chamado da própria rota com autor da sessão", async () => {
    authenticateAs("TECH", 10);
    const res = await callDelete();
    expect(res.statusCode).toBe(200);
    expect(ticketUpdate.mock.calls[0][0].data.deletedBy).toBe("user-10");
  });

  it("usuário de escola não vê chamados excluídos de outra escola", async () => {
    authenticateAs("SCHOOL", 31, 25);
    const res = createResponse();
    await deletedHandler(
      { method: "GET", query: { schoolId: "99" }, headers: {} } as any,
      res
    );
    expect(res.statusCode).toBe(403);
    expect(ticketFindMany).not.toHaveBeenCalled();
  });

  it("chamados excluídos exigem autenticação", async () => {
    authenticateNone();
    const res = createResponse();
    await deletedHandler(
      { method: "GET", query: { schoolId: "25" }, headers: {} } as any,
      res
    );
    expect(res.statusCode).toBe(401);
    expect(ticketFindMany).not.toHaveBeenCalled();
  });

  it("usuário de escola vê os próprios chamados excluídos", async () => {
    authenticateAs("SCHOOL", 31, 25);
    ticketFindMany.mockResolvedValue([]);
    const res = createResponse();
    await deletedHandler(
      { method: "GET", query: { schoolId: "25" }, headers: {} } as any,
      res
    );
    expect(res.statusCode).toBe(200);
    expect(ticketFindMany.mock.calls[0][0].where.schoolId).toBe(25);
  });
});

describe("POST /api/technical-tickets/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ticketFindUnique.mockResolvedValue(makeTicket());
    commentCreate.mockImplementation(async ({ data }: any) => ({
      id: 1,
      ...data,
    }));
    membershipFindMany.mockResolvedValue([{ routeId: 10 }]);
    routeFindMany.mockResolvedValue([
      { date: new Date(`${routeDay}T00:00:00.000Z`) },
    ]);
  });

  it("autor do comentário vem da sessão, ignorando o corpo", async () => {
    authenticateAs("TECH", 10, null, "Fulano Técnico");

    const res = createResponse();
    await commentsHandler(
      {
        method: "POST",
        query: { ticketId: "5" },
        body: {
          authorId: "outro-usuario",
          authorName: "Nome Falso",
          authorRole: "ADMIN",
          content: "Comentário",
        },
        headers: {},
      } as any,
      res
    );

    expect(res.statusCode).toBe(201);
    expect(commentCreate.mock.calls[0][0].data).toMatchObject({
      authorId: "user-10",
      authorName: "Fulano Técnico",
      authorRole: "TECH",
    });
  });

  it("técnico não comenta em chamado de outra rota", async () => {
    authenticateAs("TECH", 10);
    ticketFindUnique.mockResolvedValue(makeTicket({ routeId: 20 }));

    const res = createResponse();
    await commentsHandler(
      {
        method: "POST",
        query: { ticketId: "5" },
        body: { content: "Comentário" },
        headers: {},
      } as any,
      res
    );

    expect(res.statusCode).toBe(403);
    expect(commentCreate).not.toHaveBeenCalled();
  });

  it("escola não comenta em chamado de outra escola", async () => {
    authenticateAs("SCHOOL", 31, 25);
    ticketFindUnique.mockResolvedValue(makeTicket({ schoolId: 99 }));

    const res = createResponse();
    await commentsHandler(
      {
        method: "GET",
        query: { ticketId: "5" },
        headers: {},
      } as any,
      res
    );

    expect(res.statusCode).toBe(403);
    expect(commentFindMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/technical-tickets/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ticketCreate.mockImplementation(async ({ data }: any) => ({
      id: 1,
      ...data,
    }));
  });

  const body = {
    schoolId: 25,
    title: "Chamado",
    description: "Descrição",
  };

  it("escola só abre chamado para a própria escola", async () => {
    authenticateAs("SCHOOL", 31, 25);
    const res = createResponse();
    await createHandler(
      { method: "POST", body: { ...body, schoolId: 99 }, query: {}, headers: {} } as any,
      res
    );
    expect(res.statusCode).toBe(403);
    expect(ticketCreate).not.toHaveBeenCalled();
  });

  it("escola abre chamado para a própria escola", async () => {
    authenticateAs("SCHOOL", 31, 25);
    const res = createResponse();
    await createHandler(
      { method: "POST", body, query: {}, headers: {} } as any,
      res
    );
    expect(res.statusCode).toBe(201);
    expect(ticketCreate.mock.calls[0][0].data.createdBy).toBe("user-31");
  });
});
