import { describe, it, expect } from "vitest";
import { buildMemorandumNumber } from "../src/utils/memorandumNumber";

describe("buildMemorandumNumber", () => {
  it("comeca em 1/ano quando nao ha memorando anterior no ano", () => {
    expect(buildMemorandumNumber(null, 2026)).toBe("1/2026");
  });

  it("incrementa o sequencial a partir do ultimo numero do ano", () => {
    expect(buildMemorandumNumber("5/2026", 2026)).toBe("6/2026");
  });

  it("reinicia o sequencial quando o ano muda", () => {
    expect(buildMemorandumNumber("10/2025", 2026)).toBe("1/2026");
  });

  it("trata numero malformado voltando para 1", () => {
    expect(buildMemorandumNumber("abc/2026", 2026)).toBe("1/2026");
  });
});