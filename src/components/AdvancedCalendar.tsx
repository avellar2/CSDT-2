import React, { useState } from 'react';

interface ScheduleEvent {
  id: number;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  type: string;
  priority: string;
  status: string;
  createdBy: string;
  assignedTo?: string;
  location?: string;
  schoolId?: number;
  tags: string[];
}

interface CalendarProps {
  events?: ScheduleEvent[];
  onEventCreate?: (event: any) => void;
  onEventUpdate?: (id: number, event: any) => void;
  onEventDelete?: (id: number) => void;
}

const AdvancedCalendar: React.FC<CalendarProps> = ({
  events = [],
  onEventCreate,
  onEventUpdate,
  onEventDelete
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<ScheduleEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    type: 'TASK',
    priority: 'MEDIUM',
    location: ''
  });

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const typeLabels = {
    TASK: 'Tarefa',
    MEETING: 'Reunião',
    APPOINTMENT: 'Agendamento',
    REMINDER: 'Lembrete',
    DEADLINE: 'Prazo',
    MAINTENANCE: 'Manutenção'
  };

  const priorityLabels = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    URGENT: 'Urgente'
  };

  const statusLabels = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em andamento',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
    POSTPONED: 'Adiado'
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Adicionar dias do mês anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Adicionar dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    
    // Completar com dias do próximo mês até 42 dias (6 semanas)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const startDateTime = new Date(`${eventForm.startDate}T${eventForm.startTime || '09:00'}`);
    const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000)); // 1 hora depois

    const eventData = {
      title: eventForm.title,
      description: eventForm.description,
      startDate: startDateTime,
      endDate: endDateTime,
      allDay: false,
      type: eventForm.type,
      priority: eventForm.priority,
      location: eventForm.location,
      status: 'PENDING',
      createdBy: 'current-user',
      tags: []
    };

    if (editingEvent) {
      onEventUpdate?.(editingEvent.id, eventData);
      setEditingEvent(null);
    } else {
      onEventCreate?.(eventData);
    }
    
    setShowEventModal(false);
    resetForm();
  };

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      startDate: '',
      startTime: '',
      type: 'TASK',
      priority: 'MEDIUM',
      location: ''
    });
  };

  const handleEventClick = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  const handleEditEvent = () => {
    if (selectedEvent) {
      setEditingEvent(selectedEvent);
      setEventForm({
        title: selectedEvent.title,
        description: selectedEvent.description || '',
        startDate: selectedEvent.startDate.toISOString().split('T')[0],
        startTime: selectedEvent.startDate.toTimeString().slice(0, 5),
        type: selectedEvent.type,
        priority: selectedEvent.priority,
        location: selectedEvent.location || ''
      });
      setShowDetailsModal(false);
      setShowEventModal(true);
    }
  };

  const handleDeleteEvent = () => {
    if (selectedEvent) {
      onEventDelete?.(selectedEvent.id);
      setShowDetailsModal(false);
      setSelectedEvent(null);
    }
  };

  const handleDragStart = (event: ScheduleEvent, e: React.DragEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetDate: Date, e: React.DragEvent) => {
    e.preventDefault();
    
    if (draggedEvent) {
      // Calcular nova data mantendo a hora original
      const originalTime = draggedEvent.startDate;
      const newStartDate = new Date(targetDate);
      newStartDate.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
      
      const duration = draggedEvent.endDate.getTime() - draggedEvent.startDate.getTime();
      const newEndDate = new Date(newStartDate.getTime() + duration);

      const updatedEvent = {
        ...draggedEvent,
        startDate: newStartDate,
        endDate: newEndDate
      };

      onEventUpdate?.(draggedEvent.id, updatedEvent);
      setDraggedEvent(null);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📅 Agenda
          </h2>
          
          <button
            onClick={() => setShowEventModal(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ➕ Novo Evento
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-xl"
            >
              ◀
            </button>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-xl"
            >
              ▶
            </button>
          </div>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
          >
            Hoje
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        <div className="grid grid-cols-7 gap-1">
          {/* Week Days Header */}
          {weekDays.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
          
          {/* Calendar Days */}
          {getDaysInMonth(currentDate).map((day, index) => {
            const dayEvents = getEventsForDate(day.date);
            const isToday = day.date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border border-gray-100 dark:border-zinc-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${
                  !day.isCurrentMonth ? 'opacity-40' : ''
                } ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(day.date, e)}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                }`}>
                  {day.date.getDate()}
                </div>
                
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs p-1 rounded text-white truncate cursor-pointer hover:opacity-80 ${
                        event.type === 'TASK' ? 'bg-blue-500' :
                        event.type === 'MEETING' ? 'bg-green-500' :
                        event.type === 'APPOINTMENT' ? 'bg-purple-500' :
                        event.type === 'REMINDER' ? 'bg-yellow-500' :
                        event.type === 'DEADLINE' ? 'bg-red-500' :
                        'bg-gray-500'
                      } ${
                        event.priority === 'URGENT' ? 'border-l-4 border-red-300' :
                        event.priority === 'HIGH' ? 'border-l-4 border-orange-300' :
                        event.priority === 'MEDIUM' ? 'border-l-4 border-yellow-300' :
                        'border-l-4 border-green-300'
                      }`}
                      title={`${event.title} - ${formatTime(event.startDate)}`}
                      draggable
                      onDragStart={(e) => handleDragStart(event, e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      +{dayEvents.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create/Edit Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </h3>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setEditingEvent(null);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full p-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={eventForm.startDate}
                    onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo
                  </label>
                  <select
                    value={eventForm.type}
                    onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                  >
                    <option value="TASK">Tarefa</option>
                    <option value="MEETING">Reunião</option>
                    <option value="APPOINTMENT">Agendamento</option>
                    <option value="REMINDER">Lembrete</option>
                    <option value="DEADLINE">Prazo</option>
                    <option value="MAINTENANCE">Manutenção</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={eventForm.priority}
                    onChange={(e) => setEventForm({ ...eventForm, priority: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Local
                </label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full p-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                  placeholder="Ex: Escola Municipal XYZ"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEventModal(false);
                    setEditingEvent(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  {editingEvent ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showDetailsModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Detalhes do Evento
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedEvent(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedEvent.title}
                </h4>
                {selectedEvent.description && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {selectedEvent.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Data:</span>
                  <p className="text-gray-900 dark:text-white">{formatDate(selectedEvent.startDate)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Hora:</span>
                  <p className="text-gray-900 dark:text-white">
                    {formatTime(selectedEvent.startDate)} - {formatTime(selectedEvent.endDate)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Tipo:</span>
                  <p className="text-gray-900 dark:text-white">{typeLabels[selectedEvent.type as keyof typeof typeLabels]}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Prioridade:</span>
                  <p className={`font-medium ${
                    selectedEvent.priority === 'URGENT' ? 'text-red-600' :
                    selectedEvent.priority === 'HIGH' ? 'text-orange-600' :
                    selectedEvent.priority === 'MEDIUM' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {priorityLabels[selectedEvent.priority as keyof typeof priorityLabels]}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
                  <p className="text-gray-900 dark:text-white">{statusLabels[selectedEvent.status as keyof typeof statusLabels]}</p>
                </div>
                {selectedEvent.location && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Local:</span>
                    <p className="text-gray-900 dark:text-white">{selectedEvent.location}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
                <button
                  onClick={handleDeleteEvent}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  🗑️ Excluir
                </button>
                <button
                  onClick={handleEditEvent}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  ✏️ Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedCalendar;