import { describe, expect, it } from "vitest";
import {
  isEligibleSchool,
  isValidSchoolEmail,
  normalizeSchoolEmail,
  planRecipients,
  summarizeRecipientPlan,
  type SchoolRecipientRow,
} from "@/utils/feedback/recipients";

const school = (
  id: number,
  name: string,
  email: string | null,
  extra: Partial<SchoolRecipientRow> = {},
): SchoolRecipientRow => ({
  id,
  name,
  email,
  district: "1",
  inep: 33000000 + id,
  students: 100,
  parentSchoolId: null,
  ...extra,
});

const sedeSector = (
  id: number,
  name: string,
  email: string | null,
): SchoolRecipientRow =>
  school(id, name, email, { district: "SEDE", inep: 0, students: 0 });

describe("Auditoria de destinatários", () => {
  it("normaliza e valida e-mails", () => {
    expect(normalizeSchoolEmail("  Escola@Exemplo.COM ")).toBe("escola@exemplo.com");
    expect(isValidSchoolEmail("escola@exemplo.com")).toBe(true);
    expect(isValidSchoolEmail("escola@exemplo")).toBe(false);
    expect(isValidSchoolEmail("não informado")).toBe(false);
    expect(isValidSchoolEmail("XXXXX")).toBe(false);
    expect(isValidSchoolEmail("")).toBe(false);
    expect(isValidSchoolEmail(null)).toBe(false);
  });

  it("exclui os setores administrativos de SEDE com motivo", () => {
    const plan = planRecipients([
      sedeSector(225, "CSDT", "vandersonavellar1997@gmail.com"),
      sedeSector(246, "CAPC", "capc@smeduquedecaxias.rj.gov.br"),
      sedeSector(216, "DEJUR", "dejur@smeduquedecaxias.rj.gov.br"),
      sedeSector(238, "SAGP", "sagp@smeduquedecaxias.rj.gov.br"),
      sedeSector(252, "SUPLAN", "suplan@smeduquedecaxias.rj.gov.br"),
      sedeSector(212, "PROTOCOLO", "protocolo@smeduquedecaxias.rj.gov.br"),
      sedeSector(256, "PATRIMONIO", "patrimonio@smeduquedecaxias.rj.gov.br"),
    ]);

    expect(plan.totalInvites).toBe(0);
    expect(plan.groups).toHaveLength(0);
    expect(plan.eligibleSchools).toHaveLength(0);
    expect(plan.adminSectors).toBe(7);
    expect(plan.schoolUnits).toBe(0);

    const byName = new Map(plan.excludedSchools.map((item) => [item.name, item]));
    for (const name of [
      "CSDT",
      "CAPC",
      "DEJUR",
      "SAGP",
      "SUPLAN",
      "PROTOCOLO",
      "PATRIMONIO",
    ]) {
      expect(byName.get(name)?.type).toBe("ADMIN_SECTOR");
      expect(byName.get(name)?.reason).toContain("SEDE");
      expect(byName.get(name)?.source).toBe("SEDE");
    }
  });

  it("exclui setores administrativos cadastrados fora de SEDE", () => {
    const plan = planRecipients([
      school(471, "SME", "sme@edu.br", { district: "1", inep: 0, students: 0 }),
      school(472, "FUNDEC", "fundec@edu.br", { district: "1", inep: 0, students: 0 }),
      school(466, "CADIS", "cadis@smeduquedecaxias.rj.gov.br", { district: "4", inep: 0, students: 0 }),
      school(260, "QG CADIS (EDNA)", "patrimonio@smeduquedecaxias.rj.gov.br", { district: "4", inep: 0, students: 0 }),
      school(267, "CENTRO DE FORMAÇÃO DA GUARDA MUNICIPAL", null, { district: "4", inep: 0, students: 0 }),
      school(141, "CRPH /MUSEU VIVO", null, { district: "2", inep: 0, students: 0 }),
    ]);
    expect(plan.totalInvites).toBe(0);
    expect(plan.adminSectors).toBe(6);
  });

  it("mantém escolas reais elegíveis por sinal estrutural", () => {
    const plan = planRecipients([
      school(1, "EM ALFA", "alfa@edu.br"),
      school(2, "ESCOLA BETA", "beta@edu.br", { inep: 0, students: 200 }),
      school(3, "ANEXO GAMA", "gama@edu.br", {
        inep: 0,
        students: 0,
        parentSchoolId: 1,
      }),
      school(4, "CRECHE DELTA", "delta@edu.br", { inep: 0, students: 0 }),
    ]);
    expect(plan.eligibleSchools.map((row) => row.id)).toEqual([1, 2, 3, 4]);
    expect(plan.totalInvites).toBe(4);
  });

  it("não inventa e-mail e lista o motivo da exclusão", () => {
    const plan = planRecipients([
      school(1, "EM ALFA", "alfa@edu.br"),
      school(2, "EM BETA", null),
      school(3, "EM GAMA", "   "),
      school(4, "EM DELTA", "não informado"),
    ]);
    expect(plan.missingEmail.map((row) => row.id)).toEqual([2, 3]);
    expect(plan.invalidEmail.map((row) => row.id)).toEqual([4]);

    const excluded = new Map(plan.excludedSchools.map((row) => [row.id, row]));
    expect(excluded.get(2)?.emailIssue).toBe("MISSING");
    expect(excluded.get(3)?.emailIssue).toBe("MISSING");
    expect(excluded.get(4)?.emailIssue).toBe("INVALID");
    expect(excluded.get(4)?.reason).toContain("E-mail inválido");
    expect(plan.eligibleSchools.map((row) => row.id)).toEqual([1]);
  });

  it("classifica cadastros ambíguos como revisão e não envia", () => {
    const plan = planRecipients([
      school(500, "TERCEIRIZADOS", "terceirizados@edu.br", {
        district: "4",
        inep: 0,
        students: 0,
        parentSchoolId: null,
      }),
    ]);
    expect(plan.reviewUnits).toBe(1);
    expect(plan.totalInvites).toBe(0);
    expect(plan.excludedSchools[0].type).toBe("REVIEW");
    expect(plan.excludedSchools[0].reason).toContain("revisar");
  });

  it("respeita override auditado (exceção educacional em SEDE)", () => {
    const plan = planRecipients([
      school(232, "CEJA", "ceja@edu.br", {
        district: "SEDE",
        inep: 0,
        students: 0,
        surveyUnitType: "SCHOOL",
        surveyEligible: true,
        surveyAuditReason: "Unidade educacional confirmada pela SME.",
      }),
    ]);
    expect(plan.adminSectors).toBe(0);
    expect(plan.eligibleSchools).toHaveLength(1);
  });

  it("mantém convites distintos por escola e agrupa e-mails compartilhados", () => {
    const plan = planRecipients([
      school(1, "EM A", "compartilhado@edu.br"),
      school(2, "EM A - ANEXO", "COMPARTILHADO@edu.br", {
        inep: 0,
        students: 0,
        parentSchoolId: 1,
      }),
      school(3, "EM B", "b@edu.br"),
    ]);

    expect(plan.totalInvites).toBe(3);
    expect(plan.totalMessages).toBe(2);
    expect(plan.savedMessages).toBe(1);
    expect(plan.duplicateGroups).toHaveLength(1);
    expect(plan.duplicateGroups[0].schools.map((row) => row.name)).toEqual([
      "EM A",
      "EM A - ANEXO",
    ]);
  });

  it("ordena grupos e escolas de forma determinística", () => {
    const plan = planRecipients([
      school(2, "ZEBRA", "z@edu.br"),
      school(1, "ALFA", "a@edu.br"),
      school(3, "BETA", "a@edu.br"),
    ]);
    expect(plan.groups.map((group) => group.email)).toEqual(["a@edu.br", "z@edu.br"]);
    expect(plan.groups[0].schools.map((row) => row.name)).toEqual(["ALFA", "BETA"]);
  });

  it("resume o plano com setores, revisão e e-mail", () => {
    const plan = planRecipients([
      school(1, "EM A", "a@edu.br"),
      school(2, "EM B", "a@edu.br"),
      school(3, "EM C", null),
      school(4, "EM D", "invalido"),
      sedeSector(225, "CSDT", "csdt@edu.br"),
      school(500, "SETOR X", "x@edu.br", { district: "4", inep: 0, students: 0 }),
    ]);
    expect(summarizeRecipientPlan(plan)).toEqual({
      totalSchools: 6,
      schoolUnits: 4,
      eligibleSchools: 2,
      missingEmail: 1,
      invalidEmail: 1,
      adminSectors: 1,
      reviewUnits: 1,
      excludedRecords: 4,
      duplicateEmails: 1,
      totalInvites: 2,
      totalMessages: 1,
      savedMessages: 1,
    });
  });

  it("isEligibleSchool reflete a classificação", () => {
    expect(isEligibleSchool(school(1, "EM A", "a@edu.br"))).toBe(true);
    expect(isEligibleSchool(sedeSector(225, "CSDT", "csdt@edu.br"))).toBe(false);
  });
});
