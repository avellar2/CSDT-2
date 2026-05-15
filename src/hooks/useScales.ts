import { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

// Especialidades disponíveis
export const SPECIALTIES = [
  'Hardware',
  'Software',
  'Redes',
  'Suporte',
  'Infraestrutura',
  'Segurança',
  'Banco de Dados',
  'Sistemas',
  'Manutenção'
];

// Palavras-chave para detecção automática de especialidades
export const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  'Hardware': ['computador', 'pc', 'impressora', 'monitor', 'teclado', 'mouse', 'cpu', 'memoria', 'hd', 'ssd', 'placa', 'fonte', 'cabo', 'equipamento', 'hardware'],
  'Software': ['programa', 'aplicativo', 'sistema', 'instalação', 'atualização', 'licença', 'windows', 'office', 'software', 'driver'],
  'Redes': ['internet', 'wifi', 'rede', 'conexão', 'roteador', 'switch', 'cabo de rede', 'ip', 'dns', 'servidor', 'conectividade'],
  'Suporte': ['dúvida', 'treinamento', 'ajuda', 'orientação', 'explicação', 'ensinar', 'capacitação', 'suporte'],
  'Infraestrutura': ['cabeamento', 'rack', 'sala', 'organização', 'infraestrutura', 'estrutura', 'instalação física'],
  'Segurança': ['antivirus', 'backup', 'segurança', 'proteção', 'firewall', 'senha', 'acesso', 'permissão'],
  'Banco de Dados': ['banco', 'dados', 'sql', 'backup', 'database', 'bd', 'mysql', 'postgresql'],
  'Sistemas': ['sistema', 'servidor', 'linux', 'windows server', 'configuração', 'administração'],
  'Manutenção': ['limpeza', 'manutenção', 'preventiva', 'corretiva', 'reparo', 'conserto', 'troca']
};

interface Technician {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  specialties?: string[];
  currentAssignments?: number;
  experienceLevel?: 'junior' | 'pleno' | 'senior';
  maxCapacity?: number;
}

interface School {
  id: string;
  name: string;
  district?: string;
  address?: string;
  pendingOs?: number;
  requiredSpecialties?: string[];
  complexity?: 'baixa' | 'media' | 'alta';
  estimatedWorkload?: number;
}

interface DemandAnalysis {
  detectedSpecialties: string[];
  complexity: 'baixa' | 'media' | 'alta';
  estimatedHours: number;
  suggestedTechnicians: string[];
}

