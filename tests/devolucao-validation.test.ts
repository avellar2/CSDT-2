import { describe, it, expect } from "vitest";
import {
  validateItemsBelongToSchoolById,
  validateDevolucaoRequestBody,
  CSDT_SCHOOL_ID,
} from "../src/utils/devolucao-validation";

describe("validateItemsBelongToSchoolById (por schoolId, nunca por nome)", () => {
  it("aceita quando todos os itens pertencem a escola de origem", () => {
    const items = [
      { id: 1, schoolId: 300 },
      { id: 2, schoolId: 300 },
    ];
    const r = validateItemsBelongToSchoolById(items, 300);
    expect(r.valid).toBe(true);
    expect(r.invalid).toHaveLength(0);
  });

  it("rejeita item pertencente a outra escola", () => {
    const items = [
      { id: 1, schoolId: 300 },
      { id: 2, schoolId: 999 },
    ];
    const r = validateItemsBelongToSchoolById(items, 300);
    expect(r.valid).toBe(false);
    expect(r.invalid).toHaveLength(1);
    expect(r.invalid[0].id).toBe(2);
  });

  it("rejeita item sem schoolId (ja movimentado)", () => {
    const items = [{ id: 1, schoolId: null }];
    const r = validateItemsBelongToSchoolById(items, 300);
    expect(r.valid).toBe(false);
  });
});

describe("validateDevolucaoRequestBody", () => {
  it("aceita body valido", () => {
    const r = validateDevolucaoRequestBody({
      itemIds: [1, 2, 3],
      sourceSchoolId: 300,
      district: "SEDE",
    });
    expect(r.valid).toBe(true);
    expect(r.itemIds).toEqual([1, 2, 3]);
  });

  it("aceita sem district (opcional)", () => {
    const r = validateDevolucaoRequestBody({
      itemIds: [1],
      sourceSchoolId: 300,
    });
    expect(r.valid).toBe(true);
  });

  it("rejeita itemIds vazio", () => {
    const r = validateDevolucaoRequestBody({ itemIds: [], sourceSchoolId: 300 });
    expect(r.valid).toBe(false);
  });

  it("rejeita itemIds nao inteiro", () => {
    const r = validateDevolucaoRequestBody({
      itemIds: [1, 2.5],
      sourceSchoolId: 300,
    });
    expect(r.valid).toBe(false);
  });

  it("rejeita itemIds com duplicados", () => {
    const r = validateDevolucaoRequestBody({
      itemIds: [1, 2, 2],
      sourceSchoolId: 300,
    });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/duplicados/i);
  });

  it("rejeita sourceSchoolId invalido", () => {
    const r = validateDevolucaoRequestBody({
      itemIds: [1],
      sourceSchoolId: 0,
    });
    expect(r.valid).toBe(false);
  });

  it("rejeita sourceSchoolId === CSDT_SCHOOL_ID (nao devolve do CSDT para o CSDT)", () => {
    const r = validateDevolucaoRequestBody({
      itemIds: [1],
      sourceSchoolId: CSDT_SCHOOL_ID,
    });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/CSDT/i);
  });
});