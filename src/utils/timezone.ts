// Utilitários para trabalhar com fusos horários
export interface Timezone {
  id: string;
  name: string;
  offset: string;
  region: string;
}

export const COMMON_TIMEZONES: Timezone[] = [
  // Brasil
  { id: 'America/Sao_Paulo', name: 'Brasília (GMT-3)', offset: '-03:00', region: 'Brasil' },
  { id: 'America/Manaus', name: 'Manaus (GMT-4)', offset: '-04:00', region: 'Brasil' },
  { id: 'America/Rio_Branco', name: 'Rio Branco (GMT-5)', offset: '-05:00', region: 'Brasil' },
  { id: 'America/Noronha', name: 'Fernando de Noronha (GMT-2)', offset: '-02:00', region: 'Brasil' },
  
  // América do Norte
  { id: 'America/New_York', name: 'Nova York (EST/EDT)', offset: '-05:00/-04:00', region: 'América do Norte' },
  { id: 'America/Chicago', name: 'Chicago (CST/CDT)', offset: '-06:00/-05:00', region: 'América do Norte' },
  { id: 'America/Denver', name: 'Denver (MST/MDT)', offset: '-07:00/-06:00', region: 'América do Norte' },
  { id: 'America/Los_Angeles', name: 'Los Angeles (PST/PDT)', offset: '-08:00/-07:00', region: 'América do Norte' },
  { id: 'America/Toronto', name: 'Toronto (EST/EDT)', offset: '-05:00/-04:00', region: 'América do Norte' },
  
  // Europa
  { id: 'Europe/London', name: 'Londres (GMT/BST)', offset: '+00:00/+01:00', region: 'Europa' },
  { id: 'Europe/Paris', name: 'Paris (CET/CEST)', offset: '+01:00/+02:00', region: 'Europa' },
  { id: 'Europe/Berlin', name: 'Berlim (CET/CEST)', offset: '+01:00/+02:00', region: 'Europa' },
  { id: 'Europe/Madrid', name: 'Madrid (CET/CEST)', offset: '+01:00/+02:00', region: 'Europa' },
  { id: 'Europe/Rome', name: 'Roma (CET/CEST)', offset: '+01:00/+02:00', region: 'Europa' },
  { id: 'Europe/Moscow', name: 'Moscou (MSK)', offset: '+03:00', region: 'Europa' },
  
  // Ásia
  { id: 'Asia/Tokyo', name: 'Tóquio (JST)', offset: '+09:00', region: 'Ásia' },
  { id: 'Asia/Shanghai', name: 'Xangai (CST)', offset: '+08:00', region: 'Ásia' },
  { id: 'Asia/Hong_Kong', name: 'Hong Kong (HKT)', offset: '+08:00', region: 'Ásia' },
  { id: 'Asia/Seoul', name: 'Seul (KST)', offset: '+09:00', region: 'Ásia' },
  { id: 'Asia/Singapore', name: 'Singapura (SGT)', offset: '+08:00', region: 'Ásia' },
  { id: 'Asia/Dubai', name: 'Dubai (GST)', offset: '+04:00', region: 'Ásia' },
  { id: 'Asia/Kolkata', name: 'Mumbai (IST)', offset: '+05:30', region: 'Ásia' },
  
  // Oceania
  { id: 'Australia/Sydney', name: 'Sydney (AEST/AEDT)', offset: '+10:00/+11:00', region: 'Oceania' },
  { id: 'Australia/Melbourne', name: 'Melbourne (AEST/AEDT)', offset: '+10:00/+11:00', region: 'Oceania' },
  { id: 'Pacific/Auckland', name: 'Auckland (NZST/NZDT)', offset: '+12:00/+13:00', region: 'Oceania' },
  
  // Outros
  { id: 'UTC', name: 'UTC (Tempo Universal)', offset: '+00:00', region: 'Universal' },
  { id: 'GMT', name: 'GMT (Greenwich)', offset: '+00:00', region: 'Universal' },
];

export function getTimezoneById(timezoneId: string): Timezone | undefined {
  return COMMON_TIMEZONES.find(tz => tz.id === timezoneId);
}

