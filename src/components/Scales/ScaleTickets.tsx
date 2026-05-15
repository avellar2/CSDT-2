import React from 'react';
import {
  Search,
  Calendar,
  MapPin,
  User,
  Wrench,
  Trash,
  Clock,
} from 'lucide-react';

interface ScaleTicketsProps {
  technicalTickets: any[];
  chamadosEscala: any[];
  loadingTickets: boolean;
  ticketStats: any;
  selectedTicket: any;
  setSelectedTicket: (v: any) => void;
  showTicketModal: boolean;
  setShowTicketModal: (v: boolean) => void;
  ticketFilter: string;
  setTicketFilter: (v: string) => void;
  ticketSearchTerm: string;
  setTicketSearchTerm: (v: string) => void;
  showDeleteModal: boolean;
  setShowDeleteModal: (v: boolean) => void;
  ticketToDelete: any;
  setTicketToDelete: (v: any) => void;
  deletionReason: string;
  setDeletionReason: (v: string) => void;
  currentUser: any;
  loadingUser: boolean;
  schedulePriority: string;
  setSchedulePriority: (v: string) => void;
  scheduleDate: string;
  setScheduleDate: (v: string) => void;
  scheduleTime: string;
  setScheduleTime: (v: string) => void;
  scheduleNotes: string;
  setScheduleNotes: (v: string) => void;
  scheduling: boolean;
  setScheduling: (v: boolean) => void;
  showScheduleModal: boolean;
  setShowScheduleModal: (v: boolean) => void;
  scheduleTicketId: number | null;
  setScheduleTicketId: (v: number | null) => void;
  scheduleSchool: string;
  setScheduleSchool: (v: string) => void;
  scheduleTitle: string;
  setScheduleTitle: (v: string) => void;
  scheduleDescription: string;
  setScheduleDescription: (v: string) => void;
  handleScheduleTicket: () => Promise<void>;
  handleDeleteTicket: () => Promise<void>;
  fetchChamadosEscala: () => Promise<void>;
  fetchTechnicalTickets: () => Promise<void>;
}