interface ScaleTemplate {
  id: string;
  name: string;
  baseTechnicians: string[];
  visitTechnicians: string[];
  offTechnicians: string[];
  createdAt: string;
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function useScales() {
  const router = useRouter();

  const parseLocalDate = (dateString: string | Date): Date => {
    if (typeof dateString === 'string') {
      if (dateString.includes('T')) {
        return new Date(dateString);
      } else {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
    } else {
      return new Date(dateString);
    }
  };

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<School[]>([]);
  const [searchText, setSearchText] = useState("");
  const [schoolDemands, setSchoolDemands] = useState<{ [key: string]: string }>({});
  const [baseTechnicians, setBaseTechnicians] = useState<string[]>([]);
  const [visitTechnicians, setVisitTechnicians] = useState<string[]>([]);
  const [offTechnicians, setOffTechnicians] = useState<string[]>([]);
  const [availableTechnicians, setAvailableTechnicians] = useState<string[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeView, setActiveView] = useState<'create' | 'dashboard' | 'history' | 'analytics' | 'agenda' | 'tickets'>('create');
  const [draggedTechnician, setDraggedTechnician] = useState<Technician | null>(null);

  const [scaleHistory, setScaleHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryScale, setSelectedHistoryScale] = useState<any>(null);
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [schoolVisitsData, setSchoolVisitsData] = useState<any>(null);
  const [loadingSchoolVisits, setLoadingSchoolVisits] = useState(false);

  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [calendars, setCalendars] = useState<any[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  const [templates, setTemplates] = useState<ScaleTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const [demandAnalysis, setDemandAnalysis] = useState<{[key: string]: DemandAnalysis}>({});
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(true);
  const [capacityWarnings, setCapacityWarnings] = useState<string[]>([]);

  const [technicalTickets, setTechnicalTickets] = useState<any[]>([]);
  const [chamadosEscala, setChamadosEscala] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketStats, setTicketStats] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<string>('all');
  const [ticketSearchTerm, setTicketSearchTerm] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<any>(null);
  const [deletionReason, setDeletionReason] = useState<string>('');
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [schedulePriority, setSchedulePriority] = useState<string>('MEDIUM');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [scheduleNotes, setScheduleNotes] = useState<string>('');
  const [scheduling, setScheduling] = useState(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTicketId, setScheduleTicketId] = useState<number | null>(null);
  const [scheduleSchool, setScheduleSchool] = useState<string>('');
  const [scheduleTitle, setScheduleTitle] = useState<string>('');
  const [scheduleDescription, setScheduleDescription] = useState<string>('');

  const [showQuickRoutes, setShowQuickRoutes] = useState(false);

  const [conflictingTechnicians, setConflictingTechnicians] = useState<
    { name: string; categories: string[] }[]
  >([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<{
    title: string;
    schoolName: string;
    totalPending: number;
    details: string;
    instruction: string;
  } | null>(null);

  const debouncedSearch = useCallback(
    debounce((searchValue: string) => {
      setSearchLoading(false);
    }, 300),
    []
  );

  const generateRandomSpecialties = (): string[] => {
    const numSpecialties = Math.floor(Math.random() * 3) + 1;
    const shuffled = [...SPECIALTIES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numSpecialties);
  };

  const analyzeDemand = (demandText: string): DemandAnalysis => {
    const text = demandText.toLowerCase();
    const detectedSpecialties: string[] = [];

    Object.entries(SPECIALTY_KEYWORDS).forEach(([specialty, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        detectedSpecialties.push(specialty);
      }
    });

    let complexity: 'baixa' | 'media' | 'alta' = 'baixa';
    const complexityKeywords = {
      alta: ['servidor', 'rede completa', 'infraestrutura', 'múltiplos', 'complexo', 'urgente'],
      media: ['configurar', 'instalar', 'várias', 'alguns', 'diversas']
    };

    if (complexityKeywords.alta.some(keyword => text.includes(keyword)) || detectedSpecialties.length > 2) {
      complexity = 'alta';
    } else if (complexityKeywords.media.some(keyword => text.includes(keyword)) || detectedSpecialties.length > 1) {
      complexity = 'media';
    }

    const baseHours = complexity === 'baixa' ? 2 : complexity === 'media' ? 4 : 8;
    const estimatedHours = baseHours + (detectedSpecialties.length * 1);

    const suggestedTechnicians = technicians
      .filter(tech => {
        if (!tech.specialties || detectedSpecialties.length === 0) return false;
        return detectedSpecialties.some(spec => tech.specialties!.includes(spec));
      })
      .sort((a, b) => {
        const aMatches = a.specialties?.filter(spec => detectedSpecialties.includes(spec)).length || 0;
        const bMatches = b.specialties?.filter(spec => detectedSpecialties.includes(spec)).length || 0;

        if (aMatches !== bMatches) return bMatches - aMatches;

        const experienceOrder = { 'senior': 3, 'pleno': 2, 'junior': 1 };
        return (experienceOrder[b.experienceLevel || 'junior'] || 1) - (experienceOrder[a.experienceLevel || 'junior'] || 1);
      })
      .slice(0, 3)
      .map(tech => tech.id);

    return {
      detectedSpecialties: detectedSpecialties.length > 0 ? detectedSpecialties : ['Suporte'],
      complexity,
      estimatedHours,
      suggestedTechnicians
    };
  };

  const checkCapacityWarnings = () => {
    const warnings: string[] = [];

    [
      { list: baseTechnicians, category: 'Base' },
      { list: visitTechnicians, category: 'Visita Técnica' },
      { list: offTechnicians, category: 'Folga' }
    ].forEach(({ list, category }) => {
      list.forEach(techId => {
        const tech = technicians.find(t => t.id === techId);
        if (tech?.maxCapacity) {
          const assignedSchools = selectedSchools.filter(school => {
            const analysis = demandAnalysis[school.id];
            return analysis?.suggestedTechnicians.includes(techId);
          }).length;

          if (assignedSchools > tech.maxCapacity) {
            warnings.push(`${tech.displayName} (${category}) está com sobrecarga: ${assignedSchools}/${tech.maxCapacity} escolas`);
          }
        }
      });
    });

    setCapacityWarnings(warnings);
  };

  const processAnalyticsData = (history: any[], technicians: Technician[], schools: School[]) => {
    if (!history.length) return null;

    const categoryDistribution = history.map(scale => ({
      date: scale.date,
      base: scale.baseTechnicians.length,
      visit: scale.visitTechnicians.length,
      off: scale.offTechnicians.length
    })).reverse();

    const visitTechnicianAllocations = new Map();
    history.forEach(scale => {
      scale.visitTechnicians.forEach((tech: any) => {
        const name = tech.displayName;
        visitTechnicianAllocations.set(name, (visitTechnicianAllocations.get(name) || 0) + 1);
      });
    });

    const topVisitTechnicians = Array.from(visitTechnicianAllocations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const schoolsFrequency = new Map();
    history.forEach(scale => {
      scale.schoolDemands.forEach((demand: any) => {
        const schoolName = demand.School?.name || 'Escola não identificada';
        schoolsFrequency.set(schoolName, (schoolsFrequency.get(schoolName) || 0) + 1);
      });
    });

    const topSchools = Array.from(schoolsFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const specialtyDemands = new Map();
    history.forEach(scale => {
      scale.schoolDemands.forEach((demand: any) => {
        const text = demand.demand.toLowerCase();
        Object.entries(SPECIALTY_KEYWORDS).forEach(([specialty, keywords]) => {
          if (keywords.some(keyword => text.includes(keyword))) {
            specialtyDemands.set(specialty, (specialtyDemands.get(specialty) || 0) + 1);
          }
        });
      });
    });

    const topSpecialties = Array.from(specialtyDemands.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const totalScales = history.length;
    const totalVisitTechnicians = history.filter(scale => scale.visitTechnicians.length > 0).length;
    const avgSchoolsPerScale = history.reduce((acc, scale) => acc + scale.totalSchools, 0) / totalScales;
    const totalUniqueSchools = new Set(history.flatMap(scale =>
      scale.schoolDemands.map((d: any) => d.School?.name)
    )).size;

    return {
      categoryDistribution,
      topVisitTechnicians,
      topSchools,
      topSpecialties,
      stats: {
        totalScales,
        totalVisitTechnicians,
        avgSchoolsPerScale: Math.round(avgSchoolsPerScale * 10) / 10,
        totalUniqueSchools
      }
    };
  };

  const fetchScaleHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await fetch('/api/getScaleHistory');
      if (!response.ok) {
        throw new Error('Erro ao buscar histórico');
      }
      const data = await response.json();
      setScaleHistory(data);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchTechnicalTickets = async () => {
    try {
      setLoadingTickets(true);
      const response = await fetch(`/api/technical-tickets/list?status=${ticketFilter}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar chamados técnicos');
      }
      const data = await response.json();
      if (data.success) {
        setTechnicalTickets(data.tickets);
        setTicketStats(data.stats);
      }
    } catch (error) {
      console.error('Erro ao buscar chamados técnicos:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchChamadosEscala = async () => {
    try {
      const statusFilter = ticketFilter === 'all' ? '' : `?status=${ticketFilter}`;
      const response = await fetch(`/api/chamados-escalas${statusFilter}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar chamados de escala');
      }
      const data = await response.json();
      if (data.success) {
        setChamadosEscala(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar chamados de escala:', error);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const response = await fetch('/api/users/admins');
      if (!response.ok) {
        throw new Error('Erro ao buscar administradores');
      }
      const data = await response.json();
      if (data.success) {
        setAdminUsers(data.users);
      }
    } catch (error) {
      console.error('Erro ao buscar administradores:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoadingAnalytics(true);
      const response = await fetch('/api/getScaleHistory');
      if (!response.ok) {
        throw new Error('Erro ao buscar dados de analytics');
      }
      const data = await response.json();

      const processedAnalytics = processAnalyticsData(data, technicians, schools);
      setAnalyticsData(processedAnalytics);
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchSchoolVisitsData = async () => {
    try {
      setLoadingSchoolVisits(true);
      const response = await fetch('/api/getSchoolVisits');
      if (!response.ok) {
        throw new Error('Erro ao buscar dados de visitas às escolas');
      }
      const data = await response.json();
      setSchoolVisitsData(data);
    } catch (error) {
      console.error('Erro ao buscar dados de visitas às escolas:', error);
    } finally {
      setLoadingSchoolVisits(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);

      const eventsResponse = await fetch('/api/schedule/events');
      if (!eventsResponse.ok) {
        throw new Error('Erro ao buscar eventos');
      }
      const eventsData = await eventsResponse.json();

      let scaleHistoryData = [];
      try {
        const historyResponse = await fetch('/api/getScaleHistory');
        if (historyResponse.ok) {
          scaleHistoryData = await historyResponse.json();
        }
      } catch (historyError) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        scaleHistoryData = [
          {
            id: 1,
            date: today.toISOString().split('T')[0],
            createdAt: today.toISOString(),
            totalTechnicians: 8,
            totalSchools: 12,
            baseTechnicians: [
              { id: 1, displayName: 'João Silva' },
              { id: 2, displayName: 'Maria Santos' },
              { id: 3, displayName: 'Pedro Oliveira' }
            ],
            visitTechnicians: [
              { id: 4, displayName: 'Ana Costa' },
              { id: 5, displayName: 'Carlos Pereira' }
            ],
            offTechnicians: [
              { id: 6, displayName: 'Lucas Mendes' },
              { id: 7, displayName: 'Fernanda Lima' }
            ]
          },
          {
            id: 2,
            date: yesterday.toISOString().split('T')[0],
            createdAt: yesterday.toISOString(),
            totalTechnicians: 6,
            totalSchools: 10,
            baseTechnicians: [
              { id: 8, displayName: 'Roberto Alves' },
              { id: 9, displayName: 'Juliana Rocha' }
            ],
            visitTechnicians: [
              { id: 10, displayName: 'Marcos Silva' },
              { id: 11, displayName: 'Patricia Souza' }
            ],
            offTechnicians: [
              { id: 12, displayName: 'Gabriel Santos' }
            ]
          }
        ];
      }

      let demandsData: {[date: string]: any[]} = {};

      try {
        const today = new Date();
        const dates = [];

        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }

        const demandsResponse = await fetch('/api/daily-demands?days=30');

        if (demandsResponse.ok) {
          const result = await demandsResponse.json();

          if (result.success && result.data && Array.isArray(result.data)) {
            const demandsByDate: {[date: string]: any[]} = {};

            result.data.forEach((demand: any) => {
              const demandDate = demand.createdAt ? new Date(demand.createdAt).toISOString().split('T')[0] : null;

              if (demandDate) {
                if (!demandsByDate[demandDate]) {
                  demandsByDate[demandDate] = [];
                }

                const schoolMatch = demand.title ? demand.title.match(/Demanda - (.+)/) : null;
                const schoolName = schoolMatch ? schoolMatch[1] : 'Escola não especificada';

                let priority = 'MEDIUM';
                const description = (demand.description || '').toLowerCase();
                if (description.includes('urgente') || description.includes('crítico') || description.includes('parado')) {
                  priority = 'URGENT';
                } else if (description.includes('importante') || description.includes('problema') || description.includes('não funciona')) {
                  priority = 'HIGH';
                } else if (description.includes('simples') || description.includes('configurar') || description.includes('ajustar')) {
                  priority = 'LOW';
                }

                demandsByDate[demandDate].push({
                  id: demand.id,
                  title: demand.description || 'Demanda sem descrição',
                  description: demand.description || 'Sem descrição fornecida',
                  school: schoolName,
                  priority: priority,
                  createdAt: demand.createdAt
                });
              }
            });

            scaleHistoryData.forEach((scale: any, index: number) => {
              let scaleDate;
              if (scale.date) {
                scaleDate = scale.date;
              } else if (scale.createdAt) {
                scaleDate = scale.createdAt.split('T')[0];
              } else {
                const today = new Date();
                const fallbackDate = new Date(today);
                fallbackDate.setDate(today.getDate() - index);
                scaleDate = fallbackDate.toISOString().split('T')[0];
              }
              const scaleId = scale.id || index + 1;

              scale.date = scaleDate;
              scale.id = scaleId;

              if (demandsByDate[scaleDate]) {
                demandsData[scaleDate] = demandsByDate[scaleDate];
              } else {
                const closestDate = Object.keys(demandsByDate).find(date => {
                  const diff = Math.abs(new Date(date).getTime() - new Date(scaleDate).getTime());
                  return diff <= 7 * 24 * 60 * 60 * 1000;
                });

                if (closestDate) {
                  demandsData[scaleDate] = demandsByDate[closestDate].slice(0, 3);
                }
              }
            });
          }
        }

        if (Object.keys(demandsData).length === 0) {
          const exampleDemands = [
            {
              title: 'Problema com impressora',
              description: 'Impressora HP LaserJet não conecta na rede após atualização',
              school: 'EMEF João Silva',
              priority: 'URGENT'
            },
            {
              title: 'Suporte técnico - Internet',
              description: 'Internet instável na sala dos professores, alunos sem acesso',
              school: 'EMEI Maria Santos',
              priority: 'HIGH'
            },
            {
              title: 'Manutenção de equipamento',
              description: 'Projetor da sala 3 com problema na lâmpada',
              school: 'EMEF Pedro Costa',
              priority: 'MEDIUM'
            }
          ];

          scaleHistoryData.forEach((scale: any, index: number) => {
            let scaleDate;
            if (scale.date) {
              scaleDate = scale.date;
            } else if (scale.createdAt) {
              scaleDate = scale.createdAt.split('T')[0];
            } else {
              const today = new Date();
              const fallbackDate = new Date(today);
              fallbackDate.setDate(today.getDate() - index);
              scaleDate = fallbackDate.toISOString().split('T')[0];
            }
            const scaleId = scale.id || index + 1;

            scale.date = scaleDate;
            scale.id = scaleId;

            const numDemands = Math.min(2 + Math.floor(Math.random() * 2), exampleDemands.length);
            demandsData[scaleDate] = exampleDemands.slice(0, numDemands).map((demand, demandIndex) => ({
              id: `example-${scaleId}-${demandIndex + 1}`,
              ...demand
            }));
          });
        }

      } catch (error) {
        console.error('Erro ao buscar demandas reais:', error);

        const exampleDemands = [
          {
            title: 'Problema com impressora',
            description: 'Impressora HP LaserJet não conecta na rede após atualização',
            school: 'EMEF João Silva',
            priority: 'URGENT'
          },
          {
            title: 'Suporte técnico - Internet',
            description: 'Internet instável na sala dos professores, alunos sem acesso',
            school: 'EMEI Maria Santos',
            priority: 'HIGH'
          }
        ];

        scaleHistoryData.forEach((scale: any, index: number) => {
          let scaleDate;
          if (scale.date) {
            scaleDate = scale.date;
          } else if (scale.createdAt) {
            scaleDate = scale.createdAt.split('T')[0];
          } else {
            const today = new Date();
            const fallbackDate = new Date(today);
            fallbackDate.setDate(today.getDate() - index);
            scaleDate = fallbackDate.toISOString().split('T')[0];
          }
          const scaleId = scale.id || index + 1;

          scale.date = scaleDate;
          scale.id = scaleId;

          demandsData[scaleDate] = exampleDemands.map((demand, demandIndex) => ({
            id: `fallback-${scaleId}-${demandIndex + 1}`,
            ...demand
          }));
        });
      }

      const scaleEvents = scaleHistoryData.map((scale: any) => {
        const scaleDate = parseLocalDate(scale.date);

        const startDate = new Date(scaleDate);
        startDate.setHours(8, 0, 0, 0);
        const endDate = new Date(scaleDate);
        endDate.setHours(18, 0, 0, 0);

        return {
          id: `scale-${scale.id}`,
          title: `Escala Diária`,
          description: `Base: ${scale.baseTechnicians.length} | Visitas: ${scale.visitTechnicians.length} | Folga: ${scale.offTechnicians.length}\n\nTécnicos da Base: ${scale.baseTechnicians.map((t: any) => t.displayName).join(', ')}\n\nVisitas Técnicas: ${scale.visitTechnicians.map((t: any) => t.displayName).join(', ')}\n\nFolga: ${scale.offTechnicians.map((t: any) => t.displayName).join(', ')}`,
          startDate,
          endDate,
          allDay: false,
          type: 'TASK',
          priority: 'HIGH',
          status: 'COMPLETED',
          createdBy: 'sistema',
          location: `${scale.totalSchools} Escolas`,
          calendarId: 1,
          recurring: false,
          timezone: 'America/Sao_Paulo',
          tags: ['escala', 'técnicos'],
          Calendar: {
            id: 1,
            name: 'Escalas',
            color: '#10b981',
            isVisible: true,
            isDefault: false
          },
          reminders: [],
          participants: [],
          scaleData: {
            ...scale,
            demands: demandsData[scale.date] || [],
            _debugDemands: demandsData[scale.date]
          }
        };
      });

      const regularEvents = eventsData.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }));

      const allEvents = [...regularEvents, ...scaleEvents];
      setEvents(allEvents);

    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleEventCreate = async (eventData: any) => {
    try {
      const response = await fetch('/api/schedule/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro da API:', errorText);
        throw new Error(`Erro ao criar evento: ${response.status} - ${errorText}`);
      }

      const newEvent = await response.json();

      const eventWithDates = {
        ...newEvent,
        startDate: new Date(newEvent.startDate),
        endDate: new Date(newEvent.endDate)
      };
      setEvents(prev => [...prev, eventWithDates]);
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      alert(`Erro ao criar evento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleEventUpdate = async (id: number, eventData: any) => {
    try {
      const response = await fetch(`/api/schedule/events?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar evento');
      }

      const updatedEvent = await response.json();
      const eventWithDates = {
        ...updatedEvent,
        startDate: new Date(updatedEvent.startDate),
        endDate: new Date(updatedEvent.endDate)
      };

      setEvents(prev => prev.map(event =>
        event.id === id ? eventWithDates : event
      ));
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
    }
  };

  const handleEventDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/schedule/events?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir evento');
      }

      setEvents(prev => prev.filter(event => event.id !== id));
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
    }
  };

  const fetchCalendars = async () => {
    try {
      setLoadingCalendars(true);
      const response = await fetch('/api/calendars?ownerId=current-user');
      if (!response.ok) {
        throw new Error('Erro ao buscar calendários');
      }
      const data = await response.json();
      setCalendars(data);
    } catch (error) {
      console.error('Erro ao buscar calendários:', error);
      setCalendars([{
        id: 1,
        name: 'Meu Calendário',
        color: '#3b82f6',
        isVisible: true,
        isDefault: true,
        ownerId: 'current-user'
      }]);
    } finally {
      setLoadingCalendars(false);
    }
  };

  const handleCalendarCreate = async (calendarData: any) => {
    try {
      const response = await fetch('/api/calendars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarData),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar calendário');
      }

      const newCalendar = await response.json();
      setCalendars(prev => [...prev, newCalendar]);
    } catch (error) {
      console.error('Erro ao criar calendário:', error);
    }
  };

  const handleCalendarUpdate = async (id: number, calendarData: any) => {
    try {
      const response = await fetch(`/api/calendars/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarData),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar calendário');
      }

      const updatedCalendar = await response.json();
      setCalendars(prev => prev.map(calendar =>
        calendar.id === id ? updatedCalendar : calendar
      ));
    } catch (error) {
      console.error('Erro ao atualizar calendário:', error);
    }
  };

  const handleCalendarToggle = async (id: number, isVisible: boolean) => {
    try {
      const response = await fetch(`/api/calendars/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isVisible }),
      });

      if (!response.ok) {
        throw new Error('Erro ao alterar visibilidade do calendário');
      }

      const updatedCalendar = await response.json();
      setCalendars(prev => prev.map(calendar =>
        calendar.id === id ? updatedCalendar : calendar
      ));
    } catch (error) {
      console.error('Erro ao alterar visibilidade:', error);
    }
  };

  const handleScheduleTicket = async () => {
    if (!scheduleDate || !scheduleTime || !currentUser) {
      alert('Por favor, preencha a data e horário para o agendamento.');
      return;
    }

    try {
      setScheduling(true);

      const response = await fetch('/api/technical-tickets/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          priority: schedulePriority,
          scheduledDate: scheduleDate,
          scheduledTime: scheduleTime,
          assignedTo: currentUser.displayName,
          notes: scheduleNotes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao agendar chamado');
      }

      await fetchTechnicalTickets();

      setSchedulePriority('MEDIUM');
      setScheduleDate('');
      setScheduleTime('');
      setScheduleNotes('');

      setShowTicketModal(false);
      setSelectedTicket(null);

      alert('Chamado agendado com sucesso!');

    } catch (error) {
      console.error('Erro ao agendar chamado:', error);
      alert(`Erro ao agendar chamado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setScheduling(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete || !deletionReason.trim() || !currentUser) return;

    try {
      const isChamadoEscala = (ticketToDelete as any).isChamadoEscala;

      let response;
      if (isChamadoEscala) {
        response = await fetch(`/api/chamados-escalas?id=${ticketToDelete.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } else {
        response = await fetch(`/api/technical-tickets/delete?ticketId=${ticketToDelete.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deletedBy: currentUser.displayName,
            deletionReason: deletionReason.trim()
          })
        });
      }

      if (!response.ok) {
        throw new Error('Erro ao excluir chamado');
      }

      if (isChamadoEscala) {
        fetchChamadosEscala();
      } else {
        fetchTechnicalTickets();
      }

      setShowDeleteModal(false);
      setTicketToDelete(null);
      setDeletionReason('');

      alert('Chamado excluído com sucesso!');

    } catch (error) {
      console.error('Erro ao excluir chamado:', error);
      alert('Erro ao excluir chamado. Tente novamente.');
    }
  };

  const handleDemandChange = (schoolId: string, demand: string) => {
    setSchoolDemands((prev) => ({
      ...prev,
      [schoolId]: demand,
    }));

    if (demand.trim()) {
      const analysis = analyzeDemand(demand);
      setDemandAnalysis(prev => ({
        ...prev,
        [schoolId]: analysis
      }));
    } else {
      setDemandAnalysis(prev => {
        const updated = { ...prev };
        delete updated[schoolId];
        return updated;
      });
    }
  };

  const handleDragStart = (event: { active: { id: string } }) => {
    const techId = event.active.id;
    const tech = technicians.find(t => t.id === techId);
    setDraggedTechnician(tech || null);
  };

  const handleDragEnd = (event: { active: { id: string }; over: { id: string } | null }) => {
    const { active, over } = event;
    setDraggedTechnician(null);

    if (!over) return;

    const techId = active.id;
    const targetContainer = over.id;

    setBaseTechnicians(prev => prev.filter(id => id !== techId));
    setVisitTechnicians(prev => prev.filter(id => id !== techId));
    setOffTechnicians(prev => prev.filter(id => id !== techId));

    switch (targetContainer) {
      case 'base':
        setBaseTechnicians(prev => [...prev, techId]);
        break;
      case 'visit':
        setVisitTechnicians(prev => [...prev, techId]);
        break;
      case 'off':
        setOffTechnicians(prev => [...prev, techId]);
        break;
    }
  };

  const saveTemplate = () => {
    if (!templateName.trim()) return;

    const newTemplate: ScaleTemplate = {
      id: Date.now().toString(),
      name: templateName,
      baseTechnicians: [...baseTechnicians],
      visitTechnicians: [...visitTechnicians],
      offTechnicians: [...offTechnicians],
      createdAt: new Date().toISOString()
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem('scaleTemplates', JSON.stringify(updatedTemplates));
    setTemplateName("");
    setShowTemplateModal(false);
  };

  const loadTemplate = (template: ScaleTemplate) => {
    setBaseTechnicians([...template.baseTechnicians]);
    setVisitTechnicians([...template.visitTechnicians]);
    setOffTechnicians([...template.offTechnicians]);
  };

  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(updatedTemplates);
    localStorage.setItem('scaleTemplates', JSON.stringify(updatedTemplates));
  };

  const checkPendingOs = async (schoolId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/check-pending-os?schoolId=${schoolId}`);

      const data = await response.json();

      if (data.hasPendingOs) {
        const school = schools.find(s => s.id === schoolId);
        const schoolName = school ? school.name : 'Escola selecionada';

        const oldOsText = data.pendingOsOld > 0 ? `${data.pendingOsOld} OS na tabela antiga` : '';
        const newOsText = data.pendingOsNew > 0 ? `${data.pendingOsNew} OS na tabela nova` : '';
        const osDetails = [oldOsText, newOsText].filter(text => text).join(' e ');

        setErrorMessage({
          title: 'OS Pendente Encontrada',
          schoolName: schoolName,
          totalPending: data.totalPending,
          details: osDetails,
          instruction: 'Finalize as OS pendentes antes de criar uma nova escala.'
        });

        setShowModal(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar OS pendentes:', error);
      setErrorMessage({
        title: 'Erro de Conexão',
        schoolName: '',
        totalPending: 0,
        details: '',
        instruction: 'Erro ao verificar OS pendentes. Tente novamente.'
      });
      setShowModal(true);
      return true;
    }
  };

  const handleSelectSchool = async (school: any) => {
    if (selectedSchools.some((s) => s.id === school.id)) {
      setSearchText("");
      return;
    }

    const hasPending = await checkPendingOs(school.id);
    if (hasPending) {
      setSearchText("");
      return;
    }

    setSelectedSchools((prev) => [...prev, school]);
    setSearchText("");
  };

  const handleRemoveSchool = (schoolId: string) => {
    setSelectedSchools((prev) =>
      prev.filter((school) => school.id !== schoolId),
    );
    setSchoolDemands((prev) => {
      const updatedDemands = { ...prev };
      delete updatedDemands[schoolId];
      return updatedDemands;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSchools.length === 0) {
      alert("Por favor, selecione pelo menos uma escola.");
      return;
    }

    for (const school of selectedSchools) {
      const hasPending = await checkPendingOs(school.id);
      if (hasPending) {
        return;
      }
    }

    const allSelectedTechnicians = [
      ...baseTechnicians,
      ...visitTechnicians,
      ...offTechnicians,
    ];

    const duplicateTechnicians = Array.from(
      new Set(
        allSelectedTechnicians.filter(
          (techId, index) => allSelectedTechnicians.indexOf(techId) !== index,
        ),
      ),
    );

    const unallocatedTechnicians = technicians.filter(
      (tech) =>
        !baseTechnicians.includes(tech.id) &&
        !visitTechnicians.includes(tech.id) &&
        !offTechnicians.includes(tech.id)
    );

    const errors: {
      type: "CONFLITO" | "NAO_ALOCADO";
      message: string;
      technicians: { name: string; details: string }[];
    }[] = [];

    if (duplicateTechnicians.length > 0) {
      errors.push({
        type: "CONFLITO",
        message: "Técnicos alocados em mais de uma categoria:",
        technicians: duplicateTechnicians.map((techId) => {
          const tech = technicians.find((t) => t.id === techId);
          const categories = [];
          if (baseTechnicians.includes(techId)) categories.push("Base");
          if (visitTechnicians.includes(techId))
            categories.push("Visita Técnica");
          if (offTechnicians.includes(techId)) categories.push("Folga");

          return {
            name: tech?.displayName || "Técnico não encontrado",
            details: `Alocado em: ${categories.join(", ")}`,
          };
        }),
      });
    }

    if (unallocatedTechnicians.length > 0) {
      errors.push({
        type: "NAO_ALOCADO",
        message: "Técnicos não alocados (todos devem estar em Base, Visita Técnica ou Folga):",
        technicians: unallocatedTechnicians.map((tech) => ({
          name: tech.displayName || "Técnico não encontrado",
          details: "Deve ser alocado em Base, Visita Técnica ou Folga",
        })),
      });
    }

    if (errors.length > 0) {
      setConflictingTechnicians(
        errors.flatMap((error) =>
          error.technicians.map((tech) => ({
            name: tech.name,
            categories: [tech.details],
          })),
        ),
      );
      setShowModal(true);
      return;
    }

    try {
      const response = await fetch("/api/saveScale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseTechnicians: baseTechnicians.map(id => String(id)),
          visitTechnicians: visitTechnicians.map(id => String(id)),
          offTechnicians: offTechnicians.map(id => String(id)),
          schoolDemands,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar escala");
      }

      setSuccessMessage("Escala salva com sucesso!");
      setShowModal(true);
    } catch (error) {
      console.error("Erro ao salvar escala:", error);
      setConflictingTechnicians([
        {
          name: "Erro no sistema",
          categories: ["Erro ao salvar escala. Tente novamente."],
        },
      ]);
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (conflictingTechnicians.length > 0) {
      const conflictingIds = conflictingTechnicians.map(
        (tech) => technicians.find((t) => t.displayName === tech.name)?.id,
      ).filter(Boolean);

      setBaseTechnicians((prev) =>
        prev.filter((id) => !conflictingIds.includes(id)),
      );
      setVisitTechnicians((prev) =>
        prev.filter((id) => !conflictingIds.includes(id)),
      );
      setOffTechnicians((prev) =>
        prev.filter((id) => !conflictingIds.includes(id)),
      );

      setConflictingTechnicians([]);
    }
  };

  // Effects
  useEffect(() => {
    const allAllocated = [...baseTechnicians, ...visitTechnicians, ...offTechnicians];
    const available = technicians
      .filter(tech => !allAllocated.includes(tech.id))
      .map(tech => tech.id);
    setAvailableTechnicians(available);
  }, [technicians, baseTechnicians, visitTechnicians, offTechnicians]);

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/getTechnicians");
        if (!response.ok) {
          throw new Error("Erro ao buscar técnicos");
        }
        const data = await response.json();
        const techniciansWithStatus = data.map((tech: any) => ({
          ...tech,
          currentAssignments: Math.floor(Math.random() * 3),
          specialties: generateRandomSpecialties(),
          experienceLevel: ['junior', 'pleno', 'senior'][Math.floor(Math.random() * 3)],
          maxCapacity: Math.floor(Math.random() * 3) + 2
        }));
        setTechnicians(techniciansWithStatus);
      } catch (error) {
        console.error("Erro ao buscar técnicos:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchSchools = async () => {
      try {
        const response = await fetch("/api/schools");
        if (!response.ok) {
          throw new Error("Erro ao buscar escolas");
        }
        const data = await response.json();
        const schoolsWithPending = data.map((school: any) => ({
          ...school,
          pendingOs: Math.floor(Math.random() * 3)
        }));
        setSchools(schoolsWithPending);
      } catch (error) {
        console.error("Erro ao buscar escolas:", error);
      }
    };

    const loadTemplates = () => {
      try {
        const savedTemplates = localStorage.getItem('scaleTemplates');
        if (savedTemplates) {
          setTemplates(JSON.parse(savedTemplates));
        }
      } catch (error) {
        console.error("Erro ao carregar templates:", error);
      }
    };

    fetchTechnicians();
    fetchSchools();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (router.isReady && router.query.view) {
      const view = router.query.view as string;
      const validViews = ['create', 'dashboard', 'history', 'analytics', 'agenda', 'tickets'];
      if (validViews.includes(view)) {
        setActiveView(view as any);
      }
    }
  }, [router.isReady, router.query.view]);

  useEffect(() => {
    if (activeView === 'history') {
      fetchScaleHistory();
    } else if (activeView === 'analytics') {
      fetchAnalyticsData();
      fetchSchoolVisitsData();
    } else if (activeView === 'agenda') {
      fetchEvents();
      fetchCalendars();
    } else if (activeView === 'tickets') {
      fetchTechnicalTickets();
      fetchChamadosEscala();
      fetchAdminUsers();
    }
  }, [activeView]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoadingUser(true);

        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          console.error('Error fetching user:', error);
          return;
        }

        const response = await fetch(`/api/get-role?userId=${user.id}`);
        const profileData = await response.json();

        if (response.ok && (profileData.role === 'ADMIN' || profileData.role === 'ADMTOTAL')) {
          setCurrentUser({
            userId: user.id,
            displayName: profileData.displayName,
            role: profileData.role
          });
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (activeView === 'tickets') {
      fetchTechnicalTickets();
      fetchChamadosEscala();
    }
  }, [ticketFilter]);

  useEffect(() => {
    const allTickets = [
      ...technicalTickets,
      ...chamadosEscala.map(chamado => ({
        ...chamado,
        status: chamado.status,
        isChamadoEscala: true
      }))
    ];

    const stats = {
      total: allTickets.length,
      open: allTickets.filter(t => t.status === 'OPEN' || t.status === 'PENDENTE').length,
      assigned: allTickets.filter(t => t.status === 'ASSIGNED').length,
      scheduled: allTickets.filter(t => t.status === 'SCHEDULED' || t.status === 'AGENDADO').length,
      inProgress: allTickets.filter(t => t.status === 'IN_PROGRESS').length,
      resolved: allTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CONCLUIDO').length,
      closed: allTickets.filter(t => t.status === 'CLOSED').length
    };

    setTicketStats(stats);
  }, [technicalTickets, chamadosEscala]);

  useEffect(() => {
    if (searchText) {
      setSearchLoading(true);
      debouncedSearch(searchText);
    }
  }, [searchText, debouncedSearch]);

  useEffect(() => {
    checkCapacityWarnings();
  }, [baseTechnicians, visitTechnicians, selectedSchools, demandAnalysis]);

  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  return {
    // State
    technicians,
    schools,
    selectedSchools,
    searchText,
    setSearchText,
    schoolDemands,
    baseTechnicians,
    visitTechnicians,
    offTechnicians,
    availableTechnicians,
    showModal,
    loading,
    searchLoading,
    activeView,
    setActiveView,
    draggedTechnician,
    scaleHistory,
    loadingHistory,
    selectedHistoryScale,
    setSelectedHistoryScale,
    historyDateFilter,
    setHistoryDateFilter,
    analyticsData,
    loadingAnalytics,
    schoolVisitsData,
    loadingSchoolVisits,
    events,
    loadingEvents,
    calendars,
    loadingCalendars,
    templates,
    showTemplateModal,
    setShowTemplateModal,
    templateName,
    setTemplateName,
    demandAnalysis,
    showSmartSuggestions,
    capacityWarnings,
    technicalTickets,
    chamadosEscala,
    loadingTickets,
    ticketStats,
    selectedTicket,
    setSelectedTicket,
    showTicketModal,
    setShowTicketModal,
    ticketFilter,
    setTicketFilter,
    ticketSearchTerm,
    setTicketSearchTerm,
    showDeleteModal,
    setShowDeleteModal,
    ticketToDelete,
    setTicketToDelete,
    deletionReason,
    setDeletionReason,
    adminUsers,
    currentUser,
    loadingUser,
    schedulePriority,
    setSchedulePriority,
    scheduleDate,
    setScheduleDate,
    scheduleTime,
    setScheduleTime,
    scheduleNotes,
    setScheduleNotes,
    scheduling,
    setScheduling,
    showScheduleModal,
    setShowScheduleModal,
    scheduleTicketId,
    setScheduleTicketId,
    scheduleSchool,
    setScheduleSchool,
    scheduleTitle,
    setScheduleTitle,
    scheduleDescription,
    setScheduleDescription,
    showQuickRoutes,
    setShowQuickRoutes,
    conflictingTechnicians,
    setConflictingTechnicians,
    successMessage,
    setSuccessMessage,
    errorMessage,
    setErrorMessage,
    filteredSchools,
    // Helpers
    parseLocalDate,
    // Handlers
    handleScheduleTicket,
    handleDeleteTicket,
    handleDemandChange,
    handleDragStart,
    handleDragEnd,
    handleSelectSchool,
    handleRemoveSchool,
    handleSubmit,
    handleCloseModal,
    handleEventCreate,
    handleEventUpdate,
    handleEventDelete,
    handleCalendarCreate,
    handleCalendarUpdate,
    handleCalendarToggle,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    fetchScaleHistory,
    fetchTechnicalTickets,
    fetchChamadosEscala,
  };
}