export function getTimezonesByRegion(region: string): Timezone[] {
  return COMMON_TIMEZONES.filter(tz => tz.region === region);
}

export function getAllRegions(): string[] {
  const regions = new Set(COMMON_TIMEZONES.map(tz => tz.region));
  return Array.from(regions).sort();
}

export function formatTimeInTimezone(date: Date, timezone: string, includeDate: boolean = false): string {
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      ...(includeDate && {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    };
    
    return date.toLocaleString('pt-BR', options);
  } catch (error) {
    console.error('Erro ao formatar data no fuso horário:', error);
    return date.toLocaleString('pt-BR');
  }
}

export function convertToTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
  try {
    // Converter para timestamp UTC
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    
    // Criar data no fuso de destino
    const targetTime = new Date(utcTime);
    
    // Aplicar offset do fuso de destino (aproximado)
    const sourceOffset = getTimezoneOffset(fromTimezone);
    const targetOffset = getTimezoneOffset(toTimezone);
    const offsetDiff = targetOffset - sourceOffset;
    
    targetTime.setHours(targetTime.getHours() + offsetDiff);
    
    return targetTime;
  } catch (error) {
    console.error('Erro ao converter fuso horário:', error);
    return date;
  }
}

function getTimezoneOffset(timezone: string): number {
  try {
    const date = new Date();
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const targetDate = new Date(utc + (getTimezoneOffsetHours(timezone) * 3600000));
    return targetDate.getHours() - date.getHours();
  } catch (error) {
    return 0;
  }
}

function getTimezoneOffsetHours(timezone: string): number {
  // Mapeamento aproximado de fusos horários para horas de offset
  const offsetMap: { [key: string]: number } = {
    'America/Sao_Paulo': -3,
    'America/Manaus': -4,
    'America/Rio_Branco': -5,
    'America/Noronha': -2,
    'America/New_York': -5,
    'America/Chicago': -6,
    'America/Denver': -7,
    'America/Los_Angeles': -8,
    'Europe/London': 0,
    'Europe/Paris': 1,
    'Europe/Berlin': 1,
    'Asia/Tokyo': 9,
    'Asia/Shanghai': 8,
    'Australia/Sydney': 10,
    'UTC': 0,
    'GMT': 0,
  };
  
  return offsetMap[timezone] || 0;
}

export function getCurrentTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch (error) {
    return 'America/Sao_Paulo';
  }
}

export function getTimezoneDisplayName(timezone: string): string {
  const tz = getTimezoneById(timezone);
  return tz ? tz.name : timezone;
}

export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

export function getTimezoneDifference(fromTimezone: string, toTimezone: string): string {
  try {
    const now = new Date();
    const fromTime = new Date(now.toLocaleString('en-US', { timeZone: fromTimezone }));
    const toTime = new Date(now.toLocaleString('en-US', { timeZone: toTimezone }));
    
    const diffMs = toTime.getTime() - fromTime.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    
    if (diffHours === 0) {
      return 'Mesmo horário';
    } else if (diffHours > 0) {
      return `+${diffHours}h`;
    } else {
      return `${diffHours}h`;
    }
  } catch (error) {
    return 'Diferença desconhecida';
  }
}

export function formatEventTime(startDate: Date, endDate: Date, timezone: string, allDay: boolean = false): string {
  if (allDay) {
    if (startDate.toDateString() === endDate.toDateString()) {
      return `${startDate.toLocaleDateString('pt-BR')} (dia inteiro)`;
    } else {
      return `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')} (dias inteiros)`;
    }
  }
  
  const start = formatTimeInTimezone(startDate, timezone);
  const end = formatTimeInTimezone(endDate, timezone);
  const date = startDate.toLocaleDateString('pt-BR');
  
  const tzDisplay = getTimezoneDisplayName(timezone);
  
  if (startDate.toDateString() === endDate.toDateString()) {
    return `${date} ${start} - ${end} (${tzDisplay})`;
  } else {
    return `${date} ${start} - ${endDate.toLocaleDateString('pt-BR')} ${end} (${tzDisplay})`;
  }
}