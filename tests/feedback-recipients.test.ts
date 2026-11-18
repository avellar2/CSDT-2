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
  district = "Centro",
): SchoolRecipientRow => ({ id, name, email, district });

describe("Auditoria de destinatários", () => {
  it("normaliza e valida e-mails", () => {
    expect(normalizeSchoolEmail("  Escola@Exemplo.COM ")).toBe("escola@exemplo.com");
    expect(isValidSchoolEmail("escola@exemplo.com")).toBe(true);
    expect(isValidSchoolEmail("escola@exemplo")).toBe(false);
    expect(isValidSchoolEmail("escola exemplo@exemplo.com")).toBe(false);
    expect(isValidSchoolEmail(".escola@exemplo.com")).toBe(false);
    expect(isValidSchoolEmail("escola..x@exemplo.com")).toBe(false);
    expect(isValidSchoolEmail("")).toBe(false);
    expect(isValidSchoolEmail(null)).toBe(false);
  });

  it("nunca inventa endereço para escola sem e-mail", () => {
    const plan = planRecipients([
      school(1, "EM A", "a@edu.br"),
      school(2, "EM B", null),
      school(3, "EM C", "   "),
    ]);
    expect(plan.missingEmail.map((row) => row.id)).toEqual([2, 3]);
    expect(plan.eligibleSchools.map((row) => row.id)).toEqual([1]);
    expect(plan.totalInvites).toBe(1);
  });

  it("separa endereços inválidos", () => {
    const plan = planRecipients([
      school(1, "EM A", "a@edu.br"),
      school(2, "EM B", "b@invalido"),
      school(3, "EM C", "nao é email"),
    ]);
    expect(plan.invalidEmail.map((row) => row.id)).toEqual([2, 3]);
    expect(plan.eligibleSchools.map((row) => row.id)).toEqual([1]);
  });

  it("exclui a unidade administrativa do CSDT", () => {
    expect(isEligibleSchool(school(225, "CSDT", "csdt@edu.br"))).toBe(false);
    expect(isEligibleSchool(school(999, "CSDT", "csdt@edu.br"))).toBe(false);
    expect(isEligibleSchool(school(10, "EM ALEGRE", "a@edu.br"))).toBe(true);

    const plan = planRecipients([
      school(225, "CSDT", "csdt@edu.br"),
      school(10, "EM ALEGRE", "a@edu.br"),
    ]);
    expect(plan.excludedSchools.map((row) => row.id)).toEqual([225]);
    expect(plan.totalInvites).toBe(1);
  });

  it("mantém convites distintos por escola e agrupa e-mails compartilhados", () => {
    const plan = planRecipients([
      school(1, "EM A", "compartilhado@edu.br"),
      school(2, "EM A - ANEXO", "COMPARTILHADO@edu.br"),
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

  it("ordena os grupos e as escolas de forma determinística", () => {
    const plan = planRecipients([
      school(2, "ZEBRA", "z@edu.br"),
      school(1, "ALFA", "a@edu.br"),
      school(3, "BETA", "a@edu.br"),
    ]);
    expect(plan.groups.map((group) => group.email)).toEqual(["a@edu.br", "z@edu.br"]);
    expect(plan.groups[0].schools.map((row) => row.name)).toEqual(["ALFA", "BETA"]);
  });

  it("resume o plano para o painel", () => {
    const plan = planRecipients([
      school(1, "EM A", "a@edu.br"),
      school(2, "EM B", "a@edu.br"),
      school(3, "EM C", null),
      school(4, "EM D", "invalido"),
      school(225, "CSDT", "csdt@edu.br"),
    ]);
    expect(summarizeRecipientPlan(plan)).toEqual({
      totalSchools: 5,
      eligibleSchools: 2,
      missingEmail: 1,
      invalidEmail: 1,
      excludedSchools: 1,
      duplicateEmails: 1,
      totalInvites: 2,
      totalMessages: 1,
      savedMessages: 1,
    });
  });
});
