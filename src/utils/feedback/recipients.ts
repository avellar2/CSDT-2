/**
 * Auditoria dos destinatários da pesquisa.
 *
 * A tabela School é a fonte de verdade. Nenhum endereço é inventado: escolas
 * sem e-mail ficam de fora, endereços inválidos não são enviados e um mesmo
 * e-mail compartilhado por mais de uma unidade gera convites distintos, mas
 * apenas uma mensagem, com um link identificado por escola.
 */

export interface SchoolRecipientRow {
  id: number;
  name: string;
  email: string | null;
  district?: string | null;
  parentSchoolId?: number | null;
}

export interface RecipientGroup {
  /** E-mail normalizado usado como chave do grupamento. */
  email: string;
  schools: SchoolRecipientRow[];
}

export interface RecipientPlan {
  totalSchools: number;
  eligibleSchools: SchoolRecipientRow[];
  missingEmail: SchoolRecipientRow[];
  invalidEmail: SchoolRecipientRow[];
  excludedSchools: SchoolRecipientRow[];
  duplicateGroups: RecipientGroup[];
  groups: RecipientGroup[];
  /** Quantidade de escolas que receberão convite. */
  totalInvites: number;
  /** Quantidade de mensagens de e-mail efetivamente enviadas. */
  totalMessages: number;
  /** Economia de mensagens obtida pelo agrupamento. */
  savedMessages: number;
}

/**
 * Unidades que não devem responder à pesquisa: a própria unidade
 * administrativa do CSDT. Mantida como lista explícita e auditável.
 */
export const NON_SCHOOL_UNIT_IDS = new Set<number>([225]);

const NON_SCHOOL_NAMES = new Set<string>(["CSDT"]);

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

export function isEligibleSchool(school: SchoolRecipientRow): boolean {
  if (NON_SCHOOL_UNIT_IDS.has(school.id)) return false;
  if (NON_SCHOOL_NAMES.has((school.name ?? "").trim().toUpperCase())) return false;
  return true;
}

/**
 * Classifica as escolas em elegíveis, sem e-mail, inválidas e excluídas,
 * agrupando as elegíveis por e-mail normalizado.
 */
export function planRecipients(
  schools: SchoolRecipientRow[],
): RecipientPlan {
  const eligibleSchools: SchoolRecipientRow[] = [];
  const missingEmail: SchoolRecipientRow[] = [];
  const invalidEmail: SchoolRecipientRow[] = [];
  const excludedSchools: SchoolRecipientRow[] = [];

  for (const school of schools) {
    if (!isEligibleSchool(school)) {
      excludedSchools.push(school);
      continue;
    }

    const rawEmail = (school.email ?? "").trim();
    if (!rawEmail) {
      missingEmail.push(school);
      continue;
    }

    if (!isValidSchoolEmail(rawEmail)) {
      invalidEmail.push(school);
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
    eligibleSchools,
    missingEmail,
    invalidEmail,
    excludedSchools,
    duplicateGroups,
    groups,
    totalInvites: eligibleSchools.length,
    totalMessages: groups.length,
    savedMessages: eligibleSchools.length - groups.length,
  };
}

/** Resume o plano para envio no painel sem expor listas completas. */
export function summarizeRecipientPlan(plan: RecipientPlan) {
  return {
    totalSchools: plan.totalSchools,
    eligibleSchools: plan.eligibleSchools.length,
    missingEmail: plan.missingEmail.length,
    invalidEmail: plan.invalidEmail.length,
    excludedSchools: plan.excludedSchools.length,
    duplicateEmails: plan.duplicateGroups.length,
    totalInvites: plan.totalInvites,
    totalMessages: plan.totalMessages,
    savedMessages: plan.savedMessages,
  };
}
