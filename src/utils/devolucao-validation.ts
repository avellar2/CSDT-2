/**
 * Validacoes isoladas da modalidade DEVOLUCAO.
 *
 * Usadas SOMENTE pela nova API de Devolucao
 * (src/pages/api/generate-memorandum-devolucao.ts) e por testes.
 * Nao interfere com Entrega/Troca.
 */

/** ID canonico do CSDT confirmado no banco (id=225, name="CSDT", district="SEDE"). */
export const CSDT_SCHOOL_ID = 225;

export interface DevolucaoItemLike {
  id: number;
  schoolId?: number | null;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  itemIds?: number[];
}

/**
 * Valida que todos os itens pertencem exatamente a sourceSchoolId (por ID,
 * nunca por nome). Itens de outra escola ou ja movimentados sao rejeitados.
 */
export function validateItemsBelongToSchoolById(
  items: DevolucaoItemLike[],
  sourceSchoolId: number,
): { valid: boolean; invalid: DevolucaoItemLike[] } {
  const invalid = items.filter(
    (item) => item.schoolId !== sourceSchoolId,
  );
  return { valid: invalid.length === 0, invalid };
}

/**
 * Valida o body da requisicao de Devolucao ANTES da transacao:
 * - itemIds: array nao vazio, todos inteiros validos, sem duplicados;
 * - sourceSchoolId: inteiro valido e != CSDT_SCHOOL_ID (nao devolve do CSDT
 *   para o CSDT);
 * - district: opcional (o backend usa sourceSchool.district primeiro; o
 *   district do frontend e so fallback).
 *
 * Retorna os itemIds deduplicados quando validos.
 */
export function validateDevolucaoRequestBody(body: any): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Corpo da requisicao invalido." };
  }

  const { itemIds, sourceSchoolId } = body;

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return { valid: false, error: "itemIds deve ser um array nao vazio." };
  }

  const allIntegers = itemIds.every(
    (id: any) => Number.isInteger(id) && id > 0,
  );
  if (!allIntegers) {
    return { valid: false, error: "Todos os itemIds devem ser inteiros positivos." };
  }

  const unique = new Set<number>(itemIds);
  if (unique.size !== itemIds.length) {
    return { valid: false, error: "itemIds contem duplicados." };
  }

  if (!Number.isInteger(sourceSchoolId) || sourceSchoolId <= 0) {
    return { valid: false, error: "sourceSchoolId deve ser um inteiro positivo." };
  }

  if (sourceSchoolId === CSDT_SCHOOL_ID) {
    return {
      valid: false,
      error: "A escola de origem nao pode ser o proprio CSDT.",
    };
  }

  return { valid: true, itemIds: itemIds as number[] };
}