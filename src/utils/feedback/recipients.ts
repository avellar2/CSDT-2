/**
 * Auditoria dos destinatários da pesquisa.
 *
 * A tabela School mistura unidades escolares e setores administrativos da SME.
 * A elegibilidade vem de `classifySchoolUnit` (estrutural + classificação
 * persistida), nunca da suposição de que todo registro é uma escola.
 *
 * Nenhum endereço é inventado: unidades sem e-mail ficam de fora, endereços
 * inválidos não são enviados e um mesmo e-mail compartilhado por mais de uma
 * unidade gera convites distintos, mas apenas uma mensagem.
 */

import {
  classifySchoolUnit,
  type EligibilitySource,
  type SchoolEligibilityRow,
  type SchoolUnitType,
} from "./schoolEligibility";

export type SchoolRecipientRow = SchoolEligibilityRow;

export interface RecipientGroup {
  email: string;
  schools: SchoolRecipientRow[];
}

export type EmailIssue = "MISSING" | "INVALID" | null;

export interface ExcludedSchoolRecord {
  id: number;
  name: string;
  email: string | null;
  district: string | null;
  type: SchoolUnitType;
  reason: string;
  source: EligibilitySource;
  emailIssue: EmailIssue;
}

export interface RecipientPlan {
  totalSchools: number;
  /** Registros classificados como unidade escolar (antes do e-mail). */
  schoolUnits: number;
  /** Unidades escolares com e-mail válido. */
  eligibleSchools: SchoolRecipientRow[];
  missingEmail: SchoolRecipientRow[];
  invalidEmail: SchoolRecipientRow[];
  /** Todos os registros que não receberão convite, com o motivo. */
  excludedSchools: ExcludedSchoolRecord[];
  duplicateGroups: RecipientGroup[];
  groups: RecipientGroup[];
  totalInvites: number;
  totalMessages: number;
  savedMessages: number;
  adminSectors: number;
  reviewUnits: number;
}

const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function normalizeSchoolEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isValidSchoolEmail(email: string | null | undefined): boolean {
  const normalized = normalizeSchoolEmail(email);
  if (!normalized) return false;
  if (normalized.length > 254) return false;
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return false;
  }
  if (domain.endsWith(".")) return false;
  return EMAIL_PATTERN.test(normalized);
}

/** Elegível apenas se a classificação estrutural/persistida for SCHOOL. */
export function isEligibleSchool(school: SchoolRecipientRow): boolean {
  return classifySchoolUnit(school).type === "SCHOOL";
}

/**
 * Classifica as escolas em unidades elegíveis, unidades sem/ com e-mail
 * inválido e registros excluídos (setores administrativos, revisão e e-mail).
 */
export function planRecipients(schools: SchoolRecipientRow[]): RecipientPlan {
  const eligibleSchools: SchoolRecipientRow[] = [];
  const missingEmail: SchoolRecipientRow[] = [];
  const invalidEmail: SchoolRecipientRow[] = [];
  const excludedSchools: ExcludedSchoolRecord[] = [];
  let schoolUnits = 0;
  let adminSectors = 0;
  let reviewUnits = 0;

  for (const school of schools) {
    const decision = classifySchoolUnit(school);
    const base = {
      id: school.id,
      name: school.name,
      email: school.email ?? null,
      district: school.district ?? null,
      type: decision.type,
      reason: decision.reason,
      source: decision.source,
    };

    if (decision.type !== "SCHOOL") {
      if (decision.type === "ADMIN_SECTOR") adminSectors += 1;
      else reviewUnits += 1;
      excludedSchools.push({ ...base, emailIssue: null });
      continue;
    }

    schoolUnits += 1;
    const rawEmail = (school.email ?? "").trim();

    if (!rawEmail) {
      missingEmail.push(school);
      excludedSchools.push({
        ...base,
        reason: "Unidade escolar sem e-mail cadastrado.",
        emailIssue: "MISSING",
      });
      continue;
    }

    if (!isValidSchoolEmail(rawEmail)) {
      invalidEmail.push(school);
      excludedSchools.push({
        ...base,
        reason: `E-mail inválido no cadastro: ${rawEmail}`,
        emailIssue: "INVALID",
      });
      continue;
    }

    eligibleSchools.push(school);
  }

  const byEmail = new Map<string, SchoolRecipientRow[]>();
  for (const school of eligibleSchools) {
    const key = normalizeSchoolEmail(school.email);
    const bucket = byEmail.get(key);
    if (bucket) bucket.push(school);
    else byEmail.set(key, [school]);
  }

  const groups: RecipientGroup[] = Array.from(byEmail.entries())
    .map(([email, groupSchools]) => ({
      email,
      schools: [...groupSchools].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    }))
    .sort((a, b) => a.email.localeCompare(b.email));

  const duplicateGroups = groups.filter((group) => group.schools.length > 1);

  return {
    totalSchools: schools.length,
    schoolUnits,
    eligibleSchools,
    missingEmail,
    invalidEmail,
    excludedSchools,
    duplicateGroups,
    groups,
    totalInvites: eligibleSchools.length,
    totalMessages: groups.length,
    savedMessages: eligibleSchools.length - groups.length,
    adminSectors,
    reviewUnits,
  };
}

/** Resumo numérico usado no painel e na autorização de envio. */
export function summarizeRecipientPlan(plan: RecipientPlan) {
  return {
    totalSchools: plan.totalSchools,
    schoolUnits: plan.schoolUnits,
    eligibleSchools: plan.eligibleSchools.length,
    missingEmail: plan.missingEmail.length,
    invalidEmail: plan.invalidEmail.length,
    adminSectors: plan.adminSectors,
    reviewUnits: plan.reviewUnits,
    excludedRecords: plan.excludedSchools.length,
    duplicateEmails: plan.duplicateGroups.length,
    totalInvites: plan.totalInvites,
    totalMessages: plan.totalMessages,
    savedMessages: plan.savedMessages,
  };
}
