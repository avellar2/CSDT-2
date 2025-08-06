// Utilitários para exportação de calendários em formato ICS (iCal)

export interface ICalEvent {
  id: number | string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  timezone: string;
  recurring?: boolean;
  recurrence?: any;
  reminders?: Array<{minutes: number, type: string}>;
  participants?: Array<{email: string, status: string, role: string}>;
  tags?: string[];
  status?: string;
  priority?: string;
  createdBy?: string;
}

export function formatDateForICS(date: Date, allDay: boolean = false, timezone?: string): string {
  if (allDay) {
    // Formato para evento de dia inteiro: YYYYMMDD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  } else {
    // Formato UTC para eventos com horário específico: YYYYMMDDTHHMMSSZ
    const utcDate = new Date(date.getTime());
    const year = utcDate.getFullYear();
    const month = String(utcDate.getMonth() + 1).padStart(2, '0');
    const day = String(utcDate.getDate()).padStart(2, '0');
    const hours = String(utcDate.getHours()).padStart(2, '0');
    const minutes = String(utcDate.getMinutes()).padStart(2, '0');
    const seconds = String(utcDate.getSeconds()).padStart(2, '0');
    
    if (timezone && timezone !== 'UTC') {
      // Com fuso horário específico
      return `TZID=${timezone}:${year}${month}${day}T${hours}${minutes}${seconds}`;
    } else {
      // UTC
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    }
  }
}

export function escapeICSText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\\/g, '\\\\')  // Escapa barras invertidas
    .replace(/;/g, '\\;')    // Escapa ponto e vírgula
    .replace(/,/g, '\\,')    // Escapa vírgulas
    .replace(/\n/g, '\\n')   // Escapa quebras de linha
    .replace(/\r/g, '')      // Remove carriage returns
    .substring(0, 1000);     // Limita o tamanho
}

export function generateUID(eventId: number | string): string {
  // Gera um UID único no formato adequado para ICS
  const timestamp = Date.now();
  return `${eventId}-${timestamp}@csdt-calendar.local`;
}

export function getICSPriority(priority?: string): number {
  switch (priority?.toUpperCase()) {
    case 'URGENT': return 1;
    case 'HIGH': return 2;
    case 'MEDIUM': return 5;
    case 'LOW': return 9;
    default: return 5;
  }
}

export function getICSStatus(status?: string): string {
  switch (status?.toUpperCase()) {
    case 'COMPLETED': return 'CONFIRMED';
    case 'IN_PROGRESS': return 'CONFIRMED';
    case 'CANCELLED': return 'CANCELLED';
    case 'POSTPONED': return 'TENTATIVE';
    case 'PENDING':
    default: return 'TENTATIVE';
  }
}

export function formatRecurrence(recurrence: any): string {
  if (!recurrence || !recurrence.frequency) return '';
  
  let rrule = `FREQ=${recurrence.frequency}`;
  
  if (recurrence.interval && recurrence.interval > 1) {
    rrule += `;INTERVAL=${recurrence.interval}`;
  }
  
  if (recurrence.count && recurrence.count > 0) {
    rrule += `;COUNT=${recurrence.count}`;
  }
  
  if (recurrence.until) {
    const untilDate = new Date(recurrence.until);
    rrule += `;UNTIL=${formatDateForICS(untilDate, true)}T235959Z`;
  }
  
  if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
    const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const days = recurrence.daysOfWeek.map((day: number) => dayMap[day]).join(',');
    rrule += `;BYDAY=${days}`;
  }
  
  return rrule;
}

export function formatReminders(reminders: Array<{minutes: number, type: string}>): string[] {
  if (!reminders || reminders.length === 0) return [];
  
  return reminders.map(reminder => {
    const duration = reminder.minutes;
    let trigger = '';
    
    if (duration === 0) {
      trigger = 'PT0S'; // No momento do evento
    } else if (duration < 60) {
      trigger = `PT${duration}M`; // Em minutos
    } else if (duration < 1440) {
      trigger = `PT${Math.floor(duration / 60)}H`; // Em horas
    } else {
      trigger = `P${Math.floor(duration / 1440)}D`; // Em dias
    }
    
    const action = reminder.type === 'EMAIL' ? 'EMAIL' : 'DISPLAY';
    
    return [
      'BEGIN:VALARM',
      `ACTION:${action}`,
      `TRIGGER:-${trigger}`,
      `DESCRIPTION:Lembrete: ${reminder.type}`,
      'END:VALARM'
    ].join('\r\n');
  });
}

