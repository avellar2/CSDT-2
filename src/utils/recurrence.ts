export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  until?: string;
  count?: number;
  daysOfWeek?: number[]; // 0 = domingo, 1 = segunda, etc.
  monthlyType?: 'day' | 'weekday'; // dia específico ou dia da semana
}

export interface RecurringEvent {
  id: number;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  type: string;
  priority: string;
  status: string;
  recurring: boolean;
  recurrence?: RecurrenceRule;
  parentEventId?: number;
  calendarId: number;
  [key: string]: any;
}

export function expandRecurringEvents(
  events: RecurringEvent[],
  startRange: Date,
  endRange: Date
): RecurringEvent[] {
  const expandedEvents: RecurringEvent[] = [];

  for (const event of events) {
    if (!event.recurring || !event.recurrence) {
      // Evento não recorrente, incluir se estiver no range
      if (event.startDate >= startRange && event.startDate <= endRange) {
        expandedEvents.push(event);
      }
      continue;
    }

    // Expandir evento recorrente
    const occurrences = generateRecurringOccurrences(event, startRange, endRange);
    expandedEvents.push(...occurrences);
  }

  return expandedEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

function generateRecurringOccurrences(
  event: RecurringEvent,
  startRange: Date,
  endRange: Date
): RecurringEvent[] {
  const occurrences: RecurringEvent[] = [];
  const { recurrence } = event;
  
  if (!recurrence) return [event];

  const eventStart = new Date(event.startDate);
  const eventEnd = new Date(event.endDate);
  const eventDuration = eventEnd.getTime() - eventStart.getTime();

  // Data limite para gerar ocorrências
  let untilDate = endRange;
  if (recurrence.until) {
    const parsedUntil = new Date(recurrence.until);
    untilDate = parsedUntil < endRange ? parsedUntil : endRange;
  }

  let currentDate = new Date(eventStart);
  let occurrenceCount = 0;
  const maxOccurrences = recurrence.count || 1000; // Limite padrão para evitar loops infinitos

  // Começar da primeira ocorrência que intersecta com o range solicitado
  while (currentDate < startRange) {
    currentDate = getNextOccurrence(currentDate, recurrence);
    if (currentDate > untilDate) break;
  }

  // Gerar ocorrências no range
  while (currentDate <= untilDate && occurrenceCount < maxOccurrences) {
    if (currentDate >= startRange) {
      const occurrenceStart = new Date(currentDate);
      const occurrenceEnd = new Date(currentDate.getTime() + eventDuration);

      const occurrence: RecurringEvent = {
        ...event,
        id: `${event.id}_${occurrenceStart.getTime()}` as any, // ID único para cada ocorrência
        startDate: occurrenceStart,
        endDate: occurrenceEnd,
        parentEventId: event.id,
        recurring: false // A ocorrência específica não é recorrente
      };

      occurrences.push(occurrence);
    }

    occurrenceCount++;
    if (recurrence.count && occurrenceCount >= recurrence.count) break;

    currentDate = getNextOccurrence(currentDate, recurrence);
  }

  return occurrences;
}

function getNextOccurrence(currentDate: Date, recurrence: RecurrenceRule): Date {
  const nextDate = new Date(currentDate);

  switch (recurrence.frequency) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + recurrence.interval);
      break;

    case 'WEEKLY':
      if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
        // Encontrar o próximo dia da semana especificado
        const currentDayOfWeek = nextDate.getDay();
        const sortedDays = [...recurrence.daysOfWeek].sort((a, b) => a - b);
        
        let nextDayOfWeek = sortedDays.find(day => day > currentDayOfWeek);
        
        if (nextDayOfWeek === undefined) {
          // Ir para a próxima semana, primeiro dia especificado
          nextDayOfWeek = sortedDays[0];
          const daysToAdd = (7 - currentDayOfWeek) + nextDayOfWeek + (7 * (recurrence.interval - 1));
          nextDate.setDate(nextDate.getDate() + daysToAdd);
        } else {
          nextDate.setDate(nextDate.getDate() + (nextDayOfWeek - currentDayOfWeek));
        }
      } else {
        // Semanal simples
        nextDate.setDate(nextDate.getDate() + (7 * recurrence.interval));
      }
      break;

    case 'MONTHLY':
      if (recurrence.monthlyType === 'weekday') {
        // Mesmo dia da semana do mês (ex: segunda segunda-feira)
        const originalWeekday = currentDate.getDay();
        const originalWeekOfMonth = Math.floor((currentDate.getDate() - 1) / 7) + 1;
        
        nextDate.setMonth(nextDate.getMonth() + recurrence.interval);
        nextDate.setDate(1);
        
        // Encontrar o dia da semana correto
        while (nextDate.getDay() !== originalWeekday) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
        
        // Avançar para a semana correta
        nextDate.setDate(nextDate.getDate() + (7 * (originalWeekOfMonth - 1)));
        
        // Se passou do mês, voltar para a última ocorrência válida
        if (nextDate.getMonth() !== (currentDate.getMonth() + recurrence.interval) % 12) {
          nextDate.setDate(nextDate.getDate() - 7);
        }
      } else {
        // Mesmo dia do mês
        const originalDay = currentDate.getDate();
        nextDate.setMonth(nextDate.getMonth() + recurrence.interval);
        
        // Lidar com meses que não têm o dia específico (ex: 31 de fevereiro)
        const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(originalDay, daysInMonth));
      }
      break;

    case 'YEARLY':
      nextDate.setFullYear(nextDate.getFullYear() + recurrence.interval);
      break;

    default:
      throw new Error(`Frequência de recorrência não suportada: ${recurrence.frequency}`);
  }

  return nextDate;
}

export function isRecurringEvent(event: RecurringEvent): boolean {
  return event.recurring && !!event.recurrence;
}

export function getRecurrenceDescription(recurrence: RecurrenceRule): string {
  const { frequency, interval, until, count } = recurrence;
  
  let description = '';
  
  switch (frequency) {
    case 'DAILY':
      description = interval === 1 ? 'Diariamente' : `A cada ${interval} dias`;
      break;
    case 'WEEKLY':
      description = interval === 1 ? 'Semanalmente' : `A cada ${interval} semanas`;
      break;
    case 'MONTHLY':
      description = interval === 1 ? 'Mensalmente' : `A cada ${interval} meses`;
      break;
    case 'YEARLY':
      description = interval === 1 ? 'Anualmente' : `A cada ${interval} anos`;
      break;
  }
  
  if (until) {
    description += ` até ${new Date(until).toLocaleDateString('pt-BR')}`;
  } else if (count) {
    description += ` por ${count} ocorrências`;
  }
  
  return description;
}