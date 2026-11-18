/**
 * Elegibilidade das unidades para a Pesquisa de Feedback.
 *
 * A tabela School mistura unidades escolares e setores administrativos da SME.
 * Não se pode assumir que todo registro é uma escola. A classificação abaixo é
 * estrutural (INEP, matrículas, vínculo com escola, distrito SEDE) e pode ser
 * persistida na própria School (surveyUnitType/surveyEligible) após auditoria,
 * com precedência sobre a derivação automática.
 */

export type SchoolUnitType = "SCHOOL" | "ADMIN_SECTOR" | "REVIEW";

export type EligibilitySource =
  | "PERSISTED"
  | "SEDE"
  | "ADMIN_SECTOR"
  | "INEP"
  | "STUDENTS"
  | "ANNEX"
  | "NAME"
  | "REVIEW";

export interface SchoolEligibilityRow {
  id: number;
  name: string;
  district?: string | null;
  email?: string | null;
  inep?: number | null;
  students?: number | null;
  parentSchoolId?: number | null;
  surveyUnitType?: string | null;
  surveyEligible?: boolean | null;
  surveyAuditReason?: string | null;
}

export interface EligibilityDecision {
  type: SchoolUnitType;
  eligible: boolean;
  reason: string;
  source: EligibilitySource;
}

/** Normaliza nome para comparação: sem acentos, maiúsculo, espaços únicos. */
export function normalizeUnitName(name: string | null | undefined): string {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Setores administrativos da SME que aparecem fora do distrito SEDE (ou cujo
 * nome não basta para identificação). Comparação por nome normalizado, com
 * termos específicos para não excluir escolas por coincidência de substring.
 */
const ADMIN_SECTOR_PATTERNS: Array<{ test: (name: string) => boolean; reason: string }> = [
  { test: (n) => n === "SME" || n.startsWith("SME "), reason: "Secretaria Municipal de Educação" },
  { test: (n) => n === "FUNDEC" || n.startsWith("FUNDEC "), reason: "Fundação de Educação" },
  { test: (n) => n.includes("CADIS"), reason: "Coordenadoria administrativa (CADIS)" },
  { test: (n) => n.startsWith("CRPH") || n.includes("MUSEU VIVO"), reason: "Centro/museu institucional" },
  { test: (n) => n.includes("CEPEMHED"), reason: "Centro de pesquisa institucional" },
  { test: (n) => n.includes("GUARDA MUNICIPAL"), reason: "Centro de formação de corporação" },
  { test: (n) => n.includes("PESTALOSE"), reason: "Associação institucional" },
  { test: (n) => n === "PATRIMONIO" || n.startsWith("PATRIMONIO "), reason: "Setor de patrimônio" },
  { test: (n) => n === "PROTOCOLO", reason: "Setor de protocolo" },
];

const SCHOOL_NAME_PATTERN =
  /\b(ESCOLA|CRECHE|ANEXO|CEI|CEJA|CIEP|CCAIC|COLEGIO|CENTRO DE EDUCACAO|EM|E\.M|EM\.)\b/;

function persistedDecision(row: SchoolEligibilityRow): EligibilityDecision | null {
  const persistedType =
    row.surveyUnitType === "SCHOOL" ||
    row.surveyUnitType === "ADMIN_SECTOR" ||
    row.surveyUnitType === "REVIEW"
      ? row.surveyUnitType
      : null;

  if (row.surveyEligible === true) {
    return {
      type: "SCHOOL",
      eligible: true,
      reason: row.surveyAuditReason || "Classificado manualmente como unidade escolar.",
      source: "PERSISTED",
    };
  }

  if (row.surveyEligible === false) {
    return {
      type: persistedType && persistedType !== "SCHOOL" ? persistedType : "ADMIN_SECTOR",
      eligible: false,
      reason: row.surveyAuditReason || "Classificado manualmente como inelegível.",
      source: "PERSISTED",
    };
  }

  if (persistedType) {
    return {
      type: persistedType,
      eligible: persistedType === "SCHOOL",
      reason: row.surveyAuditReason || "Classificação persistida.",
      source: "PERSISTED",
    };
  }

  return null;
}

/**
 * Classifica uma unidade. A ordem é deliberada: override auditado > estrutural
 * (distrito/INEP/matrículas/vínculo) > nome > revisão.
 */
export function classifySchoolUnit(row: SchoolEligibilityRow): EligibilityDecision {
  const persisted = persistedDecision(row);
  if (persisted) return persisted;

  const district = normalizeUnitName(row.district);
  const name = normalizeUnitName(row.name);

  // 1. Distrito SEDE é, por definição do cadastro, a sede administrativa da SME.
  if (district === "SEDE") {
    return {
      type: "ADMIN_SECTOR",
      eligible: false,
      reason: "Distrito SEDE — setor administrativo da SME.",
      source: "SEDE",
    };
  }

  // 2. Setores administrativos reconhecidos fora da SEDE.
  for (const pattern of ADMIN_SECTOR_PATTERNS) {
    if (pattern.test(name)) {
      return {
        type: "ADMIN_SECTOR",
        eligible: false,
        reason: `Setor administrativo: ${pattern.reason}.`,
        source: "ADMIN_SECTOR",
      };
    }
  }

  // 3. Sinais estruturais de unidade escolar.
  if ((row.inep ?? 0) > 0) {
    return {
      type: "SCHOOL",
      eligible: true,
      reason: "Código INEP de escola cadastrado.",
      source: "INEP",
    };
  }

  if ((row.students ?? 0) > 0) {
    return {
      type: "SCHOOL",
      eligible: true,
      reason: "Matrículas registradas na unidade.",
      source: "STUDENTS",
    };
  }

  if (row.parentSchoolId != null) {
    return {
      type: "SCHOOL",
      eligible: true,
      reason: "Unidade anexa vinculada a uma escola.",
      source: "ANNEX",
    };
  }

  // 4. Último recurso: nome tipicamente escolar (anexos/creches sem INEP).
  if (SCHOOL_NAME_PATTERN.test(name)) {
    return {
      type: "SCHOOL",
      eligible: true,
      reason: "Nome indica unidade escolar (escola/creche/anexo).",
      source: "NAME",
    };
  }

  // 5. Ambíguo: fica fora do envio até revisão administrativa.
  return {
    type: "REVIEW",
    eligible: false,
    reason: "Cadastro sem INEP, matrículas, vínculo ou nome de escola — revisar.",
    source: "REVIEW",
  };
}

/** Somente type SCHOOL pode receber convite de campanha oficial. */
export function isSchoolUnitForSurvey(row: SchoolEligibilityRow): boolean {
  return classifySchoolUnit(row).type === "SCHOOL";
}
