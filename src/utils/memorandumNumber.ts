/**
 * Geracao do numero do memorando no formato [Sequencial]/[Ano] (ex: 1/2026, 2/2026).
 *
 * Helper puro e isolado, usado SOMENTE pela nova API de Devolucao
 * (src/pages/api/generate-memorandum-devolucao.ts) e por testes.
 *
 * A API antiga (generate-memorandum.ts) mantem sua logica inline intacta
 * para Entrega e Troca - este modulo nao altera aquele comportamento.
 *
 * Observacao de concorrencia: a unicidade real e garantida pela constraint
 * `NewMemorandum.number @unique` no banco + transacao Serializable + retry
 * (P2034/P2002). Este helper apenas computa o proximo numero a partir do
 * ultimo numero do ano corrente; ele nao reserva nem persiste nada.
 */
export function buildMemorandumNumber(
  lastNumberThisYear: string | null,
  year: number,
): string {
  let sequential = 1;
  if (lastNumberThisYear) {
    const parts = lastNumberThisYear.split("/");
    const lastSeq = parseInt(parts[0], 10);
    const lastYear = parts[1] ? parseInt(parts[1], 10) : NaN;
    // So incrementa se o sequencial for valido E for do mesmo ano.
    // Se o ultimo memorando for de outro ano, reinicia em 1.
    if (!Number.isNaN(lastSeq) && lastSeq > 0 && lastYear === year) {
      sequential = lastSeq + 1;
    }
  }
  return `${sequential}/${year}`;
}