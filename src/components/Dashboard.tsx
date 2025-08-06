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
  Plus
} from "phosphor-react";
import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Header } from "./Header";
import { useHeaderContext } from "../context/HeaderContext";
import { supabase } from "@/lib/supabaseClient";
import DashboardRegisterForm from "./DashboardRegisterForm";

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
    alerts: 0
  });
  const [showRegisterForm, setShowRegisterForm] = useState(false);

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

        const newNotifications = {
          pendingOS: pendingOSData.success ? pendingOSData.data.totalPendingOS : 0,
          newDemands: dailyDemandsData.success ? dailyDemandsData.data.dailyDemandsCount : 0,
          alerts: 0 // Pode implementar depois
        };

        setNotifications(newNotifications);

        console.log('🔔 Notificações atualizadas:', newNotifications);
      } catch (error) {
        console.error('❌ Erro ao buscar notificações:', error);
        // Em caso de erro, manter valores zerados
        setNotifications({
          pendingOS: 0,
          newDemands: 0,
          alerts: 0
        });
      }
    };

    fetchNotifications();
  }, [userRole]);

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
      path: '/scales',
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Gestão Diária',
      badge: null
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
      badge: null
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
    groupedCards['Outros'] = uncategorizedCards;
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
                  Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Bem-vindo, {userName || 'Usuário'}
                </p>
              </div>
              
              {/* Notificações rápidas */}
              <div className="flex items-center gap-4">
                {notifications.pendingOS > 0 && (
                  <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-sm">
                    <Bell size={16} />
                    <span>{notifications.pendingOS} OS pendentes</span>
                  </div>
                )}
                {notifications.newDemands > 0 && (
                  <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
                    <Calendar size={16} />
                    <span>{notifications.newDemands} novas demandas</span>
                  </div>
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
    </>
  );
};

export default Dashboard;