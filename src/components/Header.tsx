import { Home, PowerIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useHeaderContext } from "../context/HeaderContext";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useRouter } from "next/router";
import { 
  ChartBar, 
  ClipboardText, 
  File, 
  FileText, 
  GraduationCap, 
  House, 
  List, 
  PlusCircle, 
  Printer,
  MagnifyingGlass,
  Star,
  Bell,
  Calendar,
  Users,
  Desktop,
  ChartPie,
  Gear,
  Clock,
  X
} from "phosphor-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import axios from "axios";
import { PrinterAlertIndicator } from "./PrinterAlertIndicator";

interface HeaderProps {
  hideHamburger?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ hideHamburger = false }) => {
  const { userName, handleLogout } = useHeaderContext();
  const [localUserName, setLocalUserName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentPages, setRecentPages] = useState<string[]>([]);
  const [notifications, setNotifications] = useState({
    pendingOS: 0,
    newDemands: 0,
    alerts: 0
  });
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const router = useRouter();

  // NOVA FUNÇÃO: Buscar nome do usuário
  const fetchUserName = async () => {
    try {
      setIsLoading(true);

      // Primeiro, verificar se há um usuário logado no Supabase
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        console.log('Usuário não autenticado');
        setLocalUserName('');
        setIsLoading(false);
        return;
      }

      // Buscar o perfil do usuário no banco
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/api/user-profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data && response.data.displayName) {
          setLocalUserName(response.data.displayName);
        } else {
          // Fallback para o email se não tiver displayName
          setLocalUserName(user.email?.split('@')[0] || 'Usuário');
        }
      } else {
        // Se não tiver token, usar o email como fallback
        setLocalUserName(user.email?.split('@')[0] || 'Usuário');
      }

    } catch (error) {
      console.error('Erro ao buscar nome do usuário:', error);
      // Fallback em caso de erro
      setLocalUserName('Usuário');
    } finally {
      setIsLoading(false);
    }
  };

  // EFEITO: Buscar nome quando o componente monta
  useEffect(() => {
    fetchUserName();
  }, []);

  // EFEITO: Atualizar quando o userName do context mudar
  useEffect(() => {
    if (userName) {
      setLocalUserName(userName);
      setIsLoading(false);
    }
  }, [userName]);

  // Buscar role do usuário
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return;

        const response = await fetch(`/api/get-role?userId=${user.id}`);
        const data = await response.json();
        if (response.ok && data.role) {
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Erro ao buscar role:', error);
      }
    };

    fetchUserRole();
  }, []);

  // Carregar favoritos e páginas recentes
  useEffect(() => {
    const savedFavorites = localStorage.getItem('dashboard-favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }

    const savedRecentPages = localStorage.getItem('recent-pages');
    if (savedRecentPages) {
      setRecentPages(JSON.parse(savedRecentPages));
    }
  }, []);

  // Buscar notificações
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userRole) return;

      try {
        const [pendingOSResponse, dailyDemandsResponse] = await Promise.all([
          fetch('/api/dashboard/pending-os'),
          fetch('/api/dashboard/daily-demands-count')
        ]);

        const pendingOSData = await pendingOSResponse.json();
        const dailyDemandsData = await dailyDemandsResponse.json();

        setNotifications({
          pendingOS: pendingOSData.success ? pendingOSData.data.totalPendingOS : 0,
          newDemands: dailyDemandsData.success ? dailyDemandsData.data.dailyDemandsCount : 0,
          alerts: 0
        });
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
      }
    };

    fetchNotifications();
  }, [userRole]);

  // Definir todos os cards disponíveis (mesmo sistema do Dashboard)
  const allCards = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: House,
      path: '/dashboard',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH', 'ONLYREAD'],
      category: 'Principal'
    },
    {
      id: 'items',
      title: 'Cadastrar Itens',
      icon: PlusCircle,
      path: '/items',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH'],
      category: 'Escolas e Equipamentos'
    },
    {
      id: 'device-list',
      title: 'Ver Itens Cadastrados',
      icon: List,
      path: '/device-list',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH', 'ONLYREAD'],
      category: 'Escolas e Equipamentos'
    },
    {
      id: 'fill-pdf-form-2',
      title: 'Preencher OS',
      icon: FileText,
      path: '/fill-pdf-form-2',
      roles: ['ADMTOTAL', 'TECH'],
      category: 'Ordens de Serviço'
    },
    {
      id: 'statistics',
      title: 'Estatísticas de OS',
      icon: ChartBar,
      path: '/statistics',
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Estatísticas'
    },
    {
      id: 'advanced-statistics',
      title: 'Dashboard Avançado',
      icon: ChartPie,
      path: '/advanced-statistics',
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Estatísticas'
    },
    {
      id: 'schools',
      title: 'Todas as Escolas',
      icon: GraduationCap,
      path: '/schools',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH', 'ONLYREAD'],
      category: 'Escolas e Equipamentos'
    },
    {
      id: 'os-list',
      title: 'OS Externas (Antigo)',
      icon: ClipboardText,
      path: '/os-list',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH'],
      category: 'Ordens de Serviço'
    },
    {
      id: 'os-externas-list',
      title: 'OS Externas (Novo)',
      icon: ClipboardText,
      path: '/os-externas-list',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH'],
      category: 'Ordens de Serviço'
    },
    {
      id: 'printers',
      title: 'Todas as Impressoras',
      icon: Printer,
      path: '/printers',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH'],
      category: 'Escolas e Equipamentos'
    },
    {
      id: 'memorandums',
      title: 'Todos os Memorandos',
      icon: File,
      path: '/memorandums',
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Documentos'
    },
    {
      id: 'new-memorandums',
      title: 'Memorandos (Novo)',
      icon: FileText,
      path: '/new-memorandums',
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Documentos'
    },
    {
      id: 'scales',
      title: 'Escalas',
      icon: Users,
      path: '/scales',
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Gestão Diária'
    },
    {
      id: 'daily-demands',
      title: 'Demanda do Dia',
      icon: Calendar,
      path: '/daily-demands',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH'],
      category: 'Gestão Diária'
    },
    {
      id: 'create-internal-os',
      title: 'Criar OS Interna',
      icon: FileText,
      path: '/create-internal-os',
      roles: ['ADMTOTAL', 'ADMIN'],
      category: 'Ordens de Serviço'
    },
    {
      id: 'internal-demands',
      title: 'Demandas Internas',
      icon: ClipboardText,
      path: '/internal-demands',
      roles: ['TECH'],
      category: 'Gestão Diária'
    },
    {
      id: 'chada',
      title: 'CHADA',
      icon: Desktop,
      path: '/chada',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH'],
      category: 'Outros'
    },
    {
      id: 'locados',
      title: 'Locados',
      icon: List,
      path: '/locados',
      roles: ['ADMTOTAL', 'ADMIN', 'TECH', 'ONLYREAD'],
      category: 'Escolas e Equipamentos'
    }
  ];

  const handleNavigate = (path: string) => {
    // Adicionar à lista de páginas recentes
    const newRecentPages = [path, ...recentPages.filter(p => p !== path)].slice(0, 5);
    setRecentPages(newRecentPages);
    localStorage.setItem('recent-pages', JSON.stringify(newRecentPages));
    
    // Fechar sidebar e navegar
    setIsSheetOpen(false);
    router.push(path);
  };

  const toggleFavorite = (cardId: string) => {
    const newFavorites = favorites.includes(cardId)
      ? favorites.filter(id => id !== cardId)
      : [...favorites, cardId];
    setFavorites(newFavorites);
    localStorage.setItem('dashboard-favorites', JSON.stringify(newFavorites));
  };

  // Filtrar cards baseado na role e busca
  const filteredCards = allCards.filter(card => {
    const hasRole = card.roles.includes(userRole || '');
    const matchesSearch = card.title.toLowerCase().includes(searchTerm.toLowerCase());
    return hasRole && matchesSearch;
  });

  // Organizar: favoritos primeiro, depois recentes, depois resto
  const favoriteCards = filteredCards.filter(card => favorites.includes(card.id));
  const recentCards = filteredCards.filter(card => 
    recentPages.includes(card.path) && !favorites.includes(card.id)
  );
  const otherCards = filteredCards.filter(card => 
    !favorites.includes(card.id) && !recentPages.includes(card.path)
  );

  const handleSupabaseLogout = async () => {
    await supabase.auth.signOut();
    handleLogout();
    router.push('/login');
  };

  return (
    <div className="w-full flex justify-between items-center pt-8 px-4 sm:px-6 lg:px-8 lg:mb-16 mb-10">
      <Link href="/dashboard" className="">
        <img
          src="/images/logo.png"
          alt="Logo"
          className="block h-20 w-20 xl:h-28 xl:w-28 object-cover cursor-pointer"
        />
      </Link>

      <div className="text-center sm:text-left w-full lg:text-center sm:flex lg:flex justify-center items-center gap-1.5 lg:mr-10 mr-6">
        <div className="flex flex-col lg:flex-row items-center gap-2 lg:gap-1.5">
          <div className="flex items-center gap-1.5">
            <p className="text-lg sm:text-xl lg:text-2xl">Bem vindo,</p>
            {isLoading ? (
              // SKELETON LOADING enquanto carrega
              <div className="animate-pulse bg-gray-300 dark:bg-gray-700 h-6 w-32 rounded"></div>
            ) : (
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                {localUserName || 'Usuário'}
              </p>
            )}
          </div>
          {/* Indicador de Alertas Críticos */}
          <div className="mt-2 lg:mt-0 lg:ml-4">
            <PrinterAlertIndicator />
          </div>
        </div>
      </div>

      {/* Só renderiza o menu hamburger se hideHamburger for false */}
      {!hideHamburger && (
        <div>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <div className="relative cursor-pointer">
                <List className="h-10 w-10 xl:w-16 xl:h-16" />
                {(notifications.pendingOS > 0 || notifications.newDemands > 0) && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 xl:w-8 xl:h-8 flex items-center justify-center text-xs xl:text-sm font-bold">
                    {notifications.pendingOS + notifications.newDemands}
                  </div>
                )}
              </div>
            </SheetTrigger>
            <SheetContent className="w-80 overflow-y-auto bg-white dark:bg-gray-900">
              <SheetHeader className="space-y-4">
                {/* Header do usuário */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src="https://github.com/shadcn.png" />
                      <AvatarFallback className="bg-blue-500 text-white font-bold text-lg">
                        {localUserName ? localUserName.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-lg text-gray-900 dark:text-white">{localUserName || 'Usuário'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{userRole || 'Carregando...'}</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSupabaseLogout}
                    className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400 transition-colors p-3"
                  >
                    <PowerIcon size={20} />
                  </Button>
                </div>

                {/* Notificações */}
                {(notifications.pendingOS > 0 || notifications.newDemands > 0) && (
                  <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-600 rounded-lg p-4 space-y-2">
                    <h4 className="font-bold text-red-800 dark:text-red-200 text-base flex items-center gap-2">
                      <Bell size={18} />
                      Notificações
                    </h4>
                    {notifications.pendingOS > 0 && (
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        • {notifications.pendingOS} OS pendentes
                      </p>
                    )}
                    {notifications.newDemands > 0 && (
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        • {notifications.newDemands} demandas hoje
                      </p>
                    )}
                  </div>
                )}

                {/* Busca */}
                <div className="relative">
                  <MagnifyingGlass size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar funcionalidades..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-10 py-3 text-base font-medium border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Favoritos */}
                {favoriteCards.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Star size={18} className="text-yellow-500" weight="fill" />
                      Favoritos ({favoriteCards.length})
                    </h3>
                    <div className="space-y-3">
                      {favoriteCards.map(card => {
                        const IconComponent = card.icon;
                        return (
                          <div
                            key={card.id}
                            onClick={() => handleNavigate(card.path)}
                            className="flex items-center gap-4 p-4 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer transition-colors group border border-transparent hover:border-blue-200 dark:hover:border-blue-700"
                          >
                            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors shadow-sm">
                              <IconComponent size={20} className="text-white" />
                            </div>
                            <span className="text-base font-semibold flex-1 text-gray-900 dark:text-white">{card.title}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(card.id);
                              }}
                              className="opacity-70 group-hover:opacity-100 transition-opacity p-1"
                            >
                              <Star size={18} className="text-yellow-500" weight="fill" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recentes */}
                {recentCards.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Clock size={18} className="text-green-600 dark:text-green-400" />
                      Recentes ({recentCards.length})
                    </h3>
                    <div className="space-y-3">
                      {recentCards.map(card => {
                        const IconComponent = card.icon;
                        return (
                          <div
                            key={card.id}
                            onClick={() => handleNavigate(card.path)}
                            className="flex items-center gap-4 p-4 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 cursor-pointer transition-colors group border border-transparent hover:border-green-200 dark:hover:border-green-700"
                          >
                            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-colors shadow-sm">
                              <IconComponent size={20} className="text-white" />
                            </div>
                            <span className="text-base font-semibold flex-1 text-gray-900 dark:text-white">{card.title}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(card.id);
                              }}
                              className="opacity-70 group-hover:opacity-100 transition-opacity p-1"
                            >
                              <Star size={18} className="text-gray-400 hover:text-yellow-500" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Todas as funcionalidades */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <List size={18} className="text-gray-600 dark:text-gray-400" />
                    Todas as Funcionalidades ({otherCards.length})
                  </h3>
                  <div className="space-y-3">
                    {otherCards.map(card => {
                      const IconComponent = card.icon;
                      return (
                        <div
                          key={card.id}
                          onClick={() => handleNavigate(card.path)}
                          className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors group border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                        >
                          <div className="w-12 h-12 bg-gray-500 dark:bg-gray-600 rounded-lg flex items-center justify-center group-hover:bg-gray-600 dark:group-hover:bg-gray-500 transition-colors shadow-sm">
                            <IconComponent size={20} className="text-white" />
                          </div>
                          <span className="text-base font-semibold flex-1 text-gray-900 dark:text-white">{card.title}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(card.id);
                            }}
                            className="opacity-70 group-hover:opacity-100 transition-opacity p-1"
                          >
                            <Star size={18} className="text-gray-400 hover:text-yellow-500" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mensagem quando não há resultados */}
                {filteredCards.length === 0 && searchTerm && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <MagnifyingGlass size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                    <p className="text-lg font-semibold mb-2">Nenhuma funcionalidade encontrada</p>
                    <p className="text-base">para "{searchTerm}"</p>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
};