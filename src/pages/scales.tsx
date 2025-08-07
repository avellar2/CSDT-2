import React, { useState, useEffect, useCallback } from "react";
import { supabase } from '@/lib/supabaseClient';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Users,
  MapPin,
  Clock,
  Calendar,
  ChartBar,
  MagnifyingGlass,
  Plus,
  Trash,
  FloppyDisk,
  WaveTriangle,
  CheckCircle,
  User,
  Gear,
  Eye,
  ArrowsClockwise,
  ArrowRight,
  TrendUp,
  ChartLineUp,
  Wrench,
} from 'phosphor-react';
import { Settings } from "lucide-react";
import GoogleCalendar from '@/components/GoogleCalendar';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  LineElement,
  PointElement 
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Especialidades disponíveis
const SPECIALTIES = [
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
const SPECIALTY_KEYWORDS = {
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

// Utility function for debouncing
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

const Scales: React.FC = () => {
  // Função utilitária para corrigir problema de fuso horário
  const parseLocalDate = (dateString: string | Date): Date => {
    if (typeof dateString === 'string') {
      if (dateString.includes('T')) {
        // Se já tem horário, usar como está
        return new Date(dateString);
      } else {
        // Se é apenas data (YYYY-MM-DD), criar data local para evitar problema de UTC
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexado
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
  
  // UI States
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeView, setActiveView] = useState<'create' | 'dashboard' | 'history' | 'analytics' | 'agenda' | 'tickets'>('create');
  const [draggedTechnician, setDraggedTechnician] = useState<Technician | null>(null);
  
  // History States
  const [scaleHistory, setScaleHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryScale, setSelectedHistoryScale] = useState<any>(null);
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');
  
  // Analytics States
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [schoolVisitsData, setSchoolVisitsData] = useState<any>(null);
  const [loadingSchoolVisits, setLoadingSchoolVisits] = useState(false);
  
  // Schedule Events States
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Calendars States
  const [calendars, setCalendars] = useState<any[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  
  // Templates
  const [templates, setTemplates] = useState<ScaleTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  
  // Smart allocation
  const [demandAnalysis, setDemandAnalysis] = useState<{[key: string]: DemandAnalysis}>({});
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(true);
  const [capacityWarnings, setCapacityWarnings] = useState<string[]>([]);
  
  // Technical Tickets States
  const [technicalTickets, setTechnicalTickets] = useState<any[]>([]);
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
  
  // Error and Success
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

  // Sensors for drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((searchValue: string) => {
      setSearchLoading(false);
    }, 300),
    []
  );

  // Initialize available technicians when main arrays change
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
        // Add mock assignments and specialties for demo
        const techniciansWithStatus = data.map((tech: any) => ({
          ...tech,
          currentAssignments: Math.floor(Math.random() * 3),
          specialties: generateRandomSpecialties(),
          experienceLevel: ['junior', 'pleno', 'senior'][Math.floor(Math.random() * 3)],
          maxCapacity: Math.floor(Math.random() * 3) + 2 // 2-4 escolas por técnico
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
        // Add mock pending OS for demo
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

  // Load scale history when history tab is selected
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
      fetchAdminUsers();
    }
  }, [activeView]);

  // Fetch current user information
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoadingUser(true);
        
        // Get logged-in user from Supabase
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          console.error('Error fetching user:', error);
          return;
        }

        // Get user profile from Prisma
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

      const result = await response.json();
      
      // Atualizar lista de chamados
      await fetchTechnicalTickets();
      
      // Limpar campos
      setSchedulePriority('MEDIUM');
      setScheduleDate('');
      setScheduleTime('');
      setScheduleNotes('');
      
      // Fechar modal
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

  // Reload tickets when filter changes
  useEffect(() => {
    if (activeView === 'tickets') {
      fetchTechnicalTickets();
    }
  }, [ticketFilter]);

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

  const handleDeleteTicket = async () => {
    if (!ticketToDelete || !deletionReason.trim() || !currentUser) return;

    try {
      const response = await fetch(`/api/technical-tickets/delete?ticketId=${ticketToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deletedBy: currentUser.displayName,
          deletionReason: deletionReason.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir chamado');
      }

      const result = await response.json();
      console.log('Chamado excluído:', result);

      // Recarregar lista de chamados
      fetchTechnicalTickets();

      // Fechar modal e limpar estados
      setShowDeleteModal(false);
      setTicketToDelete(null);
      setDeletionReason('');

      // Mostrar mensagem de sucesso
      alert('Chamado excluído com sucesso!');

    } catch (error) {
      console.error('Erro ao excluir chamado:', error);
      alert('Erro ao excluir chamado. Tente novamente.');
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
      
      // Processar dados para analytics
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
      
      // Buscar eventos existentes
      const eventsResponse = await fetch('/api/schedule/events');
      if (!eventsResponse.ok) {
        throw new Error('Erro ao buscar eventos');
      }
      const eventsData = await eventsResponse.json();
      
      // Buscar histórico de escalas
      let scaleHistoryData = [];
      try {
        const historyResponse = await fetch('/api/getScaleHistory');
        if (historyResponse.ok) {
          scaleHistoryData = await historyResponse.json();
        }
      } catch (historyError) {
        console.log('Histórico não disponível, usando dados de exemplo');
        // Dados de exemplo para demonstração - usar datas atuais
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
      
      // Buscar demandas reais da API
      let demandsData: {[date: string]: any[]} = {};
      
      try {
        // Buscar demandas de várias datas
        const today = new Date();
        const dates = [];
        
        // Buscar demandas dos últimos 30 dias
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
        
        // Buscar demandas dos últimos 30 dias
        const demandsResponse = await fetch('/api/daily-demands?days=30');
        
        if (demandsResponse.ok) {
          const result = await demandsResponse.json();
          
          if (result.success && result.data && Array.isArray(result.data)) {
            // Organizar demandas por data
            const demandsByDate: {[date: string]: any[]} = {};
            
            result.data.forEach((demand: any) => {
              // Extrair data da demanda (createdAt)
              const demandDate = demand.createdAt ? new Date(demand.createdAt).toISOString().split('T')[0] : null;
              
              if (demandDate) {
                if (!demandsByDate[demandDate]) {
                  demandsByDate[demandDate] = [];
                }
                
                // Extrair nome da escola do título da API
                const schoolMatch = demand.title ? demand.title.match(/Demanda - (.+)/) : null;
                const schoolName = schoolMatch ? schoolMatch[1] : 'Escola não especificada';
                
                // Definir prioridade baseada em palavras-chave na descrição
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
            
            // Mapear demandas para as datas das escalas
            scaleHistoryData.forEach((scale: any, index: number) => {
              // Gerar data baseada na data atual para fallback mais realista
              let scaleDate;
              if (scale.date) {
                scaleDate = scale.date;
              } else if (scale.createdAt) {
                scaleDate = scale.createdAt.split('T')[0];
              } else {
                // Fallback: usar datas dos últimos dias
                const today = new Date();
                const fallbackDate = new Date(today);
                fallbackDate.setDate(today.getDate() - index);
                scaleDate = fallbackDate.toISOString().split('T')[0];
              }
              const scaleId = scale.id || index + 1;
              
              // Atualizar referências na escala
              scale.date = scaleDate;
              scale.id = scaleId;
              
              // Tentar encontrar demandas para esta data específica
              if (demandsByDate[scaleDate]) {
                demandsData[scaleDate] = demandsByDate[scaleDate];
              } else {
                // Se não há demandas para a data exata, usar demandas próximas
                const closestDate = Object.keys(demandsByDate).find(date => {
                  const diff = Math.abs(new Date(date).getTime() - new Date(scaleDate).getTime());
                  return diff <= 7 * 24 * 60 * 60 * 1000; // Dentro de 7 dias
                });
                
                if (closestDate) {
                  demandsData[scaleDate] = demandsByDate[closestDate].slice(0, 3); // Máximo 3 demandas
                }
              }
            });
          } else {
            console.log('API não retornou dados válidos:', result);
          }
        }
        
        // Se não conseguiu dados reais, usar dados de exemplo como fallback
        if (Object.keys(demandsData).length === 0) {
          console.log('⚠️ Nenhuma demanda real encontrada, usando dados de exemplo');
          
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
            // Usar datas mais realistas para o fallback
            let scaleDate;
            if (scale.date) {
              scaleDate = scale.date;
            } else if (scale.createdAt) {
              scaleDate = scale.createdAt.split('T')[0];
            } else {
              // Fallback: usar datas dos últimos dias
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
        
        // Usar dados de exemplo como fallback em caso de erro
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
          // Usar datas mais realistas para o fallback de erro
          let scaleDate;
          if (scale.date) {
            scaleDate = scale.date;
          } else if (scale.createdAt) {
            scaleDate = scale.createdAt.split('T')[0];
          } else {
            // Fallback: usar datas dos últimos dias
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
      
      // Converter histórico de escalas em eventos
      const scaleEvents = scaleHistoryData.map((scale: any) => {
        // Corrigir problema de fuso horário usando função utilitária
        const scaleDate = parseLocalDate(scale.date);
        
        const startDate = new Date(scaleDate);
        startDate.setHours(8, 0, 0, 0);
        const endDate = new Date(scaleDate);
        endDate.setHours(18, 0, 0, 0);
        
        // Log temporário para verificar correção de datas
        console.log('📅 Data da escala:', scale.date, '-> Processada:', scaleDate.toLocaleDateString('pt-BR'));
        
        // Log para acompanhar carregamento (pode ser removido em produção)
        if (demandsData[scale.date] && demandsData[scale.date].length > 0) {
          console.log(`✅ ${demandsData[scale.date].length} demandas carregadas para ${scale.date}`);
        }
        
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
          // Dados específicos da escala
          scaleData: {
            ...scale,
            demands: demandsData[scale.date] || [],
            // Debug: garantir que always tem demands
            _debugDemands: demandsData[scale.date]
          }
        };
      });
      
      // Converter eventos regulares
      const regularEvents = eventsData.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }));
      
      // Combinar eventos regulares com eventos de escala
      const allEvents = [...regularEvents, ...scaleEvents];
      setEvents(allEvents);
      
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      // Se der erro, inicializa com array vazio
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleEventCreate = async (eventData: any) => {
    try {
      console.log('Dados do evento sendo enviados:', eventData);
      
      const response = await fetch('/api/schedule/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro da API:', errorText);
        throw new Error(`Erro ao criar evento: ${response.status} - ${errorText}`);
      }
      
      const newEvent = await response.json();
      console.log('Evento criado com sucesso:', newEvent);
      
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

  // Calendar Management Functions
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
      // Se der erro, inicializar com um calendário padrão
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

  const processAnalyticsData = (history: any[], technicians: Technician[], schools: School[]) => {
    if (!history.length) return null;

    // 1. Distribuição por categoria ao longo do tempo
    const categoryDistribution = history.map(scale => ({
      date: scale.date,
      base: scale.baseTechnicians.length,
      visit: scale.visitTechnicians.length,
      off: scale.offTechnicians.length
    })).reverse(); // Ordem cronológica

    // 2. Técnicos mais em visitas técnicas
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

    // 3. Escolas mais atendidas
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

    // 4. Especialidades mais demandadas
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

    // 5. Estatísticas gerais
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

  // Handle search with debounce
  useEffect(() => {
    if (searchText) {
      setSearchLoading(true);
      debouncedSearch(searchText);
    }
  }, [searchText, debouncedSearch]);

  // Check capacity warnings when allocations change
  useEffect(() => {
    checkCapacityWarnings();
  }, [baseTechnicians, visitTechnicians, selectedSchools, demandAnalysis]);

  // Filtrar escolas com base no texto de pesquisa
  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  // Generate random specialties for demo
  const generateRandomSpecialties = (): string[] => {
    const numSpecialties = Math.floor(Math.random() * 3) + 1; // 1-3 especialidades
    const shuffled = [...SPECIALTIES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numSpecialties);
  };

  // Analyze demand text to detect required specialties and complexity
  const analyzeDemand = (demandText: string): DemandAnalysis => {
    const text = demandText.toLowerCase();
    const detectedSpecialties: string[] = [];
    
    // Detect specialties based on keywords
    Object.entries(SPECIALTY_KEYWORDS).forEach(([specialty, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        detectedSpecialties.push(specialty);
      }
    });

    // Determine complexity based on number of specialties and specific keywords
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

    // Estimate hours based on complexity and number of specialties
    const baseHours = complexity === 'baixa' ? 2 : complexity === 'media' ? 4 : 8;
    const estimatedHours = baseHours + (detectedSpecialties.length * 1);

    // Suggest technicians based on specialties match
    const suggestedTechnicians = technicians
      .filter(tech => {
        if (!tech.specialties || detectedSpecialties.length === 0) return false;
        return detectedSpecialties.some(spec => tech.specialties!.includes(spec));
      })
      .sort((a, b) => {
        // Sort by experience level and specialty match
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

  // Check capacity warnings
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

  // Update demand analysis when school demands change
  const handleDemandChange = (schoolId: string, demand: string) => {
    setSchoolDemands((prev) => ({
      ...prev,
      [schoolId]: demand,
    }));

    // Analyze the demand for smart suggestions
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

  // Drag and Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const techId = event.active.id as string;
    const tech = technicians.find(t => t.id === techId);
    setDraggedTechnician(tech || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTechnician(null);

    if (!over) return;

    const techId = active.id as string;
    const targetContainer = over.id as string;

    // Remove from all lists first
    setBaseTechnicians(prev => prev.filter(id => id !== techId));
    setVisitTechnicians(prev => prev.filter(id => id !== techId));
    setOffTechnicians(prev => prev.filter(id => id !== techId));

    // Add to target container (only if it's a valid drop zone)
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
      default:
        // Invalid drop zone - technician returns to available pool
        break;
    }
  };

  // Template functions
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

  // Adicionar uma escola à lista de selecionadas
  const handleSelectSchool = async (school: any) => {
    console.log(`🏫 Tentando selecionar escola:`, school); // Esta linha já existe
    console.log(`🔍 ID da escola sendo enviado:`, school.id); // ADICIONAR
    console.log(`🔍 Tipo do ID:`, typeof school.id); // ADICIONAR

    // Verificar se a escola já está selecionada
    if (selectedSchools.some((s) => s.id === school.id)) {
      console.log(`ℹ️ Escola já selecionada: ${school.name}`);
      setSearchText("");
      return;
    }

    console.log(`🔍 Verificando OS pendentes antes de adicionar escola...`);
    // NOVA VALIDAÇÃO: Verificar OS pendentes
    const hasPending = await checkPendingOs(school.id);
    if (hasPending) {
      console.log(`❌ Escola BLOQUEADA por OS pendente: ${school.name}`);
      setSearchText("");
      return; // Não adiciona a escola se tiver OS pendente
    }

    console.log(`✅ Escola ADICIONADA com sucesso: ${school.name}`);
    // Se não tiver OS pendente, adiciona normalmente
    setSelectedSchools((prev) => [...prev, school]);
    setSearchText("");
  };

  // Remover uma escola da lista de selecionadas
  const handleRemoveSchool = (schoolId: string) => {
    setSelectedSchools((prev) =>
      prev.filter((school) => school.id !== schoolId),
    );
    setSchoolDemands((prev) => {
      const updatedDemands = { ...prev };
      delete updatedDemands[schoolId]; // Remove as demandas da escola removida
      return updatedDemands;
    });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação existente
    if (selectedSchools.length === 0) {
      alert("Por favor, selecione pelo menos uma escola.");
      return;
    }

    // NOVA VALIDAÇÃO: Verificar OS pendentes para TODAS as escolas selecionadas
    for (const school of selectedSchools) {
      const hasPending = await checkPendingOs(school.id);
      if (hasPending) {
        // Se encontrar alguma escola com OS pendente, para o processo
        return; // A função checkPendingOs já mostra o modal de erro
      }
    }

    const allSelectedTechnicians = [
      ...baseTechnicians,
      ...visitTechnicians,
      ...offTechnicians,
    ];

    // Debug: log current allocations
    console.log('🔍 Estado atual das alocações:', {
      baseTechnicians,
      visitTechnicians,
      offTechnicians,
      allSelectedTechnicians,
      totalTechnicians: technicians.length
    });

    // Verificação de erros (já existente)
    const duplicateTechnicians = Array.from(
      new Set(
        allSelectedTechnicians.filter(
          (techId, index) => allSelectedTechnicians.indexOf(techId) !== index,
        ),
      ),
    );

    // TODOS os técnicos devem ser alocados obrigatoriamente
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

    // VALIDAÇÃO OBRIGATÓRIA: Todos os técnicos devem ser alocados
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

    // Se não houver erros, envie os dados para o backend
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

      // Define a mensagem de sucesso e exibe o modal
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

  // MODIFICAR: Atualizar a mensagem de erro para ser mais específica
  const checkPendingOs = async (schoolId: string): Promise<boolean> => {
    try {
      console.log(`🔍 Verificando OS pendentes para escola: ${schoolId}`);

      const response = await fetch(`/api/check-pending-os?schoolId=${schoolId}`);
      console.log(`📡 Response status: ${response.status}`);

      const data = await response.json();
      console.log(`📊 Dados recebidos da API:`, data);

      if (data.hasPendingOs) {
        // Buscar o nome da escola para a mensagem
        const school = schools.find(s => s.id === schoolId);
        const schoolName = school ? school.name : 'Escola selecionada';

        console.log(`⚠️ OS pendente encontrada para: ${schoolName}`, {
          totalPending: data.totalPending,
          pendingOsOld: data.pendingOsOld,
          pendingOsNew: data.pendingOsNew
        });

        // NOVA MENSAGEM MELHORADA
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

      console.log(`✅ Nenhuma OS pendente encontrada para escola: ${schoolId}`);
      return false;
    } catch (error) {
      console.error('❌ Erro ao verificar OS pendentes:', error);
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

  const handleCloseModal = () => {
    setShowModal(false);
    setErrorMessage(null); // ATUALIZADO
    setSuccessMessage(null);

    if (conflictingTechnicians.length > 0) {
      const conflictingIds = conflictingTechnicians.map(
        (tech) => technicians.find((t) => t.displayName === tech.name)?.id,
      ).filter(Boolean); // Remove undefined values

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

  // Component for draggable technician card
  const TechnicianCard: React.FC<{ technician: Technician; isDragging?: boolean }> = ({ 
    technician, 
    isDragging = false 
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: technician.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    // Determine allocation status
    const allocationStatus = 
      baseTechnicians.includes(technician.id) ? { label: 'Base', color: 'bg-blue-100 text-blue-800 border-blue-200' } :
      visitTechnicians.includes(technician.id) ? { label: 'Visita Técnica', color: 'bg-green-100 text-green-800 border-green-200' } :
      offTechnicians.includes(technician.id) ? { label: 'Folga', color: 'bg-gray-100 text-gray-800 border-gray-200' } :
      { label: 'Não Alocado', color: 'bg-red-100 text-red-800 border-red-200' };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <User size={16} className="text-gray-500" />
            <span className="font-medium text-gray-900 text-sm">{technician.displayName}</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${allocationStatus.color}`}>
            {allocationStatus.label}
          </span>
        </div>
        {technician.specialties && technician.specialties.length > 0 && (
          <div className="text-xs text-gray-600 mb-1">
            <span className="font-medium">Especialidades:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {technician.specialties.map((spec, index) => (
                <span key={index} className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}
        {technician.experienceLevel && (
          <div className="text-xs text-gray-600 mb-1">
            <span className="font-medium">Nível:</span> {technician.experienceLevel}
          </div>
        )}
        {technician.currentAssignments !== undefined && (
          <div className="text-xs text-gray-600">
            <span className="font-medium">Atribuições:</span> {technician.currentAssignments}
          </div>
        )}
      </div>
    );
  };

  // Component for drop zone
  const DropZone: React.FC<{ 
    id: string; 
    title: string; 
    technicanIds: string[]; 
    color: string;
    icon: React.ReactNode;
    maxCapacity?: number;
  }> = ({ id, title, technicanIds, color, icon, maxCapacity }) => {
    const techniciansInZone = technicians.filter(t => technicanIds.includes(t.id));
    const isOverCapacity = maxCapacity && techniciansInZone.length > maxCapacity;

    const {
      setNodeRef,
      isOver,
    } = useDroppable({
      id: id,
    });

    const isAvailablePool = id === 'available';

    return (
      <div
        ref={setNodeRef}
        className={`${isAvailablePool ? 'bg-transparent' : 'bg-gray-50 dark:bg-zinc-800'} rounded-xl p-4 min-h-[200px] ${isAvailablePool ? '' : 'border-2 border-dashed'} transition-colors ${
          isOverCapacity ? 'border-red-300 bg-red-50' : 
          isOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' :
          isAvailablePool ? '' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {!isAvailablePool && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {icon}
              <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                {techniciansInZone.length} técnico{techniciansInZone.length !== 1 ? 's' : ''}
              </span>
              {maxCapacity && (
                <span className="text-xs text-gray-500">
                  Máx: {maxCapacity}
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className={`space-y-2 ${isAvailablePool ? 'max-h-[500px] overflow-y-auto' : ''}`}>
          {techniciansInZone.map((technician) => (
            <TechnicianCard key={technician.id} technician={technician} />
          ))}
          {techniciansInZone.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {isAvailablePool ? 'Todos os técnicos foram alocados' : 'Arraste técnicos aqui'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 shadow-sm border-b border-gray-200 dark:border-zinc-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gerenciamento de Escalas
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Organize técnicos e crie escalas de trabalho
              </p>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-700 rounded-lg p-1">
              {[
                { id: 'create', label: 'Criar Escala', icon: <Plus size={16} /> },
                { id: 'dashboard', label: 'Dashboard', icon: <ChartBar size={16} /> },
                { id: 'history', label: 'Histórico', icon: <Clock size={16} /> },
                { id: 'analytics', label: 'Analytics', icon: <TrendUp size={16} /> },
                { id: 'agenda', label: 'Agenda', icon: <Calendar size={16} /> },
                { id: 'tickets', label: 'Chamados', icon: <Wrench size={16} /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                    activeView === tab.id
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : activeView === 'create' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Technicians Pool */}
              <div className="xl:col-span-1">
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Users size={20} />
                      Técnicos Não Alocados
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      availableTechnicians.length === 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {availableTechnicians.length}
                    </span>
                  </div>
                  
                  <div className={`space-y-2 max-h-[500px] overflow-y-auto border-2 border-dashed rounded-xl p-4 min-h-[200px] ${
                    availableTechnicians.length === 0 
                      ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                      : 'border-red-300 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {technicians
                      .filter(tech => availableTechnicians.includes(tech.id))
                      .map((technician) => (
                        <TechnicianCard key={technician.id} technician={technician} />
                      ))}
                    {availableTechnicians.length === 0 ? (
                      <div className="text-center py-8 text-green-600">
                        <CheckCircle size={32} className="mx-auto mb-2" />
                        <p className="text-sm font-medium">✅ Todos os técnicos alocados!</p>
                        <p className="text-xs text-green-700 mt-1">Prontos para salvar a escala</p>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-red-600">
                        <WaveTriangle size={32} className="mx-auto mb-2" />
                        <p className="text-sm font-medium">⚠️ {availableTechnicians.length} técnico{availableTechnicians.length !== 1 ? 's' : ''} sem alocação!</p>
                        <p className="text-xs text-red-700 mt-1">Arraste para Base, Visita Técnica ou Folga</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Templates Section */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Settings size={20} />
                      <Gear size={20} />
                      Templates
                    </h3>
                    <button
                      onClick={() => setShowTemplateModal(true)}
                      className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {templates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{template.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(template.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => loadTemplate(template)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            <ArrowRight size={14} />
                          </button>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {templates.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nenhum template salvo
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignment Areas */}
              <div className="xl:col-span-3">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <DropZone
                    id="base"
                    title="Técnicos de Base"
                    technicanIds={baseTechnicians}
                    color="bg-blue-100 text-blue-800"
                    icon={<Users size={20} className="text-blue-600" />}
                    maxCapacity={6}
                  />
                  
                  <DropZone
                    id="visit"
                    title="Visitas Técnicas"
                    technicanIds={visitTechnicians}
                    color="bg-green-100 text-green-800"
                    icon={<MapPin size={20} className="text-green-600" />}
                    maxCapacity={4}
                  />
                  
                  <DropZone
                    id="off"
                    title="Técnicos de Folga"
                    technicanIds={offTechnicians}
                    color="bg-gray-100 text-gray-800"
                    icon={<Clock size={20} className="text-gray-600" />}
                  />
                </div>

                {/* Schools Selection */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MapPin size={20} />
                    Escolas e Demandas
                  </h3>
                  
                  {/* School Search */}
                  <div className="relative mb-6">
                    <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Pesquisar escolas..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>

                  {/* Search Results */}
                  {searchText && (
                    <div className="mb-6 bg-gray-50 dark:bg-zinc-700 rounded-lg max-h-40 overflow-y-auto">
                      {filteredSchools.map((school) => (
                        <div
                          key={school.id}
                          onClick={() => handleSelectSchool(school)}
                          className="p-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-zinc-600 border-b border-gray-200 dark:border-zinc-600 last:border-b-0 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{school.name}</span>
                            {school.district && (
                              <span className="text-sm text-gray-500 ml-2">Distrito {school.district}</span>
                            )}
                          </div>
                          {school.pendingOs && school.pendingOs > 0 && (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                              {school.pendingOs} OS pendente{school.pendingOs !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      ))}
                      {filteredSchools.length === 0 && (
                        <div className="p-3 text-gray-500 text-center">
                          Nenhuma escola encontrada
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected Schools */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Escolas Selecionadas ({selectedSchools.length})
                    </h4>
                    {selectedSchools.length > 0 ? (
                      <div className="space-y-4">
                        {selectedSchools.map((school) => {
                          const analysis = demandAnalysis[school.id];
                          return (
                            <div key={school.id} className="border border-gray-200 dark:border-zinc-600 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <MapPin size={16} className="text-gray-500" />
                                  <span className="font-medium text-gray-900 dark:text-white">{school.name}</span>
                                  {school.district && (
                                    <span className="text-sm text-gray-500">Distrito {school.district}</span>
                                  )}
                                  {analysis && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      analysis.complexity === 'alta' ? 'bg-red-100 text-red-800' :
                                      analysis.complexity === 'media' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {analysis.complexity === 'alta' ? 'Alta Complexidade' :
                                       analysis.complexity === 'media' ? 'Média Complexidade' :
                                       'Baixa Complexidade'}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleRemoveSchool(school.id)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <Trash size={16} />
                                </button>
                              </div>

                              {/* Smart Analysis Display */}
                              {analysis && showSmartSuggestions && (
                                <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="font-medium text-blue-800 dark:text-blue-300">Especialidades detectadas:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {analysis.detectedSpecialties.map((spec, index) => (
                                          <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                                            {spec}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-blue-800 dark:text-blue-300">Tempo estimado:</span>
                                      <span className="ml-2 text-blue-700 dark:text-blue-200">{analysis.estimatedHours}h</span>
                                    </div>
                                  </div>
                                  
                                  {analysis.suggestedTechnicians.length > 0 && (
                                    <div className="mt-3">
                                      <span className="font-medium text-blue-800 dark:text-blue-300 text-sm">Técnicos sugeridos:</span>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {analysis.suggestedTechnicians.map(techId => {
                                          const tech = technicians.find(t => t.id === techId);
                                          return tech ? (
                                            <span key={techId} className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded text-xs font-medium flex items-center gap-1">
                                              <User size={12} />
                                              {tech.displayName}
                                              {tech.experienceLevel && (
                                                <span className="opacity-75">({tech.experienceLevel})</span>
                                              )}
                                            </span>
                                          ) : null;
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              <textarea
                                required
                                value={schoolDemands[school.id] || ""}
                                onChange={(e) => handleDemandChange(school.id, e.target.value)}
                                placeholder="Descreva as demandas do dia para esta escola... (Ex: Configurar impressora, instalar software, resolver problema de rede)"
                                className="w-full p-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                rows={3}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma escola selecionada</p>
                        <p className="text-xs">Use a pesquisa acima para adicionar escolas</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Capacity Warnings */}
                {capacityWarnings.length > 0 && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-2">
                      <WaveTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-800 dark:text-orange-300 mb-2">
                          Alertas de Capacidade
                        </h4>
                        <ul className="space-y-1">
                          {capacityWarnings.map((warning, index) => (
                            <li key={index} className="text-sm text-orange-700 dark:text-orange-200">
                              • {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between mt-8">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowSmartSuggestions(!showSmartSuggestions)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        showSmartSuggestions 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                          : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                      }`}
                    >
                      <ChartBar size={16} />
                      Sugestões IA
                    </button>
                    <button
                      onClick={() => setShowTemplateModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      disabled={baseTechnicians.length === 0 && visitTechnicians.length === 0}
                    >
                      <FloppyDisk size={16} />
                      Salvar Template
                    </button>
                    <button
                      onClick={() => {
                        setBaseTechnicians([]);
                        setVisitTechnicians([]);
                        setOffTechnicians([]);
                        setSelectedSchools([]);
                        setSchoolDemands({});
                        setDemandAnalysis({});
                        setCapacityWarnings([]);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
                    >
                      <ArrowsClockwise size={16} />
                        Limpar Tudo
                    </button>
                  </div>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={loading || selectedSchools.length === 0 || availableTechnicians.length > 0}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium ${
                      availableTechnicians.length > 0 
                        ? 'bg-red-300 cursor-not-allowed text-red-800' 
                        : loading || selectedSchools.length === 0
                          ? 'bg-gray-300 cursor-not-allowed text-gray-600'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                    title={
                      availableTechnicians.length > 0 
                        ? `${availableTechnicians.length} técnico(s) deve(m) ser alocado(s)` 
                        : ''
                    }
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : availableTechnicians.length > 0 ? (
                      <WaveTriangle size={16} />
                    ) : (
                      <FloppyDisk size={16} />
                    )}
                    {loading ? 'Salvando...' : 
                     availableTechnicians.length > 0 ? `${availableTechnicians.length} Não Alocado(s)` : 
                     'Salvar Escala'}
                  </button>
                </div>
              </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {draggedTechnician ? (
                <TechnicianCard technician={draggedTechnician} isDragging />
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : activeView === 'dashboard' ? (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Dashboard de Técnicos
            </h3>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total Técnicos</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{technicians.length}</p>
                  </div>
                  <Users size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 dark:text-green-400 text-sm font-medium">Em Base</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {baseTechnicians.length}
                    </p>
                  </div>
                  <Users size={24} className="text-green-600 dark:text-green-400" />
                </div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Visita Técnica</p>
                    <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                      {visitTechnicians.length}
                    </p>
                  </div>
                  <MapPin size={24} className="text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">De Folga</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {offTechnicians.length}
                    </p>
                  </div>
                  <Clock size={24} className="text-gray-600 dark:text-gray-400" />
                </div>
              </div>
              
              <div className={`rounded-lg p-4 ${
                availableTechnicians.length === 0 
                  ? 'bg-green-50 dark:bg-green-900/20' 
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      availableTechnicians.length === 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>Não Alocados</p>
                    <p className={`text-2xl font-bold ${
                      availableTechnicians.length === 0 
                        ? 'text-green-900 dark:text-green-100' 
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {availableTechnicians.length}
                    </p>
                  </div>
                  {availableTechnicians.length === 0 ? (
                    <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                  ) : (
                    <WaveTriangle size={24} className="text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Technicians List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {technicians.map((technician) => (
                <div key={technician.id} className="border border-gray-200 dark:border-zinc-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{technician.displayName}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      baseTechnicians.includes(technician.id) ? 'bg-blue-100 text-blue-800' :
                      visitTechnicians.includes(technician.id) ? 'bg-green-100 text-green-800' :
                      offTechnicians.includes(technician.id) ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {baseTechnicians.includes(technician.id) ? 'Base' :
                       visitTechnicians.includes(technician.id) ? 'Visita Técnica' :
                       offTechnicians.includes(technician.id) ? 'Folga' : '⚠️ Não Alocado'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <div>
                      <span className="font-medium">Especialidades:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {technician.specialties?.map((spec, index) => (
                          <span key={index} className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                            {spec}
                          </span>
                        )) || <span className="text-gray-500">Nenhuma</span>}
                      </div>
                    </div>
                    <p><span className="font-medium">Nível:</span> {technician.experienceLevel || 'N/A'}</p>
                    <p><span className="font-medium">Capacidade:</span> {technician.maxCapacity || 'N/A'} escolas</p>
                    <p><span className="font-medium">Atribuições:</span> {technician.currentAssignments || 0}</p>
                    <p><span className="font-medium">Status:</span> {
                      baseTechnicians.includes(technician.id) ? '✅ Alocado em Base' :
                      visitTechnicians.includes(technician.id) ? '✅ Alocado em Visita Técnica' :
                      offTechnicians.includes(technician.id) ? '✅ Alocado em Folga' : '❌ NÃO ALOCADO'
                    }</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeView === 'history' ? (
          <div className="space-y-6">
            {/* Header do Histórico */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar size={20} />
                  Histórico de Escalas
                </h3>
                <div className="flex items-center gap-4">
                  <input
                    type="date"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={fetchScaleHistory}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <ArrowsClockwise size={16} />
                    Atualizar
                  </button>
                </div>
              </div>

              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : scaleHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhuma escala encontrada</p>
                  <p className="text-sm">Crie sua primeira escala para ver o histórico aqui</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scaleHistory
                    .filter(scale => !historyDateFilter || scale.date === historyDateFilter)
                    .map((scale, index) => (
                      <div
                        key={`${scale.date}-${index}`}
                        className="border border-gray-200 dark:border-zinc-600 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedHistoryScale(scale)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Calendar size={20} className="text-blue-500" />
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {parseLocalDate(scale.date).toLocaleDateString('pt-BR', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Criado às {new Date(scale.createdAt).toLocaleTimeString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Users size={16} className="text-blue-500" />
                              <span className="text-gray-600 dark:text-gray-400">
                                {scale.totalTechnicians} técnicos
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin size={16} className="text-green-500" />
                              <span className="text-gray-600 dark:text-gray-400">
                                {scale.totalSchools} escolas
                              </span>
                            </div>
                            <Eye size={16} className="text-gray-400" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-blue-800 dark:text-blue-300">Base</span>
                              <span className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs">
                                {scale.baseTechnicians.length}
                              </span>
                            </div>
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                              {scale.baseTechnicians.slice(0, 3).map((tech: any) => (
                                <div key={tech.id} className="text-blue-700 dark:text-blue-200 text-xs">
                                  • {tech.displayName}
                                </div>
                              ))}
                              {scale.baseTechnicians.length > 3 && (
                                <div className="text-blue-600 dark:text-blue-300 text-xs">
                                  +{scale.baseTechnicians.length - 3} mais...
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-green-800 dark:text-green-300">Visita Técnica</span>
                              <span className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs">
                                {scale.visitTechnicians.length}
                              </span>
                            </div>
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                              {scale.visitTechnicians.slice(0, 3).map((tech: any) => (
                                <div key={tech.id} className="text-green-700 dark:text-green-200 text-xs">
                                  • {tech.displayName}
                                </div>
                              ))}
                              {scale.visitTechnicians.length > 3 && (
                                <div className="text-green-600 dark:text-green-300 text-xs">
                                  +{scale.visitTechnicians.length - 3} mais...
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-800 dark:text-gray-300">Folga</span>
                              <span className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-xs">
                                {scale.offTechnicians.length}
                              </span>
                            </div>
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                              {scale.offTechnicians.slice(0, 3).map((tech: any) => (
                                <div key={tech.id} className="text-gray-700 dark:text-gray-200 text-xs">
                                  • {tech.displayName}
                                </div>
                              ))}
                              {scale.offTechnicians.length > 3 && (
                                <div className="text-gray-600 dark:text-gray-300 text-xs">
                                  +{scale.offTechnicians.length - 3} mais...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        ) : activeView === 'analytics' ? (
          <div className="space-y-6">
            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : !analyticsData ? (
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
                <div className="text-center py-12 text-gray-500">
                  <ChartLineUp size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhum dado para análise</p>
                  <p className="text-sm">Crie algumas escalas primeiro para ver os relatórios</p>
                </div>
              </div>
            ) : (
              <>
                {/* Estatísticas Gerais */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <TrendUp size={20} />
                    Estatísticas Gerais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total de Escalas</p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {analyticsData.stats.totalScales}
                          </p>
                        </div>
                        <Calendar size={24} className="text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-600 dark:text-green-400 text-sm font-medium">Total Visitas Técnicas</p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {analyticsData.stats.totalVisitTechnicians}
                          </p>
                        </div>
                        <Users size={24} className="text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Média Escolas/Escala</p>
                          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                            {analyticsData.stats.avgSchoolsPerScale}
                          </p>
                        </div>
                        <MapPin size={24} className="text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Escolas Únicas</p>
                          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {analyticsData.stats.totalUniqueSchools}
                          </p>
                        </div>
                        <MapPin size={24} className="text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Distribuição por Categoria ao Longo do Tempo */}
                  <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Distribuição por Categoria
                    </h3>
                    {analyticsData.categoryDistribution.length > 0 && (
                      <Line
                        data={{
                          labels: analyticsData.categoryDistribution.map((d: any) => 
                            new Date(d.date).toLocaleDateString('pt-BR')
                          ),
                          datasets: [
                            {
                              label: 'Base',
                              data: analyticsData.categoryDistribution.map((d: any) => d.base),
                              borderColor: 'rgb(59, 130, 246)',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              tension: 0.3
                            },
                            {
                              label: 'Visita Técnica',
                              data: analyticsData.categoryDistribution.map((d: any) => d.visit),
                              borderColor: 'rgb(16, 185, 129)',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              tension: 0.3
                            },
                            {
                              label: 'Folga',
                              data: analyticsData.categoryDistribution.map((d: any) => d.off),
                              borderColor: 'rgb(107, 114, 128)',
                              backgroundColor: 'rgba(107, 114, 128, 0.1)',
                              tension: 0.3
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              position: 'top' as const,
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1
                              }
                            }
                          }
                        }}
                      />
                    )}
                  </div>

                  {/* Especialidades Mais Demandadas */}
                  <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Especialidades Mais Demandadas
                    </h3>
                    {analyticsData.topSpecialties.length > 0 && (
                      <Doughnut
                        data={{
                          labels: analyticsData.topSpecialties.map((spec: any) => spec[0]),
                          datasets: [{
                            data: analyticsData.topSpecialties.map((spec: any) => spec[1]),
                            backgroundColor: [
                              'rgba(59, 130, 246, 0.8)',
                              'rgba(16, 185, 129, 0.8)',
                              'rgba(245, 158, 11, 0.8)',
                              'rgba(239, 68, 68, 0.8)',
                              'rgba(139, 92, 246, 0.8)',
                              'rgba(236, 72, 153, 0.8)',
                              'rgba(34, 197, 94, 0.8)',
                              'rgba(156, 163, 175, 0.8)'
                            ],
                            borderWidth: 2
                          }]
                        }}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              position: 'bottom' as const,
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Rankings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Técnicos Mais em Visitas */}
                  <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Users size={20} />
                      Técnicos Mais em Visitas
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {analyticsData.topVisitTechnicians.map(([name, count]: any, index: number) => (
                        <div key={name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                              index === 0 ? 'bg-yellow-500' :
                              index === 1 ? 'bg-gray-400' :
                              index === 2 ? 'bg-amber-600' : 'bg-green-500'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                          </div>
                          <span className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                            {count} visitas
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Escolas Mais Demandadas */}
                  <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <MapPin size={20} />
                      Escolas Mais Demandadas
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {analyticsData.topSchools.map(([name, count]: any, index: number) => (
                        <div key={name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                              index === 0 ? 'bg-yellow-500' :
                              index === 1 ? 'bg-gray-400' :
                              index === 2 ? 'bg-amber-600' : 'bg-orange-500'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white text-sm">{name}</span>
                          </div>
                          <span className="bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full text-sm font-medium">
                            {count} demandas
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Nova seção para Escolas Mais Visitadas */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MapPin size={20} />
                    Escolas Mais Visitadas (OS Realizadas)
                  </h3>
                  {loadingSchoolVisits ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : schoolVisitsData ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {schoolVisitsData.topVisitedSchools.map(([name, count]: any, index: number) => (
                        <div key={name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                              index === 0 ? 'bg-yellow-500' :
                              index === 1 ? 'bg-gray-400' :
                              index === 2 ? 'bg-amber-600' : 'bg-green-500'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white text-sm">{name}</span>
                          </div>
                          <span className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                            {count} OS
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Erro ao carregar dados de visitas</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : activeView === 'agenda' ? (
          <GoogleCalendar 
            events={events}
            calendars={calendars}
            onEventCreate={handleEventCreate}
            onEventUpdate={handleEventUpdate}
            onEventDelete={handleEventDelete}
            onCalendarCreate={handleCalendarCreate}
            onCalendarUpdate={handleCalendarUpdate}
            onCalendarToggle={handleCalendarToggle}
          />
        ) : activeView === 'tickets' ? (
          <div className="space-y-6">
            {/* Header dos Chamados */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Wrench size={20} />
                  Chamados Técnicos
                </h3>
                
                {/* Filtros e Pesquisa */}
                <div className="flex items-center gap-3">
                  {/* Barra de Pesquisa */}
                  <div className="relative">
                    <MagnifyingGlass size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar chamados..."
                      value={ticketSearchTerm}
                      onChange={(e) => setTicketSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                    />
                    {ticketSearchTerm && (
                      <button
                        onClick={() => setTicketSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Limpar pesquisa"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  {/* Filtro de Status */}
                  <select
                    value={ticketFilter}
                    onChange={(e) => setTicketFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value="OPEN">Abertos</option>
                    <option value="ASSIGNED">Atribuídos</option>
                    <option value="SCHEDULED">Agendados</option>
                    <option value="IN_PROGRESS">Em Andamento</option>
                    <option value="RESOLVED">Resolvidos</option>
                  </select>
                </div>
              </div>

              {/* Estatísticas */}
              {ticketStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{ticketStats.total}</div>
                    <div className="text-xs text-blue-800 dark:text-blue-300">Total</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{ticketStats.open}</div>
                    <div className="text-xs text-yellow-800 dark:text-yellow-300">Abertos</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{ticketStats.assigned}</div>
                    <div className="text-xs text-orange-800 dark:text-orange-300">Atribuídos</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{ticketStats.scheduled}</div>
                    <div className="text-xs text-purple-800 dark:text-purple-300">Agendados</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{ticketStats.inProgress}</div>
                    <div className="text-xs text-blue-800 dark:text-blue-300">Em Andamento</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{ticketStats.resolved}</div>
                    <div className="text-xs text-green-800 dark:text-green-300">Resolvidos</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{ticketStats.closed}</div>
                    <div className="text-xs text-gray-800 dark:text-gray-300">Fechados</div>
                  </div>
                </div>
              )}
            </div>

            {/* Informações da Pesquisa */}
            {ticketSearchTerm && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <MagnifyingGlass size={16} />
                  <span>
                    Pesquisando por: <strong>"{ticketSearchTerm}"</strong>
                  </span>
                  <button
                    onClick={() => setTicketSearchTerm('')}
                    className="ml-auto px-2 py-1 bg-blue-200 dark:bg-blue-800 hover:bg-blue-300 dark:hover:bg-blue-700 rounded text-xs transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de Chamados */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700">
              {loadingTickets ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (() => {
                // Filtrar chamados baseado no termo de pesquisa
                const filteredTickets = technicalTickets.filter(ticket => {
                  const searchLower = ticketSearchTerm.toLowerCase();
                  return (
                    ticket.title.toLowerCase().includes(searchLower) ||
                    ticket.description.toLowerCase().includes(searchLower) ||
                    ticket.School?.name.toLowerCase().includes(searchLower) ||
                    ticket.category.toLowerCase().includes(searchLower) ||
                    ticket.id.toString().includes(searchLower)
                  );
                });

                return filteredTickets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Wrench size={32} className="mx-auto mb-2 opacity-50" />
                    <p>
                      {ticketSearchTerm 
                        ? `Nenhum chamado encontrado para "${ticketSearchTerm}"`
                        : 'Nenhum chamado técnico encontrado'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowTicketModal(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              #{ticket.id} - {ticket.School?.name} - {ticket.title}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              ticket.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              ticket.status === 'ASSIGNED' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                              ticket.status === 'SCHEDULED' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {ticket.status === 'OPEN' ? 'Aberto' :
                               ticket.status === 'ASSIGNED' ? 'Atribuído' :
                               ticket.status === 'SCHEDULED' ? 'Agendado' :
                               ticket.status === 'IN_PROGRESS' ? 'Em Andamento' :
                               ticket.status === 'RESOLVED' ? 'Resolvido' : 'Fechado'}
                            </span>
                            {ticket.priority && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                ticket.priority === 'URGENT' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                ticket.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              }`}>
                                {ticket.priority === 'URGENT' ? 'Urgente' :
                                 ticket.priority === 'HIGH' ? 'Alta' :
                                 ticket.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {ticket.School?.name}
                            </span>
                            <span>{ticket.category}</span>
                            <span>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            {ticket.description}
                          </p>
                          {ticket.assignedTo && (
                            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                              Responsável: {ticket.assignedTo}
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          {ticket.status === 'OPEN' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implementar aceitar chamado
                                console.log('Aceitar chamado:', ticket.id);
                              }}
                              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                            >
                              Aceitar
                            </button>
                          )}
                          {/* Botão de deletar (disponível para todos os status) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTicketToDelete(ticket);
                              setShowDeleteModal(true);
                            }}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                            title="Excluir chamado"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : null}
      </div>

      {/* History Detail Modal */}
      {selectedHistoryScale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-4xl mx-auto p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar size={24} />
                Detalhes da Escala - {new Date(selectedHistoryScale.date).toLocaleDateString('pt-BR')}
              </h2>
              <button
                onClick={() => setSelectedHistoryScale(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Base Technicians */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                  <Users size={20} />
                  Técnicos de Base ({selectedHistoryScale.baseTechnicians.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedHistoryScale.baseTechnicians.map((tech: any) => (
                    <div key={tech.id} className="bg-white dark:bg-blue-800/30 rounded p-3 border border-blue-200 dark:border-blue-700">
                      <div className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                        {tech.displayName}
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 mt-1 font-medium">
                        Adicionado: {new Date(tech.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                  {selectedHistoryScale.baseTechnicians.length === 0 && (
                    <p className="text-blue-600 dark:text-blue-300 text-sm">Nenhum técnico alocado</p>
                  )}
                </div>
              </div>

              {/* Visit Technicians */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                  <MapPin size={20} />
                  Visitas Técnicas ({selectedHistoryScale.visitTechnicians.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedHistoryScale.visitTechnicians.map((tech: any) => (
                    <div key={tech.id} className="bg-white dark:bg-green-800/30 rounded p-3 border border-green-200 dark:border-green-700">
                      <div className="font-semibold text-green-900 dark:text-green-100 text-sm">
                        {tech.displayName}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1 font-medium">
                        Adicionado: {new Date(tech.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                  {selectedHistoryScale.visitTechnicians.length === 0 && (
                    <p className="text-green-600 dark:text-green-300 text-sm">Nenhum técnico alocado</p>
                  )}
                </div>
              </div>

              {/* Off Technicians */}
              <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Clock size={20} />
                  Técnicos de Folga ({selectedHistoryScale.offTechnicians.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedHistoryScale.offTechnicians.map((tech: any) => (
                    <div key={tech.id} className="bg-white dark:bg-gray-800/30 rounded p-3 border border-gray-200 dark:border-gray-600">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                        {tech.displayName}
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 font-medium">
                        Adicionado: {new Date(tech.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                  {selectedHistoryScale.offTechnicians.length === 0 && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Nenhum técnico alocado</p>
                  )}
                </div>
              </div>
            </div>

            {/* School Demands */}
            {selectedHistoryScale.schoolDemands.length > 0 && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center gap-2">
                  <MapPin size={20} />
                  Demandas das Escolas ({selectedHistoryScale.schoolDemands.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                  {selectedHistoryScale.schoolDemands.map((demand: any) => (
                    <div key={demand.id} className="bg-white dark:bg-indigo-800/30 rounded p-3 border border-indigo-200 dark:border-indigo-700">
                      <div className="font-medium text-indigo-900 dark:text-indigo-100 text-sm mb-1">
                        {demand.School?.name || 'Escola não identificada'}
                      </div>
                      {demand.School?.district && (
                        <div className="text-xs text-indigo-700 dark:text-indigo-300 mb-2 font-medium">
                          Distrito: {demand.School.district}
                        </div>
                      )}
                      <div className="text-sm text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded p-3 font-medium">
                        {demand.demand}
                      </div>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium">
                        Criado: {new Date(demand.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedHistoryScale(null)}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-md mx-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Salvar Template
            </h2>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nome do template..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={saveTemplate}
                disabled={!templateName.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg transition-colors"
              >
                <FloppyDisk size={16} className="inline mr-2" />
                Salvar
              </button>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setTemplateName("");
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Original Modal System (mantido para compatibilidade) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-2xl mx-auto p-8 max-h-[90vh] overflow-y-auto">
            {successMessage ? (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-600 mb-4">
                    Sucesso!
                  </h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-6 text-center text-lg">{successMessage}</p>
                <button
                  onClick={handleCloseModal}
                  className="w-full bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition duration-300 text-lg font-medium"
                >
                  Fechar
                </button>
              </>
            ) : errorMessage ? (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                    <WaveTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-red-600 mb-2">
                    {errorMessage.title}
                  </h2>
                </div>

                {errorMessage.schoolName && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-red-800 dark:text-red-300 mb-4 text-lg">
                      📍 Escola Selecionada:
                    </h3>
                    <p className="text-red-700 dark:text-red-200 text-base mb-4 break-words font-medium">
                      {errorMessage.schoolName}
                    </p>

                    {errorMessage.totalPending > 0 && (
                      <div className="bg-white dark:bg-red-800/30 rounded-md p-4 border border-red-200 dark:border-red-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-red-800 dark:text-red-300 text-lg">
                            📋 OS Pendentes:
                          </span>
                          <span className="bg-red-100 dark:bg-red-700 text-red-800 dark:text-red-100 px-3 py-2 rounded-full text-base font-bold">
                            {errorMessage.totalPending}
                          </span>
                        </div>
                        {errorMessage.details && (
                          <p className="text-red-600 dark:text-red-200 text-base font-medium">
                            {errorMessage.details}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-5 mb-6">
                  <div className="flex items-start">
                    <WaveTriangle className="h-6 w-6 text-yellow-400 mt-1 mr-3" />
                    <div>
                      <h4 className="text-yellow-800 dark:text-yellow-300 font-semibold text-lg mb-2">Ação Necessária:</h4>
                      <p className="text-yellow-700 dark:text-yellow-200 text-base font-medium">
                        {errorMessage.instruction}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCloseModal}
                  className="w-full bg-red-500 text-white py-4 px-6 rounded-lg hover:bg-red-600 transition duration-300 font-semibold text-lg"
                >
                  Entendi
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                    <WaveTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-red-600 mb-4">
                    Erros na Escala
                  </h2>
                </div>

                <div className="space-y-6">
                  {conflictingTechnicians.some((t) =>
                    t.categories[0].includes("Alocado em"),
                  ) && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-5">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-3">
                          ⚠️ Conflitos de Alocação:
                        </h3>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                          {conflictingTechnicians
                            .filter((t) => t.categories[0].includes("Alocado em"))
                            .map((tech, index) => (
                              <li key={index} className="text-base">
                                <span className="font-medium">{tech.name}</span> - {tech.categories[0]}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  {conflictingTechnicians.some((t) =>
                    t.categories[0].includes("Não está"),
                  ) && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-5">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-3">
                          📋 Técnicos Não Alocados:
                        </h3>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                          {conflictingTechnicians
                            .filter((t) => t.categories[0].includes("Não está"))
                            .map((tech, index) => (
                              <li key={index} className="text-base">
                                <span className="font-medium">{tech.name}</span> - {tech.categories[0]}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                </div>

                <button
                  onClick={handleCloseModal}
                  className="w-full mt-6 bg-red-500 text-white py-4 px-6 rounded-lg hover:bg-red-600 transition duration-300 font-semibold text-lg"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Ticket Detail/Action Modal */}
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-2xl mx-auto p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Wrench size={20} />
                Chamado #{selectedTicket.id}
              </h2>
              <button
                onClick={() => {
                  setShowTicketModal(false);
                  setSelectedTicket(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {selectedTicket.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {selectedTicket.School?.name}
                  </span>
                  <span>{selectedTicket.category}</span>
                  <span>{new Date(selectedTicket.createdAt).toLocaleDateString('pt-BR')}</span>
                  <span>Por: {selectedTicket.createdBy}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Descrição:</h4>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </div>

              {selectedTicket.equipmentAffected && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Equipamentos Afetados:</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    {selectedTicket.equipmentAffected}
                  </p>
                </div>
              )}

              {selectedTicket.status === 'OPEN' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
                    Aceitar e Agendar Chamado
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Prioridade:
                      </label>
                      <select 
                        value={schedulePriority} 
                        onChange={(e) => setSchedulePriority(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="LOW">Baixa</option>
                        <option value="MEDIUM">Média</option>
                        <option value="HIGH">Alta</option>
                        <option value="URGENT">Urgente</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Responsável:
                      </label>
                      {loadingUser ? (
                        <div className="flex items-center gap-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span className="text-gray-500 dark:text-gray-400">Carregando...</span>
                        </div>
                      ) : currentUser ? (
                        <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 font-medium">
                          {currentUser.displayName} ({currentUser.role})
                        </div>
                      ) : (
                        <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100">
                          Erro: Usuário não encontrado ou sem permissão
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data da Visita:
                      </label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Horário:
                      </label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Observações Internas:
                    </label>
                    <textarea
                      rows={3}
                      value={scheduleNotes}
                      onChange={(e) => setScheduleNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="Observações para a equipe técnica..."
                    ></textarea>
                  </div>

                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                    <button
                      className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                        scheduling || !scheduleDate || !scheduleTime
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                      onClick={handleScheduleTicket}
                      disabled={scheduling || !scheduleDate || !scheduleTime}
                    >
                      {scheduling ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Agendando...
                        </div>
                      ) : (
                        'Aceitar e Agendar'
                      )}
                    </button>
                    <button
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => {
                        setShowTicketModal(false);
                        setSelectedTicket(null);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Botão de Exclusão - Sempre visível */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setTicketToDelete(selectedTicket);
                    setShowDeleteModal(true);
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash size={16} />
                  Excluir Chamado
                </button>
              </div>

              {selectedTicket.status !== 'OPEN' && (
                <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        selectedTicket.status === 'SCHEDULED' ? 'bg-purple-100 text-purple-800' :
                        selectedTicket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        selectedTicket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedTicket.status === 'SCHEDULED' ? 'Agendado' :
                         selectedTicket.status === 'IN_PROGRESS' ? 'Em Andamento' :
                         selectedTicket.status === 'RESOLVED' ? 'Resolvido' : selectedTicket.status}
                      </span>
                    </div>
                    
                    {selectedTicket.scheduledDate && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Agendado para: {new Date(selectedTicket.scheduledDate).toLocaleDateString('pt-BR')}
                        {selectedTicket.scheduledTime && ` às ${selectedTicket.scheduledTime}`}
                      </div>
                    )}
                  </div>
                  
                  {selectedTicket.assignedTo && (
                    <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                      Responsável: {selectedTicket.assignedTo}
                    </div>
                  )}
                  
                  {selectedTicket.notes && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Observações:</span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {selectedTicket.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && ticketToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-md mx-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Trash size={20} className="text-red-500" />
                Excluir Chamado
              </h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTicketToDelete(null);
                  setDeletionReason('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Atenção:</strong> Ao excluir este chamado, a escola será notificada sobre o motivo da exclusão.
                </p>
              </div>

              <div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  <strong>Chamado:</strong> #{ticketToDelete.id} - {ticketToDelete.title}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  <strong>Escola:</strong> {ticketToDelete.School?.name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Motivo da Exclusão: *
                </label>
                <textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Explique o motivo da exclusão do chamado (será mostrado para a escola)..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={4}
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTicketToDelete(null);
                    setDeletionReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteTicket}
                  disabled={!deletionReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  Excluir Chamado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scales;
