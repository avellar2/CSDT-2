import { describe, expect, it } from "vitest";
import {
  classifySchoolUnit,
  isSchoolUnitForSurvey,
  normalizeUnitName,
  type SchoolEligibilityRow,
} from "@/utils/feedback/schoolEligibility";

const base: SchoolEligibilityRow = {
  id: 1,
  name: "EM TESTE",
  district: "1",
  email: "escola@edu.br",
  inep: 33000123,
  students: 300,
  parentSchoolId: null,
  surveyUnitType: null,
  surveyEligible: null,
  surveyAuditReason: null,
};

describe("Elegibilidade das unidades (School)", () => {
  it("normaliza nomes para comparação", () => {
    expect(normalizeUnitName("  Ação   Ção ")).toBe("ACAO CAO");
    expect(normalizeUnitName(null)).toBe("");
  });

  it("exclui CSDT, CAPC, SUPLAN, DEJUR, SAGP, PROTOCOLO e PATRIMONIO", () => {
    const sectors = [
      { id: 225, name: "CSDT" },
      { id: 246, name: "CAPC" },
      { id: 252, name: "SUPLAN" },
      { id: 216, name: "DEJUR" },
      { id: 238, name: "SAGP" },
      { id: 212, name: "PROTOCOLO" },
      { id: 256, name: "PATRIMONIO" },
    ];

    for (const sector of sectors) {
      const decision = classifySchoolUnit({
        ...base,
        id: sector.id,
        name: sector.name,
        district: "SEDE",
        inep: 0,
        students: 0,
        email: `${sector.name.toLowerCase()}@smeduquedecaxias.rj.gov.br`,
      });
      expect(decision.type, sector.name).toBe("ADMIN_SECTOR");
      expect(decision.eligible, sector.name).toBe(false);
      expect(decision.source, sector.name).toBe("SEDE");
      expect(isSchoolUnitForSurvey({ ...base, id: sector.id, name: sector.name, district: "SEDE", inep: 0, students: 0 })).toBe(false);
    }
  });

  it("exclui todos os 56 registros de SEDE por sinal estrutural", () => {
    const decision = classifySchoolUnit({
      ...base,
      name: "QUALQUER SIGLA",
      district: "SEDE",
      inep: 0,
      students: 0,
    });
    expect(decision.type).toBe("ADMIN_SECTOR");
    expect(decision.reason).toContain("SEDE");
  });

  it("reconhece setores administrativos fora de SEDE", () => {
    const names = [
      "SME",
      "FUNDEC",
      "CADIS",
      "QG CADIS (EDNA)",
      "CENTRO DE FORMAÇÃO DA GUARDA MUNICIPAL",
      "CRPH /MUSEU VIVO",
      "CEPEMHED",
      "ASS. PESTALOSE",
    ];
    for (const name of names) {
      const decision = classifySchoolUnit({
        ...base,
        name,
        district: "4",
        inep: 0,
        students: 0,
      });
      expect(decision.type, name).toBe("ADMIN_SECTOR");
      expect(decision.eligible, name).toBe(false);
    }
  });

  it("considera escola quando há INEP", () => {
    const decision = classifySchoolUnit({ ...base, inep: 33000123, students: 0 });
    expect(decision).toMatchObject({ type: "SCHOOL", eligible: true, source: "INEP" });
  });

  it("considera escola quando há matrículas", () => {
    const decision = classifySchoolUnit({ ...base, inep: 0, students: 120 });
    expect(decision).toMatchObject({ type: "SCHOOL", eligible: true, source: "STUDENTS" });
  });

  it("considera escola anexa quando há vínculo estrutural", () => {
    const decision = classifySchoolUnit({
      ...base,
      name: "UNIDADE VINCULADA",
      inep: 0,
      students: 0,
      parentSchoolId: 10,
    });
    expect(decision).toMatchObject({ type: "SCHOOL", eligible: true, source: "ANNEX" });
  });

  it("usa o nome apenas como último recurso estrutural", () => {
    const creche = classifySchoolUnit({
      ...base,
      name: "CRECHE MUNICIPAL X",
      inep: 0,
      students: 0,
      parentSchoolId: null,
    });
    expect(creche).toMatchObject({ type: "SCHOOL", source: "NAME" });

    const anexo = classifySchoolUnit({
      ...base,
      name: "ANEXO (Creche) CIEP 031",
      inep: 0,
      students: 0,
      parentSchoolId: null,
    });
    expect(anexo.type).toBe("SCHOOL");
  });

  it("mantém em revisão o que não tem sinal escolar", () => {
    const decision = classifySchoolUnit({
      ...base,
      name: "TERCEIRIZADOS",
      inep: 0,
      students: 0,
      parentSchoolId: null,
    });
    expect(decision).toMatchObject({ type: "REVIEW", eligible: false });
  });

  it("override persistido tem precedência sobre a heurística", () => {
    const overrideFalse = classifySchoolUnit({
      ...base,
      surveyUnitType: "ADMIN_SECTOR",
      surveyEligible: false,
      surveyAuditReason: "Setor confirmado como administrativo.",
    });
    expect(overrideFalse).toMatchObject({
      type: "ADMIN_SECTOR",
      eligible: false,
      source: "PERSISTED",
    });

    const overrideTrue = classifySchoolUnit({
      ...base,
      name: "CEJA",
      district: "SEDE",
      inep: 0,
      students: 0,
      surveyUnitType: "SCHOOL",
      surveyEligible: true,
      surveyAuditReason: "Unidade educacional confirmada.",
    });
    expect(overrideTrue).toMatchObject({
      type: "SCHOOL",
      eligible: true,
      source: "PERSISTED",
      reason: "Unidade educacional confirmada.",
    });
  });

  it("setor administrativo nunca é elegível para campanha oficial", () => {
    for (const id of [225, 246, 252, 216, 238, 212, 256]) {
      expect(
        isSchoolUnitForSurvey({
          ...base,
          id,
          name: `SETOR ${id}`,
          district: "SEDE",
          inep: 0,
          students: 0,
        }),
      ).toBe(false);
    }
  });
});