export function exportEventToICS(event: ICalEvent): string {
  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${generateUID(event.id)}`,
    `DTSTART${event.allDay ? ';VALUE=DATE' : ''}:${formatDateForICS(event.startDate, event.allDay, event.timezone)}`,
    `DTEND${event.allDay ? ';VALUE=DATE' : ''}:${formatDateForICS(event.endDate, event.allDay, event.timezone)}`,
    `SUMMARY:${escapeICSText(event.title)}`,
    `DTSTAMP:${formatDateForICS(new Date(), false)}`
  ];
  
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }
  
  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }
  
  if (event.status) {
    lines.push(`STATUS:${getICSStatus(event.status)}`);
  }
  
  if (event.priority) {
    lines.push(`PRIORITY:${getICSPriority(event.priority)}`);
  }
  
  if (event.createdBy) {
    lines.push(`ORGANIZER:CN=${escapeICSText(event.createdBy)}:mailto:${event.createdBy}`);
  }
  
  // Adicionar participantes
  if (event.participants && event.participants.length > 0) {
    event.participants.forEach(participant => {
      if (participant.email.trim()) {
        const partstat = participant.status === 'accepted' ? 'ACCEPTED' : 
                        participant.status === 'declined' ? 'DECLINED' :
                        participant.status === 'tentative' ? 'TENTATIVE' : 'NEEDS-ACTION';
        const role = participant.role === 'organizer' ? 'CHAIR' : 
                    participant.role === 'required' ? 'REQ-PARTICIPANT' : 'OPT-PARTICIPANT';
        
        lines.push(`ATTENDEE;ROLE=${role};PARTSTAT=${partstat};RSVP=TRUE:mailto:${participant.email}`);
      }
    });
  }
  
  // Adicionar recorrência
  if (event.recurring && event.recurrence) {
    const rrule = formatRecurrence(event.recurrence);
    if (rrule) {
      lines.push(`RRULE:${rrule}`);
    }
  }
  
  // Adicionar categorias (tags)
  if (event.tags && event.tags.length > 0) {
    const categories = event.tags.filter(tag => tag.trim()).map(escapeICSText).join(',');
    if (categories) {
      lines.push(`CATEGORIES:${categories}`);
    }
  }
  
  // Adicionar timezone
  if (!event.allDay && event.timezone && event.timezone !== 'UTC') {
    lines.push(`DTSTART;TZID=${event.timezone}:${formatDateForICS(event.startDate, false)}`);
    lines.push(`DTEND;TZID=${event.timezone}:${formatDateForICS(event.endDate, false)}`);
  }
  
  lines.push('END:VEVENT');
  
  // Adicionar lembretes
  if (event.reminders && event.reminders.length > 0) {
    const alarms = formatReminders(event.reminders);
    const eventLines = lines.slice(0, -1); // Remove END:VEVENT
    eventLines.push(...alarms);
    eventLines.push('END:VEVENT');
    return eventLines.join('\r\n');
  }
  
  return lines.join('\r\n');
}

export function exportCalendarToICS(events: ICalEvent[], calendarName: string = 'Meu Calendário'): string {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CSDT Calendar//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSText(calendarName)}`,
    'X-WR-TIMEZONE:America/Sao_Paulo',
    'X-WR-CALDESC:Calendário exportado do CSDT'
  ];
  
  const footer = ['END:VCALENDAR'];
  
  const eventStrings = events.map(event => exportEventToICS(event));
  
  return [...header, ...eventStrings, ...footer].join('\r\n');
}

export function downloadICSFile(content: string, filename: string = 'calendario.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function exportSingleEvent(event: ICalEvent): void {
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CSDT Calendar//NONSGML v1.0//EN',
    exportEventToICS(event),
    'END:VCALENDAR'
  ].join('\r\n');
  
  const filename = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  downloadICSFile(icsContent, filename);
}

export function exportMultipleEvents(events: ICalEvent[], calendarName?: string): void {
  if (events.length === 0) {
    alert('Nenhum evento selecionado para exportar.');
    return;
  }
  
  const icsContent = exportCalendarToICS(events, calendarName);
  const filename = `${(calendarName || 'calendario').replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  downloadICSFile(icsContent, filename);
}