import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabaseClient';
import { 
  CheckCircle, 
  ArrowLeft,
  Calendar,
  User,
  MapPin,
  Clock,
  Eye,
  MagnifyingGlass,
  Wrench
} from 'phosphor-react';

interface AcceptedTicket {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  scheduledDate: string;
  scheduledTime: string;
  assignedTo: string;
  notes?: string;
  School: {
    name: string;
  };
  Event?: {
    id: number;
    title: string;
  };
}

const AcceptedTickets: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<AcceptedTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<AcceptedTicket | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentInternal, setCommentInternal] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    checkAuthAndLoadTickets();
  }, []);

  const updateTicketStatus = async (ticketId: number, newStatus: string, notes?: string) => {
    try {
      setUpdating(true);
      
      const response = await fetch(`/api/technical-tickets/update?ticketId=${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes,
          updatedBy: currentUser?.displayName || 'Admin'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar chamado');
      }

      // Atualizar lista
      await fetchAcceptedTickets();
      
      // Fechar modal se estiver aberto
      setShowDetailModal(false);
      setSelectedTicket(null);
      
      alert(`Chamado atualizado para: ${newStatus === 'IN_PROGRESS' ? 'Em Andamento' : newStatus === 'RESOLVED' ? 'Resolvido' : 'Fechado'}`);
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert(`Erro ao atualizar status: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedTicket || !rescheduleDate || !rescheduleTime) {
      alert('Por favor, preencha a data e horário para o reagendamento.');
      return;
    }

    try {
      setRescheduling(true);
      
      const response = await fetch(`/api/technical-tickets/update?ticketId=${selectedTicket.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledDate: rescheduleDate,
          scheduledTime: rescheduleTime,
          notes: rescheduleNotes || selectedTicket.notes,
          updatedBy: currentUser?.displayName || 'Admin'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao reagendar chamado');
      }

      // Atualizar lista
      await fetchAcceptedTickets();
      
      // Limpar campos e fechar modais
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleNotes('');
      setShowRescheduleModal(false);
      setShowDetailModal(false);
      setSelectedTicket(null);
      
      alert('Chamado reagendado com sucesso! Escola será notificada por email.');
      
    } catch (error) {
      console.error('Erro ao reagendar chamado:', error);
      alert(`Erro ao reagendar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setRescheduling(false);
    }
  };

  const fetchComments = async (ticketId: number) => {
    try {
      setLoadingComments(true);
      const response = await fetch(`/api/technical-tickets/comments?ticketId=${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const addComment = async () => {
    if (!selectedTicket || !newComment.trim() || !currentUser) {
      alert('Por favor, digite um comentário.');
      return;
    }

    try {
      setAddingComment(true);
      
      const response = await fetch(`/api/technical-tickets/comments?ticketId=${selectedTicket.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorId: currentUser.userId,
          authorName: currentUser.displayName,
          authorRole: currentUser.role,
          content: newComment.trim(),
          isInternal: commentInternal
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao adicionar comentário');
      }

      // Atualizar lista de comentários
      await fetchComments(selectedTicket.id);
      
      // Limpar campo
      setNewComment('');
      setCommentInternal(false);
      
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      alert(`Erro ao adicionar comentário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setAddingComment(false);
    }
  };

  // Buscar comentários quando abrir modal de detalhes
  const openDetailModal = (ticket: AcceptedTicket) => {
    setSelectedTicket(ticket);
    setShowDetailModal(true);
    fetchComments(ticket.id);
  };

  const checkAuthAndLoadTickets = async () => {
    try {
      setLoading(true);

      // Verificar autenticação
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error('Erro ao buscar usuário:', error);
        router.push('/login');
        return;
      }

      // Verificar permissões
      const response = await fetch(`/api/get-role?userId=${user.id}`);
      const profileData = await response.json();

      if (!response.ok || !['ADMIN', 'ADMTOTAL'].includes(profileData.role)) {
        console.error('Usuário não tem permissão para acessar esta página');
        router.push('/dashboard');
        return;
      }

      // Salvar informações do usuário atual
      setCurrentUser({
        userId: user.id,
        displayName: profileData.displayName,
        role: profileData.role
      });

      // Carregar chamados aceitos
      await fetchAcceptedTickets();

    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchAcceptedTickets = async () => {
    try {
      const response = await fetch('/api/technical-tickets/list?status=SCHEDULED');
      if (!response.ok) {
        throw new Error('Erro ao buscar chamados aceitos');
      }

      const data = await response.json();
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (error) {
      console.error('Erro ao buscar chamados aceitos:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'Urgente';
      case 'HIGH': return 'Alta';
      case 'MEDIUM': return 'Média';
      default: return 'Baixa';
    }
  };

  // Filtrar chamados
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.School.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header da página */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Chamados Aceitos / CSDT
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Chamados técnicos aceitos e agendados
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  Total: {filteredTickets.length} chamado(s)
                </p>
              </div>
            </div>
            
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <div className="relative flex-1">
                <MagnifyingGlass size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar chamados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Todos os Status</option>
                <option value="SCHEDULED">Agendados</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="RESOLVED">Resolvidos</option>
              </select>
            </div>
          </div>

          {/* Lista de Chamados */}
          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                <CheckCircle size={48} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nenhum chamado encontrado
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm 
                    ? `Nenhum chamado aceito encontrado para "${searchTerm}"`
                    : 'Não há chamados aceitos no momento.'
                  }
                </p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          #{ticket.id} - {ticket.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ticket.status === 'SCHEDULED' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                          ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {ticket.status === 'SCHEDULED' ? 'Agendado' :
                           ticket.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Resolvido'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                          {getPriorityText(ticket.priority)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {ticket.School.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(ticket.scheduledDate).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {ticket.scheduledTime}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <span className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                          <User size={14} />
                          Responsável: {ticket.assignedTo}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-2">
                        {ticket.description}
                      </p>
                    </div>
                    
                    <div className="ml-4 flex flex-col gap-2">
                      {/* Botões de Ação baseados no Status */}
                      {ticket.status === 'SCHEDULED' && (
                        <button
                          onClick={() => updateTicketStatus(ticket.id, 'IN_PROGRESS')}
                          disabled={updating}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-xs rounded transition-colors flex items-center gap-1"
                        >
                          <Clock size={12} />
                          {updating ? 'Iniciando...' : 'Iniciar Atendimento'}
                        </button>
                      )}
                      
                      {ticket.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => {
                            const notes = prompt('Observações sobre a resolução (opcional):');
                            updateTicketStatus(ticket.id, 'RESOLVED', notes || undefined);
                          }}
                          disabled={updating}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-xs rounded transition-colors flex items-center gap-1"
                        >
                          <CheckCircle size={12} />
                          {updating ? 'Resolvendo...' : 'Marcar como Resolvido'}
                        </button>
                      )}
                      
                      {ticket.status === 'RESOLVED' && (
                        <button
                          onClick={() => updateTicketStatus(ticket.id, 'CLOSED')}
                          disabled={updating}
                          className="px-3 py-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white text-xs rounded transition-colors flex items-center gap-1"
                        >
                          <Calendar size={12} />
                          {updating ? 'Fechando...' : 'Fechar Chamado'}
                        </button>
                      )}
                      
                      {/* Botão de Reagendamento para chamados agendados ou em andamento */}
                      {(ticket.status === 'SCHEDULED' || ticket.status === 'IN_PROGRESS') && (
                        <button
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowRescheduleModal(true);
                          }}
                          className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded transition-colors flex items-center gap-1"
                        >
                          <Calendar size={12} />
                          Reagendar
                        </button>
                      )}
                      
                      {/* Botão de Detalhes sempre presente */}
                      <button
                        onClick={() => openDetailModal(ticket)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors flex items-center gap-1"
                      >
                        <Eye size={12} />
                        Detalhes
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Categoria: {ticket.category}</span>
                      <span>Criado em: {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {showDetailModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl mx-auto p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Wrench size={20} />
                Detalhes do Chamado #{selectedTicket.id}
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    Escola: {selectedTicket.School.name}
                  </span>
                  <span>Categoria: {selectedTicket.category}</span>
                  <span>Prioridade: {getPriorityText(selectedTicket.priority)}</span>
                  <span>Status: {selectedTicket.status === 'SCHEDULED' ? 'Agendado' :
                   selectedTicket.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Resolvido'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Descrição:</h4>
                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  {selectedTicket.description}
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  🗓️ Agendamento da Visita
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-700 dark:text-green-300">
                  <span>Data: {new Date(selectedTicket.scheduledDate).toLocaleDateString('pt-BR')}</span>
                  <span>Horário: {selectedTicket.scheduledTime}</span>
                </div>
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  <span>Responsável: {selectedTicket.assignedTo}</span>
                </div>
              </div>

              {selectedTicket.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Observações:</h4>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {selectedTicket.notes}
                  </p>
                </div>
              )}

              {/* Botões de Ação no Modal */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {selectedTicket.status === 'SCHEDULED' && (
                  <button
                    onClick={() => updateTicketStatus(selectedTicket.id, 'IN_PROGRESS')}
                    disabled={updating}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Clock size={16} />
                    {updating ? 'Iniciando...' : 'Iniciar Atendimento'}
                  </button>
                )}
                
                {selectedTicket.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => {
                      const notes = prompt('Observações sobre a resolução (opcional):');
                      updateTicketStatus(selectedTicket.id, 'RESOLVED', notes || undefined);
                    }}
                    disabled={updating}
                    className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} />
                    {updating ? 'Resolvendo...' : 'Marcar como Resolvido'}
                  </button>
                )}
                
                {selectedTicket.status === 'RESOLVED' && (
                  <button
                    onClick={() => updateTicketStatus(selectedTicket.id, 'CLOSED')}
                    disabled={updating}
                    className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Calendar size={16} />
                    {updating ? 'Fechando...' : 'Fechar Chamado'}
                  </button>
                )}
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Criado em: {new Date(selectedTicket.createdAt).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reagendamento */}
      {showRescheduleModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar size={20} className="text-purple-500" />
                Reagendar Visita
              </h2>
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setRescheduleDate('');
                  setRescheduleTime('');
                  setRescheduleNotes('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  <strong>Chamado:</strong> #{selectedTicket.id} - {selectedTicket.title}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  <strong>Escola:</strong> {selectedTicket.School.name}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  <strong>Agendamento Atual:</strong> {new Date(selectedTicket.scheduledDate).toLocaleDateString('pt-BR')} às {selectedTicket.scheduledTime}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nova Data:
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Novo Horário:
                  </label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motivo do Reagendamento:
                </label>
                <textarea
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="Explique o motivo do reagendamento (será informado à escola)..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={3}
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>⚠️ Atenção:</strong> A escola será notificada automaticamente sobre o reagendamento por email.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setRescheduleDate('');
                    setRescheduleTime('');
                    setRescheduleNotes('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReschedule}
                  disabled={rescheduling || !rescheduleDate || !rescheduleTime}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {rescheduling ? 'Reagendando...' : 'Confirmar Reagendamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcceptedTickets;