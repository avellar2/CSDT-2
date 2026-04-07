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
  BookOpen,
  MapTrifold
} from "phosphor-react";
import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { jwtDecode } from "jwt-decode";
import { Header } from "./Header";
import { useHeaderContext } from "../context/HeaderContext";
import { supabase } from "@/lib/supabaseClient";
import DashboardRegisterForm from "./DashboardRegisterForm";
import PrinterRequestCard from "./PrinterRequestCard";
import PreventiveMaintenanceCard from "./PreventiveMaintenanceCard";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const SchoolsMapModal = dynamic(() => import("./SchoolsMapModal"), { ssr: false });

const fetcher = (url: string) => fetch(url).then(r => r.json());

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
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [showPrinterRequestCard, setShowPrinterRequestCard] = useState(false);
  const [showPreventiveMaintenanceCard, setShowPreventiveMaintenanceCard] = useState(false);
  const [showSchoolsMap, setShowSchoolsMap] = useState(false);

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

        setSupabaseUserId(user.id);

        const response = await fetch(`/api/get-role?userId=${user.id}`);
        const data = await response.json();

        if (response.ok && data.role) {
          setUserRole(data.role);
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
        if (response.ok) {
          setUserRole(data.role);
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
      setUserName(decoded.name);
      setUserNameState(decoded.name);
      fetchRole(decoded.userId);
    } else {
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

  const isTech = ['TECH', 'ADMIN', 'ADMTOTAL'].includes(userRole || '');

  const { data: pendingOSData } = useSWR(userRole ? '/api/dashboard/pending-os' : null, fetcher, { refreshInterval: 60000 });
  const { data: dailyDemandsData } = useSWR(userRole ? '/api/dashboard/daily-demands-count' : null, fetcher, { refreshInterval: 60000 });
  const { data: internalChatData } = useSWR(isTech ? '/api/internal-chat/count-pending' : null, fetcher, { refreshInterval: 30000 });
  const { data: delayedData } = useSWR(isTech ? '/api/chada-diagnostics/delayed' : null, fetcher, { refreshInterval: 120000 });
  const { data: chamadosAbertosData } = useSWR(isTech ? '/api/dashboard/chamados-abertos' : null, fetcher, { refreshInterval: 60000 });

  const notifications = {
    pendingOS: pendingOSData?.success ? pendingOSData.data.totalPendingOS : 0,
    newDemands: dailyDemandsData?.success ? dailyDemandsData.data.dailyDemandsCount : 0,
    alerts: 0,
    internalChat: internalChatData?.success ? internalChatData.needsAttention : 0,
    delayedDiagnostics: delayedData?.stats ? delayedData.stats.total : 0,
    chamadosPendentes: 0,
    chamadosAbertos: chamadosAbertosData?.success ? chamadosAbertosData.data.total : 0,
  };

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
    if (supabaseUserId !== process.env.NEXT_PUBLIC_BACKUP_ADMIN_ID) {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-12 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Definir categorias de cards
  const cardCategories = {
    'Ordens de Serviço': ['fill-pdf-form-2', 'os-list', 'os-externas-list', 'create-internal-os'],
    'Estatísticas': ['statistics', 'advanced-statistics'],
    'Escolas e Equipamentos': ['schools', 'items', 'device-list', 'printers', 'locados', 'schools-map'],
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
      id: 'printer-requests',
      title: 'Solicitar Dados de Impressoras',
      icon: Printer,
      color: 'bg-purple-500 hover:bg-purple-700',
      action: () => setShowPrinterRequestCard(true),
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Escolas e Equipamentos',
      badge: null
    },
    {
      id: 'preventive-maintenance',
      title: 'Manutenção Preventiva',
      icon: Wrench,
      color: 'bg-green-500 hover:bg-green-700',
      action: () => setShowPreventiveMaintenanceCard(true),
      roles: ['ADMTOTAL', 'ADMIN'],
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
      id: 'schools-map',
      title: 'Mapa de Escolas',
      icon: MapTrifold,
      color: 'bg-teal-500 hover:bg-teal-700',
      action: () => setShowSchoolsMap(true),
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
    },
    {
      id: 'setup-pc',
      title: 'Setup de PC',
      icon: Desktop,
      color: 'bg-cyan-600 hover:bg-cyan-800',
      path: '/setup-pc',
      roles: ['ADMIN', 'ADMTOTAL', 'TECH'],
      category: 'Administração',
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

  const renderCard = (card: typeof allCards[0], index: number) => {
    const IconComponent = card.icon;
    const isFavorite = favorites.includes(card.id);

    return (
      <motion.div
        key={card.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
      >
        <div
          className={`relative cursor-pointer ${card.color} text-white p-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl flex flex-col items-center group border-l-4 border-l-blue-500 hover:shadow-md transition-shadow`}
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
      </motion.div>
    );
  };

  return (
    <>
      {showRegisterForm && (
        <DashboardRegisterForm onClose={() => setShowRegisterForm(false)} />
      )}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header com busca e notificações */}
          <div className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  Dashboard
                </h1>
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
                  Bem-vindo, {userName || 'Usuário'}
                </p>
              </div>
              
              {/* Notificações rápidas */}
              <div className="flex flex-wrap items-center gap-3">
                {notifications.pendingOS > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => handleNavigate('/os-externas-list')}
                    className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-3 py-1.5 rounded-full text-sm hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors cursor-pointer border border-amber-200 dark:border-amber-800"
                  >
                    <Bell size={16} weight="fill" />
                    <span className="font-medium">{notifications.pendingOS} OS pendentes</span>
                  </motion.button>
                )}
                {notifications.newDemands > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => handleNavigate('/daily-demands')}
                    className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1.5 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
                  >
                    <Calendar size={16} weight="fill" />
                    <span className="font-medium">{notifications.newDemands} novas demandas</span>
                  </motion.button>
                )}
                {notifications.delayedDiagnostics > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => handleNavigate('/chada')}
                    className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 px-3 py-1.5 rounded-full text-sm hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors cursor-pointer border border-orange-200 dark:border-orange-800"
                  >
                    <Printer size={16} weight="fill" />
                    <span className="font-medium">{notifications.delayedDiagnostics} impressoras atrasadas</span>
                  </motion.button>
                )}
                {notifications.chamadosAbertos > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => handleNavigate('/scales?view=tickets')}
                    className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-3 py-1.5 rounded-full text-sm hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer border border-purple-200 dark:border-purple-800"
                  >
                    <Wrench size={16} weight="fill" />
                    <span className="font-medium">{notifications.chamadosAbertos} chamados abertos</span>
                  </motion.button>
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
                {supabaseUserId === process.env.NEXT_PUBLIC_BACKUP_ADMIN_ID && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    onClick={handleCreateBackup}
                    disabled={isCreatingBackup}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isCreatingBackup
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800'
                    }`}
                    title="Fazer backup de todas as tabelas e arquivos"
                  >
                    <CloudArrowDown size={16} weight={isCreatingBackup ? "bold" : "fill"} />
                    <span className="font-medium">{isCreatingBackup ? 'Criando...' : 'Backup'}</span>
                  </motion.button>
                )}
              </div>
            </div>
            
            {/* Barra de busca */}
            <div className="relative max-w-md">
              <MagnifyingGlass size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Buscar funcionalidades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
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
          <div className="space-y-10">
            {Object.entries(groupedCards).map(([category, cards], categoryIndex) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
              >
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-3">
                  <span className="w-1.5 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></span>
                  {category}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                    {cards.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {cards.map((card, index) => renderCard(card, index))}
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Mensagem quando não há cards */}
          {filteredCards.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center py-16"
            >
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <MagnifyingGlass size={56} className="mx-auto" weight="thin" />
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                Nenhuma funcionalidade encontrada para "{searchTerm}"
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Tente buscar por outros termos
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modal de Solicitação de Dados de Impressoras */}
      {showPrinterRequestCard && (
        <PrinterRequestCard onClose={() => setShowPrinterRequestCard(false)} />
      )}

      {/* Modal de Manutenção Preventiva */}
      {showPreventiveMaintenanceCard && (
        <PreventiveMaintenanceCard onClose={() => setShowPreventiveMaintenanceCard(false)} />
      )}

      {/* Modal do Mapa de Escolas */}
      {showSchoolsMap && (
        <SchoolsMapModal onClose={() => setShowSchoolsMap(false)} userRole={userRole} />
      )}
    </>
  );
};

export default Dashboard;