const ScaleTickets: React.FC<ScaleTicketsProps> = ({
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
  handleScheduleTicket,
  handleDeleteTicket,
  fetchChamadosEscala,
  fetchTechnicalTickets,
}) => {
  return (
    <div className="space-y-6">
      {/* Header dos Chamados */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Wrench size={20} />
            Chamados Técnicos
          </h3>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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

      {/* Search info */}
      {ticketSearchTerm && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <Search size={16} />
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

      {/* Tickets List */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700">
        {loadingTickets ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (() => {
          const allTickets = [
            ...technicalTickets,
            ...chamadosEscala.map((chamado: any) => ({
              ...chamado,
              title: chamado.titulo,
              description: chamado.descricao,
              category: chamado.categoria,
              School: { name: chamado.escola },
              createdBy: chamado.tecnico,
              createdAt: chamado.dataCriacao,
              isChamadoEscala: true,
              status: chamado.status
            }))
          ];

          const filteredTickets = allTickets.filter((ticket: any) => {
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
              {filteredTickets.map((ticket: any) => (
              <div
                key={ticket.id}
                className="relative overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer group"
                onClick={() => {
                  setSelectedTicket(ticket);
                  setShowTicketModal(true);
                }}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  ticket.status === 'OPEN' || ticket.status === 'PENDENTE' ? 'bg-yellow-500' :
                  ticket.status === 'ASSIGNED' ? 'bg-orange-500' :
                  ticket.status === 'SCHEDULED' || ticket.status === 'AGENDADO' ? 'bg-purple-500' :
                  ticket.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                  ticket.status === 'RESOLVED' || ticket.status === 'CONCLUIDO' ? 'bg-green-500' :
                  'bg-gray-500'
                }`}></div>

                <div className="p-4 pl-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold flex-shrink-0">
                          #{ticket.id}
                        </span>
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate text-base">
                          {ticket.title.length > 60 ? ticket.title.substring(0, 60) + '...' : ticket.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          ticket.status === 'OPEN' || ticket.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          ticket.status === 'ASSIGNED' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          ticket.status === 'SCHEDULED' || ticket.status === 'AGENDADO' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                          ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          ticket.status === 'RESOLVED' || ticket.status === 'CONCLUIDO' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {ticket.status === 'OPEN' || ticket.status === 'PENDENTE' ? 'Aberto' :
                           ticket.status === 'ASSIGNED' ? 'Atribuído' :
                           ticket.status === 'SCHEDULED' || ticket.status === 'AGENDADO' ? 'Agendado' :
                           ticket.status === 'IN_PROGRESS' ? 'Em Andamento' :
                           ticket.status === 'RESOLVED' || ticket.status === 'CONCLUIDO' ? 'Concluído' : 'Fechado'}
                        </span>
                        {ticket.priority && (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
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
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <MapPin size={14} className="text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 truncate font-medium">
                        {ticket.School?.name?.length > 25 ? ticket.School.name.substring(0, 25) + '...' : ticket.School?.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <span className="text-orange-600 dark:text-orange-400 text-xs">📂</span>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 truncate">{ticket.category}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Calendar size={14} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-gray-600 dark:text-gray-400">
                        {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {ticket.createdBy && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <User size={14} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{ticket.createdBy}</span>
                      </div>
                    )}
                  </div>

                  <div className="relative mb-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {ticket.description}
                    </p>
                  </div>

                  {ticket.assignedTo && (
                    <div className="mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        Responsável: {ticket.assignedTo}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {ticket.isChamadoEscala && ticket.status === 'PENDENTE' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setScheduleTicketId(ticket.id);
                          setScheduleSchool(ticket.School?.name || '');
                          setScheduleTitle(ticket.title);
                          setScheduleDescription(ticket.description);
                          setScheduleDate(new Date().toISOString().split('T')[0]);
                          setScheduleTime('08:00');
                          setScheduleNotes('');
                          setShowScheduleModal(true);
                        }}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                      >
                        <Calendar size={16} />
                        Agendar
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTicketToDelete(ticket);
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Excluir chamado"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Schedule Reagendamento Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar size={24} />
                Agendar Reagendamento
              </h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-lg font-bold">
                      #{scheduleTicketId}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Reagendamento</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Agendar visita para resolver o problema</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🏫</span>
                  <span className="text-xs font-semibold text-green-700 dark:text-green-300">ESCOLA</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{scheduleSchool}</p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📝</span>
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">MOTIVO</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white break-words">{scheduleTitle}</p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📄</span>
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">DETALHES</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{scheduleDescription}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data *</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hora *</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Observações</label>
                <textarea
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  rows={3}
                  placeholder="Informações adicionais sobre o agendamento..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                disabled={scheduling}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!scheduleDate || !scheduleTime) {
                    alert('Preencha data e hora!');
                    return;
                  }

                  setScheduling(true);
                  try {
                    const eventResponse = await fetch('/api/schedule/events', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: `${scheduleTitle} - Reagendamento`,
                        description: scheduleDescription,
                        startDate: `${scheduleDate}T${scheduleTime}:00.000Z`,
                        endDate: `${scheduleDate}T${scheduleTime}:00.000Z`,
                        type: 'APPOINTMENT',
                        priority: 'MEDIUM',
                        status: 'PENDING',
                        location: scheduleSchool,
                        notes: scheduleNotes,
                        createdBy: currentUser?.userId || 'system',
                        assignedTo: currentUser?.userId
                      })
                    });

                    if (!eventResponse.ok) throw new Error('Erro ao criar evento');

                    const updateResponse = await fetch(`/api/chamados-escala/${scheduleTicketId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        status: 'AGENDADO',
                        dataAgendamento: new Date(`${scheduleDate}T${scheduleTime}:00`)
                      })
                    });

                    if (!updateResponse.ok) throw new Error('Erro ao atualizar chamado');

                    alert('Reagendamento agendado com sucesso!');
                    setShowScheduleModal(false);
                    fetchChamadosEscala();
                  } catch (error) {
                    console.error('Erro ao agendar:', error);
                    alert('Erro ao agendar reagendamento');
                  } finally {
                    setScheduling(false);
                  }
                }}
                disabled={scheduling}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md disabled:opacity-50 flex items-center gap-2"
              >
                {scheduling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <Calendar size={16} />
                    Agendar
                  </>
                )}
              </button>
            </div>
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
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl">📋</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 break-words">{selectedTicket.title}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      selectedTicket.status === 'OPEN' || selectedTicket.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      selectedTicket.status === 'ASSIGNED' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      selectedTicket.status === 'SCHEDULED' || selectedTicket.status === 'AGENDADO' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                      selectedTicket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CONCLUIDO' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {selectedTicket.status === 'OPEN' || selectedTicket.status === 'PENDENTE' ? 'Aberto' :
                       selectedTicket.status === 'ASSIGNED' ? 'Atribuído' :
                       selectedTicket.status === 'SCHEDULED' || selectedTicket.status === 'AGENDADO' ? 'Agendado' :
                       selectedTicket.status === 'IN_PROGRESS' ? 'Em Andamento' :
                       selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CONCLUIDO' ? 'Resolvido' : 'Fechado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🏫</span>
                    <span className="text-xs font-semibold text-green-700 dark:text-green-300">ESCOLA</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white break-words">{selectedTicket.School?.name}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📂</span>
                    <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">CATEGORIA</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedTicket.category}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📅</span>
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">DATA</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(selectedTicket.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">👤</span>
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">CRIADO POR</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedTicket.createdBy}</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📄</span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">DESCRIÇÃO</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
              </div>

              {selectedTicket.status === 'OPEN' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">Aceitar e Agendar Chamado</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridade:</label>
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsável:</label>
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Visita:</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horário:</label>
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações Internas:</label>
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
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{selectedTicket.notes}</p>
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

export default ScaleTickets;
