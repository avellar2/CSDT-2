import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A tabela `OsExternaFinalizationState` é uma migração ADITIVA ainda não
 * aplicada no banco de produção. Até ser aplicada, toda chamada deve degradar
 * silenciosamente e o fluxo deve continuar usando a derivação pela própria OS.
 */

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  findMany: vi.fn(),
  chamadosFindMany: vi.fn(),
}));

vi.mock("@/utils/prisma", () => ({
  default: {
    osExternaFinalizationState: {
      upsert: mocks.upsert,
      findMany: mocks.findMany,
    },
    chamados_escalas: {
      findMany: mocks.chamadosFindMany,
    },
  },
}));

import {
  loadOsExternaFinalizationStates,
  loadOsWithReagendamentoChamado,
  saveOsExternaFinalizationState,
} from "@/utils/osExternaFinalizationState";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("estado de finalização sem a tabela migrada", () => {
  it("salvar não quebra quando a tabela não existe (P2021)", async () => {
    mocks.upsert.mockRejectedValue({ code: "P2021" });

    await expect(
      saveOsExternaFinalizationState({ osId: 1, stage: "fotos" })
    ).resolves.toBe(false);
  });

  it("carregar devolve mapa vazio quando a tabela não existe", async () => {
    mocks.findMany.mockRejectedValue({ code: "P2021" });

    const states = await loadOsExternaFinalizationStates([1, 2]);
    expect(states.size).toBe(0);
  });

  it("carregar devolve as etapas quando a tabela existe", async () => {
    mocks.findMany.mockResolvedValue([
      { osId: 1, stage: "email" },
      { osId: 2, stage: "chamado" },
    ]);

    const states = await loadOsExternaFinalizationStates([1, 2]);
    expect(states.get(1)).toBe("email");
    expect(states.get(2)).toBe("chamado");
  });

  it("consulta de chamados indisponível não derruba a lista", async () => {
    mocks.chamadosFindMany.mockRejectedValue(new Error("sem tabela"));

    const found = await loadOsWithReagendamentoChamado(["651/2026"]);
    expect(found.size).toBe(0);
  });

  it("identifica OS que já têm chamado de reagendamento", async () => {
    mocks.chamadosFindMany.mockResolvedValue([
      { osOriginal: "652/2026" },
      { osOriginal: null },
    ]);

    const found = await loadOsWithReagendamentoChamado([
      "651/2026",
      "652/2026",
    ]);
    expect(found.has("652/2026")).toBe(true);
    expect(found.has("651/2026")).toBe(false);
  });
});
