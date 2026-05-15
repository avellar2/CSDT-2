export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.length === 10) {
    return new Date(dateStr + 'T12:00:00-03:00').toLocaleDateString('pt-BR');
  }
  return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
