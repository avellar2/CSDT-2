import { useRouter } from "next/router";
import {
  PlusCircle,
  List,
  FileText,
  ChartBar,
  GraduationCap,
  ClipboardText,
  Printer,
  ChartPie,
  MagnifyingGlass,
  Star,
  Bell,
  Calendar,
  Gear,
  Users,
  Desktop,
  Plus,
  Wrench,
  Trash,
  CheckCircle,
  ChatCircle,
  CloudArrowDown,
  Phone,
  BookOpen
} from "phosphor-react";
import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Header } from "./Header";
import { useHeaderContext } from "../context/HeaderContext";
import { supabase } from "@/lib/supabaseClient";
import DashboardRegisterForm from "./DashboardRegisterForm";
// import ChamadosEscolaCard from "./ChamadosEscolaCard";
// import NovoChamadoModal from "./NovoChamadoModal";

interface DecodedToken {
  userId: string;
  name: string;
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { setUserName } = useHeaderContext();
  const [userName, setUserNameState] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notifications, setNotifications] = useState({
    pendingOS: 0,
    newDemands: 0,
    alerts: 0,
    internalChat: 0,
    delayedDiagnostics: 0,
    chamadosPendentes: 0,
    chamadosAbertos: 0
  });
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  // const [showNovoChamadoModal, setShowNovoChamadoModal] = useState(false);
  // const [chamadosEscola, setChamadosEscola] = useState([]);
  // const [isLoadingChamados, setIsLoadingChamados] = useState(false);

  // Lógica para buscar o usuário do Supabase e consultar a role no Prisma
  useEffect(() => {
    const fetchSupabaseUser = async () => {
      try {
        // 1. Pega o usuário logado no Supabase
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          console.error("Erro ao buscar usuário no Supabase:", error);
          setIsLoading(false);
          return;
        }

        console.log("ID do usuário no Supabase:", user.id);
        setSupabaseUserId(user.id); // Guarda o ID do usuário

        // 2. Consulta a role no Prisma usando o ID do Supabase
        const response = await fetch(`/api/get-role?userId=${user.id}`);
        const data = await response.json();

        if (response.ok && data.role) {
          setUserRole(data.role); // Atualiza a role do usuário
          console.log("Role do usuário:", data.role);
        } else {
          console.error("Erro ao buscar role:", data.error);
        }
      } catch (err) {
        console.error("Erro na conexão com Supabase/Prisma:", err);
      } finally {
        setIsLoading(false); // Define que o carregamento foi concluído
      }
    };

    fetchSupabaseUser();
  }, []);

  // Lógica existente para buscar o token e decodificar
  useEffect(() => {
    const fetchRole = async (userId: string) => {
      try {
        const response = await fetch(`/api/get-role?userId=${userId}`);
        const data = await response.json();
        console.log("Resposta do fetchRole:", data);
        if (response.ok) {
          setUserRole(data.role); // Define a role do usuário
        } else {
          console.error("Erro ao buscar a role:", data.error);
        }
      } catch (error) {
        console.error("Erro ao buscar a role:", error);
      } finally {
        setIsLoading(false); // Define que o carregamento foi concluído
      }
    };

    const token = localStorage.getItem("token");
    if (token) {
      const decoded: DecodedToken = jwtDecode<DecodedToken>(token);
      console.log("Decoded Token:", decoded); // Verifica o token decodificado
      setUserName(decoded.name);
      setUserNameState(decoded.name);
      fetchRole(decoded.userId); // Busca a role do usuário
    } else {
      console.log("Token não encontrado no localStorage.");
      setIsLoading(false);
    }
  }, [setUserName]);

  // Carregar favoritos do localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('dashboard-favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Buscar notificações (dados reais)
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userRole) return;

      try {
        // Buscar OS pendentes
        const pendingOSResponse = await fetch('/api/dashboard/pending-os');
        const pendingOSData = await pendingOSResponse.json();

        // Buscar demandas do dia
        const dailyDemandsResponse = await fetch('/api/dashboard/daily-demands-count');
        const dailyDemandsData = await dailyDemandsResponse.json();

        // Buscar chamados internos pendentes (só para TECH, ADMIN, ADMTOTAL)
        let internalChatCount = 0;
        if (['TECH', 'ADMIN', 'ADMTOTAL'].includes(userRole)) {
          const internalChatResponse = await fetch('/api/internal-chat/count-pending');
          const internalChatData = await internalChatResponse.json();
          internalChatCount = internalChatData.success ? internalChatData.needsAttention : 0;
        }

        // Buscar diagnósticos atrasados (3+ dias)
        let delayedDiagnosticsCount = 0;
        if (['TECH', 'ADMIN', 'ADMTOTAL'].includes(userRole)) {
          try {
            const delayedResponse = await fetch('/api/chada-diagnostics/delayed');
            const delayedData = await delayedResponse.json();
            delayedDiagnosticsCount = delayedData.stats ? delayedData.stats.total : 0;
          } catch (error) {
            console.error('Erro ao buscar diagnósticos atrasados:', error);
          }
        }

        // Buscar chamados pendentes das escolas - COMENTADO TEMPORARIAMENTE
        /*
        let chamadosPendentesCount = 0;
        if (['TECH', 'ADMIN', 'ADMTOTAL'].includes(userRole)) {
          try {
            const chamadosResponse = await fetch('/api/dashboard/chamados-pendentes');
            const chamadosData = await chamadosResponse.json();
            chamadosPendentesCount = chamadosData.success ? chamadosData.data.totalPending : 0;
          } catch (error) {
            console.error('Erro ao buscar chamados pendentes:', error);
          }
        }
        */
        let chamadosPendentesCount = 0;

        // Buscar chamados abertos (TechnicalTicket + ChamadoEscala)
        let chamadosAbertosCount = 0;
        if (['TECH', 'ADMIN', 'ADMTOTAL'].includes(userRole)) {
          try {
            const chamadosAbertosResponse = await fetch('/api/dashboard/chamados-abertos');
            const chamadosAbertosData = await chamadosAbertosResponse.json();
            chamadosAbertosCount = chamadosAbertosData.success ? chamadosAbertosData.data.total : 0;
          } catch (error) {
            console.error('Erro ao buscar chamados abertos:', error);
          }
        }

        const newNotifications = {
          pendingOS: pendingOSData.success ? pendingOSData.data.totalPendingOS : 0,
          newDemands: dailyDemandsData.success ? dailyDemandsData.data.dailyDemandsCount : 0,
          alerts: 0, // Pode implementar depois
          internalChat: internalChatCount,
          delayedDiagnostics: delayedDiagnosticsCount,
          chamadosPendentes: chamadosPendentesCount,
          chamadosAbertos: chamadosAbertosCount
        };

        setNotifications(newNotifications);

        console.log('🔔 Notificações atualizadas:', newNotifications);
      } catch (error) {
        console.error('❌ Erro ao buscar notificações:', error);
        // Em caso de erro, manter valores zerados
        setNotifications({
          pendingOS: 0,
          newDemands: 0,
          alerts: 0,
          internalChat: 0,
          delayedDiagnostics: 0,
          chamadosPendentes: 0,
          chamadosAbertos: 0
        });
      }
    };

    fetchNotifications();
  }, [userRole]);

  // Buscar chamados das escolas - COMENTADO TEMPORARIAMENTE
  /*
  useEffect(() => {
    if (['TECH', 'ADMIN', 'ADMTOTAL'].includes(userRole || '')) {
      fetchChamadosEscola();
    }
  }, [userRole]);
  */

  // FUNÇÃO COMENTADA TEMPORARIAMENTE
  /*
  const fetchChamadosEscola = async () => {
    try {
      const response = await fetch('/api/chamados-escola');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filtrar apenas chamados pendentes
          const pendentes = data.data.filter((chamado: any) =>
            ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(chamado.status)
          );
          setChamadosEscola(pendentes);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar chamados das escolas:', error);
    }
  };
  */

  // FUNÇÃO COMENTADA TEMPORARIAMENTE
  /*
  const handleCreateChamado = async (chamadoData: any) => {
    setIsLoadingChamados(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch('/api/chamados-escola', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(chamadoData)
      });

      if (!response.ok) {
        throw new Error('Erro ao criar chamado');
      }

      // Atualizar lista de chamados
      await fetchChamadosEscola();

      // Atualizar notificações
      const fetchNotifications = async () => {
        try {
          const chamadosResponse = await fetch('/api/dashboard/chamados-pendentes');
          const chamadosData = await chamadosResponse.json();

          setNotifications(prev => ({
            ...prev,
            chamadosPendentes: chamadosData.success ? chamadosData.data.totalPending : 0
          }));
        } catch (error) {
          console.error('Erro ao atualizar notificações:', error);
        }
      };
      await fetchNotifications();

    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      throw error;
    } finally {
      setIsLoadingChamados(false);
    }
  };
  */

  // FUNÇÃO COMENTADA TEMPORARIAMENTE
  /*
  const handleUpdateChamado = async (id: string, updateData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(`/api/chamados-escola/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar chamado');
      }

      // Atualizar lista de chamados
      await fetchChamadosEscola();

      // Atualizar notificações
      const fetchNotifications = async () => {
        try {
          const chamadosResponse = await fetch('/api/dashboard/chamados-pendentes');
          const chamadosData = await chamadosResponse.json();

          setNotifications(prev => ({
            ...prev,
            chamadosPendentes: chamadosData.success ? chamadosData.data.totalPending : 0
          }));
        } catch (error) {
          console.error('Erro ao atualizar notificações:', error);
        }
      };
      await fetchNotifications();

    } catch (error) {
      console.error('Erro ao atualizar chamado:', error);
      throw error;
    }
  };
  */

  const toggleFavorite = (cardId: string) => {
    const newFavorites = favorites.includes(cardId)
      ? favorites.filter(id => id !== cardId)
      : [...favorites, cardId];
    setFavorites(newFavorites);
    localStorage.setItem('dashboard-favorites', JSON.stringify(newFavorites));
  };

  const handleLogout = () => {
    supabase.auth.signOut(); // Faz logout no Supabase
    localStorage.removeItem("token");
    router.push("/login");
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleCreateBackup = async () => {
    // Verificar se é o Vanderson pelo ID do Supabase
    if (supabaseUserId !== 'c7b74239-4188-4218-8390-063e0ad58871') {
      alert('Acesso negado. Apenas Vanderson pode fazer backup.');
      return;
    }

    setIsCreatingBackup(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Você precisa estar logado para fazer backup.');
        return;
      }

      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar backup');
      }

      // Criar download do arquivo ZIP
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `backup_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert('✅ Backup CSV criado com sucesso! O arquivo ZIP foi baixado com todos os dados em formato CSV.');
      
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      alert(`❌ Erro ao criar backup: ${error}`);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Definir categorias de cards
  const cardCategories = {
    'Ordens de Serviço': ['fill-pdf-form-2', 'os-list', 'os-externas-list', 'create-internal-os'],
    'Estatísticas': ['statistics', 'advanced-statistics'],
    'Escolas e Equipamentos': ['schools', 'items', 'device-list', 'printers', 'locados'],
    'Gestão Diária': ['daily-demands', 'scales', 'internal-demands'],
    'Documentos': ['memorandums', 'new-memorandums'],
    'Administração': ['register-users'],
    'Chamados Técnicos': ['open-technical-ticket', 'view-deleted-tickets', 'internal-chat', 'accepted-tickets'],
    'Ajuda e Suporte': ['manual-usuario'],
    'Outros': ['chada']
  };

  // Definir todos os cards disponíveis
  const allCards: Array<{
    id: string;
    title: string;
    icon: any;
    color: string;
    path?: string;
    action?: () => void;
    roles: string[];
    category: string;
    badge: number | null;
  }> = [
    {
      id: 'items',
      title: 'Cadastrar Itens',
      icon: PlusCircle,
      color: 'bg-blue-500 hover:bg-blue-700',
      path: '/items',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH'],
      category: 'Escolas e Equipamentos',
      badge: null
    },
    {
      id: 'device-list',
      title: 'Ver Itens Cadastrados',
      icon: List,
      color: 'bg-green-500 hover:bg-green-700',
      path: '/device-list',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH', 'ONLYREAD'],
      category: 'Escolas e Equipamentos',
      badge: null
    },
    {
      id: 'fill-pdf-form-2',
      title: 'Preencher OS',
      icon: FileText,
      color: 'bg-red-500 hover:bg-red-700',
      path: '/fill-pdf-form-2',
      roles: ['ADMTOTAL', 'TECH'],
      category: 'Ordens de Serviço',
      badge: null
    },
    {
      id: 'statistics',
      title: 'Estatísticas de OS',
      icon: ChartBar,
      color: 'bg-purple-500 hover:bg-purple-700',
      path: '/statistics',
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Estatísticas',
      badge: null
    },
    {
      id: 'advanced-statistics',
      title: 'Dashboard Avançado',
      icon: ChartPie,
      color: 'bg-violet-500 hover:bg-violet-700',
      path: '/advanced-statistics',
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Estatísticas',
      badge: null
    },
    {
      id: 'schools',
      title: 'Todas as Escolas',
      icon: GraduationCap,
      color: 'bg-orange-500 hover:bg-orange-700',
      path: '/schools',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH', 'ONLYREAD'],
      category: 'Escolas e Equipamentos',
      badge: null
    },
    {
      id: 'os-list',
      title: 'OS Externas (Antigo)',
      icon: ClipboardText,
      color: 'bg-indigo-500 hover:bg-indigo-700',
      path: '/os-list',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH'],
      category: 'Ordens de Serviço',
      badge: null
    },
    {
      id: 'os-externas-list',
      title: 'OS Externas (Novo)',
      icon: ClipboardText,
      color: 'bg-emerald-500 hover:bg-emerald-700',
      path: '/os-externas-list',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH'],
      category: 'Ordens de Serviço',
      badge: notifications.pendingOS > 0 ? notifications.pendingOS : null
    },
    {
      id: 'printers',
      title: 'Todas as Impressoras',
      icon: Printer,
      color: 'bg-teal-500 hover:bg-teal-700',
      path: '/printers',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH'],
      category: 'Escolas e Equipamentos',
      badge: null
    },
    {
      id: 'memorandums',
      title: 'Todos os Memorandos',
      icon: FileText,
      color: 'bg-yellow-500 hover:bg-yellow-700',
      path: '/memorandums',
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Documentos',
      badge: null
    },
    {
      id: 'new-memorandums',
      title: 'Memorandos (Novo)',
      icon: FileText,
      color: 'bg-orange-600 hover:bg-orange-800',
      path: '/new-memorandums',
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Documentos',
      badge: null
    },
    {
      id: 'scales',
      title: 'Escalas',
      icon: Users,
      color: 'bg-gray-500 hover:bg-gray-700',
      path: notifications.chamadosAbertos > 0 ? '/scales?view=tickets' : '/scales',
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Gestão Diária',
      badge: notifications.chamadosAbertos > 0 ? notifications.chamadosAbertos : null
    },
    {
      id: 'daily-demands',
      title: 'Demanda do Dia',
      icon: Calendar,
      color: 'bg-cyan-500 hover:bg-cyan-700',
      path: '/daily-demands',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH'],
      category: 'Gestão Diária',
      badge: notifications.newDemands > 0 ? notifications.newDemands : null
    },
    {
      id: 'create-internal-os',
      title: 'Criar OS Interna',
      icon: FileText,
      color: 'bg-pink-500 hover:bg-pink-700',
      path: '/create-internal-os',
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Ordens de Serviço',
      badge: null
    },
    {
      id: 'internal-demands',
      title: 'Demandas Internas',
      icon: ClipboardText,
      color: 'bg-yellow-600 hover:bg-yellow-800',
      path: '/internal-demands',
      roles: ['TECH'],
      category: 'Gestão Diária',
      badge: null
    },
    {
      id: 'chada',
      title: 'CHADA',
      icon: Desktop,
      color: 'bg-gray-600 hover:bg-gray-800',
      path: '/chada',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH'],
      category: 'Outros',
      badge: notifications.delayedDiagnostics
    },
    {
      id: 'locados',
      title: 'Locados',
      icon: List,
      color: 'bg-lime-500 hover:bg-lime-700',
      path: '/locados',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH', 'ONLYREAD'],
      category: 'Escolas e Equipamentos',
      badge: null
    },
    {
      id: 'register-users',
      title: 'Registrar Usuários',
      icon: Plus,
      color: 'bg-purple-600 hover:bg-purple-800',
      action: () => setShowRegisterForm(true),
      roles: ['ADMIN', 'ADMTOTAL'],
      category: 'Administração',
      badge: null
    },
    {
      id: 'open-technical-ticket',
      title: 'Abrir Chamado Técnico / CSDT',
      icon: Wrench,
      color: 'bg-orange-600 hover:bg-orange-800',
      path: '/technical-tickets/create',
      roles: ['SCHOOL'],
      category: 'Chamados Técnicos',
      badge: null
    },
    {
      id: 'view-deleted-tickets',
      title: 'Ver Chamados Excluídos',
      icon: Trash,
      color: 'bg-red-600 hover:bg-red-800',
      path: '/technical-tickets/deleted',
      roles: ['SCHOOL'],
      category: 'Chamados Técnicos',
      badge: null
    },
    {
      id: 'accepted-tickets',
      title: 'Chamados Aceitos / CSDT',
      icon: CheckCircle,
      color: 'bg-green-600 hover:bg-green-800',
      path: '/technical-tickets/accepted',
      roles: ['ADMIN', 'ADMTOTAL'],
      category: 'Chamados Técnicos',
      badge: null
    },
    {
      id: 'internal-chat',
      title: 'Chat Interno - Setores',
      icon: ChatCircle,
      color: 'bg-blue-600 hover:bg-blue-800',
      path: '/internal-chat',
      roles: ['ADMIN', 'ADMTOTAL', 'TECH', 'SCHOOL'],
      category: 'Chamados Técnicos',
      badge: notifications.internalChat > 0 ? notifications.internalChat : null
    },
    {
      id: 'manual-usuario',
      title: 'Manual do Usuário',
      icon: BookOpen,
      color: 'bg-purple-600 hover:bg-purple-800',
      action: () => window.open('/manual-usuario.html', '_blank'),
      roles: ['ADMIN', 'ADMTOTAL', 'TECH', 'SCHOOL', 'ONLYREAD'],
      category: 'Ajuda e Suporte',
      badge: null
    }
  ];

  // Filtrar cards baseado na role do usuário e termo de busca
  const filteredCards = allCards.filter(card => {
    const hasRole = card.roles.includes(userRole || '');
    const matchesSearch = card.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    return hasRole && matchesSearch;
  });

  // Organizar cards: favoritos primeiro, depois por categoria
  const favoriteCards = filteredCards.filter(card => favorites.includes(card.id));
  const otherCards = filteredCards.filter(card => !favorites.includes(card.id));
  const sortedCards = [...favoriteCards, ...otherCards];

  // Agrupar cards por categoria
  const groupedCards = Object.entries(cardCategories).reduce((acc, [category, cardIds]) => {
    const categoryCards = sortedCards.filter(card => cardIds.includes(card.id));
    
    if (categoryCards.length > 0) {
      acc[category] = categoryCards;
    }
    return acc;
  }, {} as Record<string, typeof sortedCards>);

  // Cards que não estão em nenhuma categoria
  const uncategorizedCards = sortedCards.filter(card => 
    !Object.values(cardCategories).flat().includes(card.id)
  );
  if (uncategorizedCards.length > 0) {
    // Se já existe categoria "Outros", adiciona os não categorizados a ela
    if (groupedCards['Outros']) {
      groupedCards['Outros'] = [...groupedCards['Outros'], ...uncategorizedCards];
    } else {
      groupedCards['Outros'] = uncategorizedCards;
    }
  }

  const renderCard = (card: typeof allCards[0]) => {
    const IconComponent = card.icon;
    const isFavorite = favorites.includes(card.id);
    
    return (
      <div
        key={card.id}
        className={`relative cursor-pointer ${card.color} text-white p-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl flex flex-col items-center group`}
        onClick={() => card.action ? card.action() : card.path && handleNavigate(card.path)}
      >
        {/* Botão de favorito */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(card.id);
          }}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
        >
          <Star 
            size={16} 
            className={isFavorite ? "text-yellow-300" : "text-white/70 group-hover:text-white"}
            weight={isFavorite ? "fill" : "regular"}
          />
        </button>
        
        {/* Badge de notificação */}
        {card.badge && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            {card.badge}
          </div>
        )}
        
        <IconComponent size={48} className="mb-3" />
        <p className="text-center text-sm font-medium leading-tight">{card.title}</p>
        
        {/* Indicador de favorito */}
        {isFavorite && (
          <div className="absolute bottom-2 left-2">
            <Star size={12} className="text-yellow-300" weight="fill" />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {showRegisterForm && (
        <DashboardRegisterForm onClose={() => setShowRegisterForm(false)} />
      )}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header com busca e notificações */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Menu Principal
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Bem-vindo, {userName || 'Usuário'}
                </p>
              </div>
              
              {/* Notificações rápidas */}
              <div className="flex items-center gap-4">
                {notifications.pendingOS > 0 && (
                  <button
                    onClick={() => handleNavigate('/os-externas-list')}
                    className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-sm hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                  >
                    <Bell size={16} />
                    <span>{notifications.pendingOS} OS pendentes</span>
                  </button>
                )}
                {notifications.newDemands > 0 && (
                  <button
                    onClick={() => handleNavigate('/daily-demands')}
                    className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                  >
                    <Calendar size={16} />
                    <span>{notifications.newDemands} novas demandas</span>
                  </button>
                )}
                {notifications.delayedDiagnostics > 0 && (
                  <button
                    onClick={() => handleNavigate('/chada')}
                    className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full text-sm hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors cursor-pointer"
                  >
                    <Printer size={16} />
                    <span>{notifications.delayedDiagnostics} impressoras atrasadas</span>
                  </button>
                )}
                {notifications.chamadosAbertos > 0 && (
                  <button
                    onClick={() => handleNavigate('/scales?view=tickets')}
                    className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                  >
                    <Wrench size={16} />
                    <span>{notifications.chamadosAbertos} chamados abertos</span>
                  </button>
                )}
                {/* Notificação de chamados removida temporariamente */}
                {/*
                {notifications.chamadosPendentes > 0 && (
                  <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm">
                    <Phone size={16} />
                    <span>{notifications.chamadosPendentes} chamados pendentes</span>
                  </div>
                )}
                */}

                {/* Botão de backup - apenas para Vanderson */}
                {supabaseUserId === 'c7b74239-4188-4218-8390-063e0ad58871' && (
                  <button
                    onClick={handleCreateBackup}
                    disabled={isCreatingBackup}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isCreatingBackup 
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50'
                    }`}
                    title="Fazer backup de todas as tabelas e arquivos"
                  >
                    <CloudArrowDown size={16} />
                    <span>{isCreatingBackup ? 'Criando...' : 'Backup'}</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Barra de busca */}
            <div className="relative max-w-md">
              <MagnifyingGlass size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar funcionalidades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Card de Chamados Pendentes - REMOVIDO TEMPORARIAMENTE
          {['TECH', 'ADMIN', 'ADMTOTAL'].includes(userRole || '') && (
            <div className="mb-8">
              <ChamadosEscolaCard
                chamados={chamadosEscola}
                totalPending={notifications.chamadosPendentes}
                onCreateChamado={() => setShowNovoChamadoModal(true)}
                onUpdateChamado={handleUpdateChamado}
              />
            </div>
          )}
          */}

          {/* Cards organizados por categoria */}
          <div className="space-y-8">
            {Object.entries(groupedCards).map(([category, cards]) => (
              <div key={category}>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-blue-500 rounded"></span>
                  {category}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({cards.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {cards.map(renderCard)}
                </div>
              </div>
            ))}
          </div>
          
          {/* Mensagem quando não há cards */}
          {filteredCards.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <MagnifyingGlass size={48} className="mx-auto" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Nenhuma funcionalidade encontrada para "{searchTerm}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Novo Chamado - REMOVIDO TEMPORARIAMENTE */}
      {/*
      <NovoChamadoModal
        isOpen={showNovoChamadoModal}
        onClose={() => setShowNovoChamadoModal(false)}
        onSubmit={handleCreateChamado}
        isLoading={isLoadingChamados}
      />
      */}
    </>
  );
};

export default Dashboard;