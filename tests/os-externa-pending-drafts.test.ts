import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLaunchAttempt,
  clearPendingFinalization,
  draftFingerprint,
  findPendingForDraft,
  getAttemptRequestId,
  mergePhotoUrls,
  readPendingFinalizations,
  recordAttemptOs,
  serializeFormDraft,
  startNewLaunchAttempt,
  writePendingFinalization,
} from "@/utils/osExternaPendingDrafts";

beforeAll(() => {
  (globalThis as any).window = globalThis;
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
});

beforeEach(() => {
  vi.useRealTimers();
  (globalThis as any).localStorage.clear();
});

describe("rascunhos de finalização", () => {
  const base = {
    numeroOs: "651/2026",
    stage: "fotos" as const,
    school: "E.M. Bilíngue Ziraldo Alves Pinto",
    date: "2026-11-25",
    form: { unidadeEscolar: "E.M. Bilíngue Ziraldo Alves Pinto" },
  };

  it("NÃO expira após 24 horas (regra anterior apagava silenciosamente)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-25T12:00:00-03:00"));
    writePendingFinalization("user-1", { ...base, at: Date.now() });

    vi.setSystemTime(new Date("2026-12-30T12:00:00-03:00"));
    const list = readPendingFinalizations("user-1");
    expect(list).toHaveLength(1);
    expect(list[0].numeroOs).toBe("651/2026");
  });

  it("NÃO descarta registros ao passar de cinco pendências", () => {
    for (let index = 0; index < 8; index++) {
      writePendingFinalization("user-1", {
        ...base,
        numeroOs: `${index}/2026`,
        at: Date.now() + index,
      });
    }
    expect(readPendingFinalizations("user-1")).toHaveLength(8);
  });

  it("preserva rascunhos de outros usuários separadamente", () => {
    writePendingFinalization("user-1", { ...base, at: Date.now() });
    writePendingFinalization("user-2", {
      ...base,
      numeroOs: "900/2026",
      at: Date.now(),
    });

    expect(readPendingFinalizations("user-1").map((p) => p.numeroOs)).toEqual([
      "651/2026",
    ]);
    expect(readPendingFinalizations("user-2").map((p) => p.numeroOs)).toEqual([
      "900/2026",
    ]);
  });

  it("remove apenas a OS concluída/descartada", () => {
    writePendingFinalization("user-1", { ...base, at: 1 });
    writePendingFinalization("user-1", {
      ...base,
      numeroOs: "652/2026",
      at: 2,
    });

    clearPendingFinalization("user-1", "651/2026");
    expect(readPendingFinalizations("user-1").map((p) => p.numeroOs)).toEqual([
      "652/2026",
    ]);
  });

  it("encontra o rascunho do mesmo atendimento por escola + conteúdo", () => {
    writePendingFinalization("user-1", {
      ...base,
      at: Date.now(),
      form: {
        unidadeEscolar: "E.M. Bilíngue Ziraldo Alves Pinto",
        tecnicoResponsavel: "Alexandre / Hélio",
        solicitacaoDaVisita: "Sem internet",
        relatorio: "Roteador reiniciado",
        solucionado: "Sim",
      },
    });

    const found = findPendingForDraft("user-1", {
      unidadeEscolar: "e.m. bilíngue ziraldo alves pinto",
      tecnicoResponsavel: "Alexandre / Hélio",
      solicitacaoDaVisita: "Sem internet",
      relatorio: "Roteador reiniciado",
      solucionado: "Sim",
    });

    expect(found?.numeroOs).toBe("651/2026");
  });
});

describe("identidade da tentativa (clientRequestId)", () => {
  const form = {
    unidadeEscolar: "EM ZIRALDO",
    tecnicoResponsavel: "Yuri",
    solicitacaoDaVisita: "Sem internet",
    relatorio: "Roteador reiniciado",
    solucionado: "Sim",
  };

  it("mantém a MESMA tentativa mesmo após mudança de dia", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-25T23:50:00-03:00"));
    const first = getAttemptRequestId("user-1", form);

    vi.setSystemTime(new Date("2026-11-27T09:00:00-03:00"));
    const second = getAttemptRequestId("user-1", form);

    expect(second).toBe(first);
  });

  it("conteúdo diferente gera nova tentativa (novo atendimento legítimo)", () => {
    const first = getAttemptRequestId("user-1", form);
    const second = getAttemptRequestId("user-1", {
      ...form,
      relatorio: "Troca de switch",
    });
    expect(second).not.toBe(first);
  });

  it("guarda o número da OS na tentativa e o mantém no retry", () => {
    const first = getAttemptRequestId("user-1", form);
    recordAttemptOs("user-1", "651/2026");
    expect(getAttemptRequestId("user-1", form)).toBe(first);
  });

  it("depois de salvar, conteúdo diferente NÃO reutiliza a OS anterior", () => {
    const first = getAttemptRequestId("user-1", form);
    recordAttemptOs("user-1", "651/2026");
    const second = getAttemptRequestId("user-1", {
      ...form,
      solicitacaoDaVisita: "Troca de impressora",
    });
    expect(second).not.toBe(first);
  });

  it("'Iniciar nova OS' gera novo clientRequestId", () => {
    const first = getAttemptRequestId("user-1", form);
    startNewLaunchAttempt("user-1");
    const second = getAttemptRequestId("user-1", form);
    expect(second).not.toBe(first);
  });

  it("concluir a tentativa libera um novo id para o próximo atendimento", () => {
    const first = getAttemptRequestId("user-1", form);
    recordAttemptOs("user-1", "651/2026");
    clearLaunchAttempt("user-1");
    const second = getAttemptRequestId("user-1", form);
    expect(second).not.toBe(first);
  });

  it("fingerprint não inclui data (evita duplicar após meia-noite)", () => {
    expect(draftFingerprint({ ...form, data: "2026-11-25" })).toBe(
      draftFingerprint({ ...form, data: "2026-11-27" })
    );
  });
});

describe("serialização e merge de fotos", () => {
  it("não serializa File (evita URL vazia no banco)", () => {
    const draft = serializeFormDraft({
      unidadeEscolar: "EM ZIRALDO",
      fotosAntes: [{ name: "a.jpg" }, "https://x/a.jpg"],
      fotosDepois: [],
    });

    expect(draft.fotosAntes).toEqual(["https://x/a.jpg"]);
    expect(draft.fotosDepois).toEqual([]);
  });

  it("mescla URLs sem duplicar e sem apagar as existentes", () => {
    expect(
      mergePhotoUrls(["a", ""], ["a", "b"], undefined)
    ).toEqual(["a", "b"]);
  });
});
