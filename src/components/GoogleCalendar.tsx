import React, { useState, useEffect, useRef, useMemo } from 'react';
import { expandRecurringEvents, RecurringEvent, getRecurrenceDescription } from '@/utils/recurrence';
import { COMMON_TIMEZONES, getAllRegions, getTimezonesByRegion, formatEventTime, getCurrentTimezone, getTimezoneDisplayName } from '@/utils/timezone';
import { exportSingleEvent, exportMultipleEvents, ICalEvent } from '@/utils/icalExport';

interface Calendar {
  id: number;
  name: string;
  color: string;
  isVisible: boolean;
  isDefault: boolean;
}

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
  calendarId: number;
  recurring: boolean;
  recurrence?: any;
  timezone: string;
  tags: string[];
  Calendar: Calendar;
  reminders?: any[];
  participants?: any[];
}

interface GoogleCalendarProps {
  events?: ScheduleEvent[];
  calendars?: Calendar[];
  onEventCreate?: (event: any) => void;
  onEventUpdate?: (id: number, event: any) => void;
  onEventDelete?: (id: number) => void;
  onCalendarCreate?: (calendar: any) => void;
  onCalendarUpdate?: (id: number, calendar: any) => void;
  onCalendarToggle?: (id: number, visible: boolean) => void;
}

const GoogleCalendar: React.FC<GoogleCalendarProps> = ({
  events = [],
  calendars = [],
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onCalendarCreate,
  onCalendarUpdate,
  onCalendarToggle
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda' | 'year'>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | RecurringEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | RecurringEvent | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<ScheduleEvent | RecurringEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickCreateText, setQuickCreateText] = useState('');
  const [selectedCalendar, setSelectedCalendar] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    type: 'TASK',
    priority: 'MEDIUM',
    status: 'PENDING',
    location: '',
    calendarId: calendars.find(c => c.isDefault)?.id || calendars[0]?.id || 1,
    recurring: false,
    recurrence: {
      frequency: 'DAILY',
      interval: 1,
      until: '',
      count: 0,
      daysOfWeek: [],
      monthlyType: 'day'
    },
    reminders: [{ minutes: 15, type: 'POPUP', method: 'browser' }],
    participants: [] as Array<{email: string, status: 'pending' | 'accepted' | 'declined' | 'tentative', role: 'organizer' | 'required' | 'optional'}>,
    timezone: getCurrentTimezone(),
    tags: [] as string[]
  });

  const [calendarForm, setCalendarForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    isVisible: true,
    isDefault: false
  });

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const weekDaysFull = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  
  const hours = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, '0') + ':00'
  );

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

  // Expandir eventos recorrentes e filtrar
  const expandedEvents = useMemo(() => {
    // Calcular range baseado na visualização atual
    const startRange = new Date(currentDate);
    const endRange = new Date(currentDate);
    
    switch (view) {
      case 'month':
        startRange.setDate(1);
        startRange.setMonth(currentDate.getMonth() - 1);
        endRange.setMonth(currentDate.getMonth() + 2, 0);
        break;
      case 'week':
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() - 7);
        const endOfWeek = new Date(currentDate);
        endOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 13);
        startRange.setTime(startOfWeek.getTime());
        endRange.setTime(endOfWeek.getTime());
        break;
      case 'day':
        startRange.setTime(currentDate.getTime());
        endRange.setTime(currentDate.getTime());
        endRange.setDate(endRange.getDate() + 1);
        break;
      case 'year':
        startRange.setFullYear(currentDate.getFullYear(), 0, 1);
        endRange.setFullYear(currentDate.getFullYear() + 1, 0, 1);
        break;
      case 'agenda':
      default:
        startRange.setDate(currentDate.getDate() - 30);
        endRange.setDate(currentDate.getDate() + 90);
        break;
    }

    return expandRecurringEvents(events as RecurringEvent[], startRange, endRange);
  }, [events, currentDate, view]);

  // Filtrar eventos expandidos por calendários visíveis e busca
  const filteredEvents = expandedEvents.filter(event => {
    const calendar = calendars.find(c => c.id === event.calendarId);
    const isVisible = calendar?.isVisible !== false;
    const matchesSearch = searchQuery === '' || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return isVisible && matchesSearch;
  });

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Não interceptar atalhos se há modificadores ou se o usuário está digitando
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      
      // Não interceptar se o foco está em um input, textarea, select ou elemento editável
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.hasAttribute('contenteditable')
      )) {
        return;
      }
      
      // Não interceptar se algum modal está aberto (exceto para ações específicas)
      const anyModalOpen = showEventModal || showDetailsModal || showCalendarModal;
      
      switch (e.key.toLowerCase()) {
        case 'c':
          if (!anyModalOpen) {
            setShowEventModal(true);
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        case 'escape':
          if (anyModalOpen || showKeyboardHelp) {
            if (showEventModal) {
              setShowEventModal(false);
              setEditingEvent(null);
            }
            if (showDetailsModal) {
              setShowDetailsModal(false);
              setSelectedEvent(null);
            }
            if (showCalendarModal) {
              setShowCalendarModal(false);
              setEditingCalendar(null);
            }
            if (showKeyboardHelp) {
              setShowKeyboardHelp(false);
            }
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        case 't':
          if (!anyModalOpen) {
            setCurrentDate(new Date());
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        case 'm':
          if (!anyModalOpen) {
            setView('month');
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        case 'w':
          if (!anyModalOpen) {
            setView('week');
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        case 'd':
          if (!anyModalOpen) {
            setView('day');
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        case 'a':
          if (!anyModalOpen) {
            setView('agenda');
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        case 'y':
          if (!anyModalOpen) {
            setView('year');
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        case 'arrowleft':
          if (!anyModalOpen) {
            navigateDate('prev');
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        case 'arrowright':
          if (!anyModalOpen) {
            navigateDate('next');
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        case '/':
          // Focar na busca
          if (!anyModalOpen) {
            const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              e.preventDefault();
              e.stopPropagation();
            }
          }
          break;
        case '?':
        case 'h':
          if (!anyModalOpen) {
            setShowKeyboardHelp(true);
            e.preventDefault();
            e.stopPropagation();
          }
          break;
      }
    };

    // Usar capture para interceptar eventos antes de outros elementos
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [showEventModal, showDetailsModal, showCalendarModal, showKeyboardHelp, view]);

  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (view) {
        case 'month':
          newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
          break;
        case 'week':
          newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
          break;
        case 'day':
          newDate.setDate(prev.getDate() + (direction === 'next' ? 1 : -1));
          break;
        case 'year':
          newDate.setFullYear(prev.getFullYear() + (direction === 'next' ? 1 : -1));
          break;
      }
      return newDate;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
    }
    
    return days;
  };

  const getWeekDays = (date: Date) => {
    const days = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventsForWeek = () => {
    const weekDays = getWeekDays(currentDate);
    return weekDays.map(day => ({
      date: day,
      events: getEventsForDate(day)
    }));
  };

  const handleQuickCreate = () => {
    if (!quickCreateText.trim()) return;
    
    // Parse simples do texto rápido
    const now = new Date();
    const eventData = {
      title: quickCreateText,
      startDate: now,
      endDate: new Date(now.getTime() + 60 * 60 * 1000),
      allDay: false,
      type: 'TASK',
      priority: 'MEDIUM',
      status: 'PENDING',
      calendarId: calendars.find(c => c.isDefault)?.id || calendars[0]?.id || 1,
      createdBy: 'current-user',
      timezone: 'America/Sao_Paulo',
      tags: []
    };

    onEventCreate?.(eventData);
    setQuickCreateText('');
  };

  const handleTimeSlotClick = (date: Date, hour?: string) => {
    const startDate = new Date(date);
    if (hour) {
      const [h] = hour.split(':');
      startDate.setHours(parseInt(h), 0, 0, 0);
    }
    
    setEventForm({
      ...eventForm,
      startDate: startDate.toISOString().split('T')[0],
      startTime: hour || '09:00',
      endDate: startDate.toISOString().split('T')[0],
      endTime: hour ? `${parseInt(hour.split(':')[0]) + 1}:00` : '10:00'
    });
    setShowEventModal(true);
  };

  const handleEventDrop = (event: ScheduleEvent | RecurringEvent, newDate: Date) => {
    // Calcular a diferença em dias entre a data atual e a nova data
    const currentDate = new Date(event.startDate);
    const daysDiff = Math.floor((newDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calcular as novas datas mantendo o horário
    const newStartDate = new Date(event.startDate);
    const newEndDate = new Date(event.endDate);
    
    newStartDate.setDate(newStartDate.getDate() + daysDiff);
    newEndDate.setDate(newEndDate.getDate() + daysDiff);
    
    // Preparar dados para atualização
    const updatedEvent = {
      ...event,
      startDate: newStartDate,
      endDate: newEndDate
    };
    
    // Chamar a função de update
    onEventUpdate?.(event.id, updatedEvent);
    
    console.log(`Movido evento "${event.title}" para ${formatDate(newDate)}`);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getPriorityColor = (priority: string): string => {
    const priorityColors = {
      'LOW': '#10b981',      // Verde suave
      'MEDIUM': '#3b82f6',   // Azul padrão  
      'HIGH': '#f59e0b',     // Laranja/Amarelo
      'URGENT': '#ef4444'    // Vermelho
    };
    
    return priorityColors[priority as keyof typeof priorityColors] || '#3b82f6';
  };

  const getPriorityLabel = (priority: string): string => {
    const priorityLabels = {
      'LOW': 'Baixa',
      'MEDIUM': 'Média',
      'HIGH': 'Alta', 
      'URGENT': 'Urgente'
    };
    
    return priorityLabels[priority as keyof typeof priorityLabels] || priority;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-1 h-full">
      {weekDays.map((day) => (
        <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-b">
          {day}
        </div>
      ))}
      
      {getDaysInMonth(currentDate).map((day, index) => {
        const dayEvents = getEventsForDate(day.date);
        const isToday = day.date.toDateString() === new Date().toDateString();
        
        return (
          <div
            key={index}
            className={`min-h-[120px] p-2 border border-gray-100 dark:border-zinc-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${
              !day.isCurrentMonth ? 'opacity-40 bg-gray-50 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-900'
            } ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''} ${
              draggedEvent ? 'drop-zone' : ''
            }`}
            onClick={() => handleTimeSlotClick(day.date)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              if (draggedEvent) {
                e.currentTarget.classList.add('bg-blue-100', 'dark:bg-blue-900/40', 'border-blue-300', 'dark:border-blue-600');
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (draggedEvent && !e.currentTarget.contains(e.relatedTarget as Node)) {
                e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/40', 'border-blue-300', 'dark:border-blue-600');
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/40', 'border-blue-300', 'dark:border-blue-600');
              
              if (draggedEvent) {
                handleEventDrop(draggedEvent, day.date);
                setDraggedEvent(null);
              }
            }}
          >
            <div className={`text-sm font-medium mb-1 ${
              isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
            }`}>
              {day.date.getDate()}
            </div>
            
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => {
                const calendar = calendars.find(c => c.id === event.calendarId);
                return (
                  <div
                    key={event.id}
                    className={`text-xs p-1 rounded text-white truncate cursor-pointer hover:opacity-80 transition-opacity ${
                      draggedEvent?.id === event.id ? 'opacity-50 scale-95' : ''
                    }`}
                    style={{ 
                      backgroundColor: (event as any).scaleData ? '#059669' : getPriorityColor(event.priority),
                      border: (event as any).scaleData ? '2px solid #10b981' : 'none'
                    }}
                    title={`${event.title} - ${formatTime(event.startDate)}${(event as any).scaleData ? ' (Escala de Trabalho)' : ` - ${getPriorityLabel(event.priority)}`}`}
                    draggable
                    onDragStart={(e) => {
                      setDraggedEvent(event);
                      e.dataTransfer.setData('text/plain', event.id.toString());
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      setDraggedEvent(null);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(event);
                      setShowDetailsModal(true);
                    }}
                  >
                    {(event as any).scaleData && '👥 '}
                    {event.allDay ? event.title : `${formatTime(event.startDate)} ${event.title}`}
                  </div>
                );
              })}
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
  );

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    
    return (
      <div className="h-full flex flex-col">
        {/* Header dos dias */}
        <div className="grid grid-cols-8 border-b">
          <div className="p-2 border-r"></div>
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={index} className={`p-2 text-center border-r ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {weekDaysFull[day.getDay()]}
                </div>
                <div className={`text-lg font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grade de horas */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-8">
            {/* Coluna de horas */}
            <div className="border-r">
              {hours.map((hour, index) => (
                <div key={hour} className="h-16 border-b text-xs text-gray-500 dark:text-gray-400 p-1">
                  {index % 2 === 0 ? hour : ''}
                </div>
              ))}
            </div>

            {/* Colunas dos dias */}
            {weekDays.map((day, dayIndex) => (
              <div key={dayIndex} className="border-r">
                {hours.map((hour, hourIndex) => {
                  const dayEvents = getEventsForDate(day).filter(event => {
                    const eventHour = event.startDate.getHours();
                    return eventHour === hourIndex;
                  });

                  return (
                    <div
                      key={hour}
                      className="h-16 border-b hover:bg-gray-50 dark:hover:bg-zinc-700/30 cursor-pointer relative"
                      onClick={() => handleTimeSlotClick(day, hour)}
                    >
                      {dayEvents.map(event => {
                        const calendar = calendars.find(c => c.id === event.calendarId);
                        return (
                          <div
                            key={event.id}
                            className="absolute inset-x-1 top-1 p-1 rounded text-xs text-white truncate cursor-pointer hover:opacity-80"
                            style={{ backgroundColor: getPriorityColor(event.priority) }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setShowDetailsModal(true);
                            }}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const isToday = currentDate.toDateString() === new Date().toDateString();

    return (
      <div className="h-full flex flex-col">
        {/* Header do dia */}
        <div className={`p-4 border-b text-center ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {weekDaysFull[currentDate.getDay()]}
          </div>
          <div className={`text-2xl font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
            {currentDate.getDate()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
        </div>

        {/* Grade de horas */}
        <div className="flex-1 overflow-y-auto">
          {hours.map((hour, index) => {
            const hourEvents = dayEvents.filter(event => {
              const eventHour = event.startDate.getHours();
              return eventHour === index;
            });

            return (
              <div
                key={hour}
                className="h-16 border-b hover:bg-gray-50 dark:hover:bg-zinc-700/30 cursor-pointer flex items-start p-2 relative"
                onClick={() => handleTimeSlotClick(currentDate, hour)}
              >
                <div className="w-16 text-xs text-gray-500 dark:text-gray-400 pt-1">
                  {hour}
                </div>
                <div className="flex-1 pl-4 relative">
                  {hourEvents.map(event => {
                    const calendar = calendars.find(c => c.id === event.calendarId);
                    return (
                      <div
                        key={event.id}
                        className="p-2 rounded text-sm text-white cursor-pointer hover:opacity-80 mb-1"
                        style={{ backgroundColor: getPriorityColor(event.priority) }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                          setShowDetailsModal(true);
                        }}
                      >
                        <div className="font-medium">{event.title}</div>
                        {event.location && (
                          <div className="text-xs opacity-80">📍 {event.location}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const upcomingEvents = filteredEvents
      .filter(event => event.startDate >= new Date())
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 50);

    return (
      <div className="p-6 space-y-4 overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Próximos Eventos
        </h3>
        
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-lg font-medium mb-2">Nenhum evento próximo</p>
            <p className="text-sm">Seus próximos eventos aparecerão aqui</p>
          </div>
        ) : (
          upcomingEvents.map(event => {
            const calendar = calendars.find(c => c.id === event.calendarId);
            const isToday = event.startDate.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={event.id}
                className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedEvent(event);
                  setShowDetailsModal(true);
                }}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: getPriorityColor(event.priority) }}
                  ></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {event.title}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded ${
                        isToday ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-zinc-300'
                      }`}>
                        {isToday ? 'Hoje' : formatDate(event.startDate)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {formatEventTime(event.startDate, event.endDate, event.timezone || getCurrentTimezone(), event.allDay)}
                    </div>
                    {event.location && (
                      <div className="text-sm text-gray-500 dark:text-gray-500">
                        📍 {event.location}
                      </div>
                    )}
                    {event.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                        {event.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderYearView = () => {
    const year = currentDate.getFullYear();
    const monthsGrid = [];
    
    for (let month = 0; month < 12; month++) {
      monthsGrid.push(new Date(year, month, 1));
    }

    return (
      <div className="p-6">
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-6">
          {monthsGrid.map((monthDate, index) => {
            const monthEvents = filteredEvents.filter(event => 
              event.startDate.getMonth() === monthDate.getMonth() && 
              event.startDate.getFullYear() === year
            );

            return (
              <div 
                key={index}
                className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setCurrentDate(monthDate);
                  setView('month');
                }}
              >
                <div className="text-center mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {months[monthDate.getMonth()]}
                  </h3>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {weekDays.map(day => (
                    <div key={day} className="text-center text-gray-500 p-1">
                      {day[0]}
                    </div>
                  ))}
                  
                  {getDaysInMonth(monthDate).slice(0, 35).map((day, dayIndex) => {
                    const dayEvents = filteredEvents.filter(event => 
                      event.startDate.toDateString() === day.date.toDateString()
                    );
                    const isToday = day.date.toDateString() === new Date().toDateString();
                    
                    return (
                      <div
                        key={dayIndex}
                        className={`text-center p-1 rounded ${
                          !day.isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : 
                          isToday ? 'bg-blue-500 text-white' :
                          dayEvents.length > 0 ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                          'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {day.date.getDate()}
                      </div>
                    );
                  })}
                </div>
                
                {monthEvents.length > 0 && (
                  <div className="text-xs text-center mt-2 text-gray-500">
                    {monthEvents.length} evento{monthEvents.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex bg-white dark:bg-zinc-900">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 border-r border-gray-200 dark:border-zinc-700 flex flex-col">
          {/* Mini calendar */}
          <div className="p-4 border-b border-gray-200 dark:border-zinc-700">
            <div className="text-center mb-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
                >
                  ◀
                </button>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <button
                  onClick={() => navigateDate('next')}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
                >
                  ▶
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-xs">
              {weekDays.map(day => (
                <div key={day} className="text-center text-gray-500 dark:text-gray-400 p-1">
                  {day[0]}
                </div>
              ))}
              {getDaysInMonth(currentDate).map((day, index) => {
                const isToday = day.date.toDateString() === new Date().toDateString();
                const isSelected = day.date.toDateString() === currentDate.toDateString();
                
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentDate(day.date)}
                    className={`p-1 rounded text-center ${
                      !day.isCurrentMonth ? 'text-gray-300 dark:text-gray-600' :
                      isToday ? 'bg-blue-500 text-white' :
                      isSelected ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                      'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendars list */}
          <div className="flex-1 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Meus Calendários</h3>
              <button
                onClick={() => setShowCalendarModal(true)}
                className="text-blue-500 hover:text-blue-600 text-sm"
              >
                + Novo
              </button>
            </div>
            
            <div className="space-y-2">
              {calendars.map(calendar => (
                <div key={calendar.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 group">
                  <input
                    type="checkbox"
                    checked={calendar.isVisible}
                    onChange={(e) => onCalendarToggle?.(calendar.id, e.target.checked)}
                    className="rounded"
                  />
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm"
                    style={{ backgroundColor: calendar.color }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate block">
                      {calendar.name}
                    </span>
                    {calendar.isDefault && (
                      <span className="text-xs text-blue-500">Padrão</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setCalendarForm({
                        name: calendar.name,
                        description: '',
                        color: calendar.color,
                        isVisible: calendar.isVisible,
                        isDefault: calendar.isDefault
                      });
                      setEditingCalendar(calendar);
                      setShowCalendarModal(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    title="Editar calendário"
                  >
                    ⚙️
                  </button>
                </div>
              ))}
            </div>

            {/* Priority Legend */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-zinc-700">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 text-sm">Prioridades</h3>
              <div className="space-y-2">
                {[
                  { key: 'URGENT', label: 'Urgente', color: getPriorityColor('URGENT') },
                  { key: 'HIGH', label: 'Alta', color: getPriorityColor('HIGH') },
                  { key: 'MEDIUM', label: 'Média', color: getPriorityColor('MEDIUM') },
                  { key: 'LOW', label: 'Baixa', color: getPriorityColor('LOW') }
                ].map(priority => (
                  <div key={priority.key} className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: priority.color }}
                    ></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {priority.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
              >
                ☰
              </button>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Calendário
              </h1>
              
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                title="Ir para hoje (tecla T)"
              >
                Hoje
              </button>
              
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-zinc-600"
                title="Atalhos de teclado (tecla ? ou H)"
              >
                ⌨️
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <input
                type="text"
                placeholder="Buscar eventos... (tecla /)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm"
                title="Buscar eventos (tecla /)"
              />

              {/* Quick create */}
              <div className="flex">
                <input
                  type="text"
                  placeholder="Criação rápida: 'Reunião amanhã 14h'"
                  value={quickCreateText}
                  onChange={(e) => setQuickCreateText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleQuickCreate()}
                  className="px-3 py-1 border border-gray-300 dark:border-zinc-600 rounded-l-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm w-64"
                />
                <button
                  onClick={handleQuickCreate}
                  className="px-3 py-1 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 text-sm"
                >
                  ➕
                </button>
              </div>

              <button
                onClick={() => setShowEventModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                title="Criar evento (tecla C)"
              >
                Criar Evento
              </button>

              {/* Menu de exportação */}
              <div className="relative">
                <button
                  onClick={() => {
                    const calendarName = calendars.find(c => c.isDefault)?.name || 'Meu Calendário';
                    const eventsToExport = filteredEvents.map(event => ({
                      id: event.id,
                      title: event.title,
                      description: event.description,
                      startDate: event.startDate,
                      endDate: event.endDate,
                      allDay: event.allDay,
                      location: event.location,
                      timezone: event.timezone || getCurrentTimezone(),
                      recurring: event.recurring,
                      recurrence: event.recurrence,
                      reminders: event.reminders,
                      participants: event.participants,
                      tags: event.tags,
                      status: event.status,
                      priority: event.priority,
                      createdBy: event.createdBy
                    } as ICalEvent));
                    
                    exportMultipleEvents(eventsToExport, calendarName);
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
                  title="Exportar todos os eventos visíveis"
                >
                  <span>📅</span>
                  <span>Exportar ICS</span>
                </button>
              </div>
            </div>
          </div>

          {/* View selector and navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-zinc-700 rounded-lg p-1">
              {(['month', 'week', 'day', 'agenda', 'year'] as const).map((viewType) => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    view === viewType 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={
                    viewType === 'month' ? 'Visualização mensal (tecla M)' : 
                    viewType === 'week' ? 'Visualização semanal (tecla W)' : 
                    viewType === 'day' ? 'Visualização diária (tecla D)' :
                    viewType === 'agenda' ? 'Lista de eventos (tecla A)' : 'Visualização anual (tecla Y)'
                  }
                >
                  {viewType === 'month' ? 'Mês' : 
                   viewType === 'week' ? 'Semana' : 
                   viewType === 'day' ? 'Dia' :
                   viewType === 'agenda' ? 'Agenda' : 'Ano'}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg text-xl"
                title="Período anterior (seta esquerda)"
              >
                ◀
              </button>
              
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
                {view === 'year' ? currentDate.getFullYear() :
                 view === 'day' ? `${currentDate.getDate()} de ${months[currentDate.getMonth()]} ${currentDate.getFullYear()}` :
                 view === 'week' ? `${getWeekDays(currentDate)[0].getDate()} - ${getWeekDays(currentDate)[6].getDate()} de ${months[currentDate.getMonth()]} ${currentDate.getFullYear()}` :
                 view === 'agenda' ? 'Agenda' :
                 `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
              </h2>
              
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg text-xl"
                title="Próximo período (seta direita)"
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        {/* Calendar content */}
        <div ref={calendarRef} className="flex-1 overflow-hidden">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
          {view === 'agenda' && renderAgendaView()}
          {view === 'year' && renderYearView()}
        </div>
      </div>

      {/* Event Creation Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingEvent ? 'Editar Evento' : 'Novo Evento'}
                </h3>
                <button
                  onClick={() => {
                    setShowEventModal(false);
                    setEditingEvent(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const startDateTime = eventForm.allDay 
                    ? new Date(`${eventForm.startDate}T00:00:00`)
                    : new Date(`${eventForm.startDate}T${eventForm.startTime}:00`);
                  const endDateTime = eventForm.allDay
                    ? new Date(`${eventForm.endDate}T23:59:59`)
                    : new Date(`${eventForm.endDate}T${eventForm.endTime}:00`);

                  const eventData = {
                    ...eventForm,
                    startDate: startDateTime,
                    endDate: endDateTime,
                    createdBy: 'current-user',
                    participants: eventForm.participants.filter(p => p.email?.trim() !== ''),
                    tags: eventForm.tags.filter(t => t.trim() !== '')
                  };

                  if (editingEvent) {
                    onEventUpdate?.(editingEvent.id, eventData);
                  } else {
                    onEventCreate?.(eventData);
                  }

                  setShowEventModal(false);
                  setEditingEvent(null);
                }}
                className="space-y-6"
              >
                {/* Informações básicas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Título*
                    </label>
                    <input
                      type="text"
                      required
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      placeholder="Ex: Reunião de equipe"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Descrição
                    </label>
                    <textarea
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      placeholder="Adicionar descrição..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Calendário
                    </label>
                    <select
                      value={eventForm.calendarId}
                      onChange={(e) => setEventForm({ ...eventForm, calendarId: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                    >
                      {calendars.map(calendar => (
                        <option key={calendar.id} value={calendar.id}>
                          {calendar.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Local
                    </label>
                    <input
                      type="text"
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      placeholder="Adicionar local..."
                    />
                  </div>
                </div>

                {/* Data e horário */}
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="allDay"
                      checked={eventForm.allDay}
                      onChange={(e) => setEventForm({ ...eventForm, allDay: e.target.checked })}
                      className="mr-2 rounded"
                    />
                    <label htmlFor="allDay" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dia inteiro
                    </label>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Data de início*
                      </label>
                      <input
                        type="date"
                        required
                        value={eventForm.startDate}
                        onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Data de fim*
                      </label>
                      <input
                        type="date"
                        required
                        value={eventForm.endDate}
                        onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    {!eventForm.allDay && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Hora de início
                          </label>
                          <input
                            type="time"
                            value={eventForm.startTime}
                            onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Hora de fim
                          </label>
                          <input
                            type="time"
                            value={eventForm.endTime}
                            onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Tipo, prioridade e status */}
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tipo
                      </label>
                      <select
                        value={eventForm.type}
                        onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      >
                        {Object.entries(typeLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Prioridade
                      </label>
                      <div className="relative">
                        <select
                          value={eventForm.priority}
                          onChange={(e) => setEventForm({ ...eventForm, priority: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white appearance-none cursor-pointer"
                          style={{ paddingLeft: '40px' }}
                        >
                          {Object.entries(priorityLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                        <div 
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full pointer-events-none"
                          style={{ backgroundColor: getPriorityColor(eventForm.priority) }}
                        ></div>
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Status
                      </label>
                      <select
                        value={eventForm.status}
                        onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      >
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Recorrência */}
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={eventForm.recurring}
                      onChange={(e) => setEventForm({ ...eventForm, recurring: e.target.checked })}
                      className="mr-2 rounded"
                    />
                    <label htmlFor="recurring" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Evento recorrente
                    </label>
                  </div>

                  {eventForm.recurring && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Frequência
                          </label>
                          <select
                            value={eventForm.recurrence.frequency}
                            onChange={(e) => setEventForm({ 
                              ...eventForm, 
                              recurrence: { ...eventForm.recurrence, frequency: e.target.value, daysOfWeek: [] }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                          >
                            <option value="DAILY">Diário</option>
                            <option value="WEEKLY">Semanal</option>
                            <option value="MONTHLY">Mensal</option>
                            <option value="YEARLY">Anual</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Intervalo
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={eventForm.recurrence.interval}
                            onChange={(e) => setEventForm({ 
                              ...eventForm, 
                              recurrence: { ...eventForm.recurrence, interval: parseInt(e.target.value) || 1 }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Até (opcional)
                          </label>
                          <input
                            type="date"
                            value={eventForm.recurrence.until}
                            onChange={(e) => setEventForm({ 
                              ...eventForm, 
                              recurrence: { ...eventForm.recurrence, until: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Dias da semana para eventos semanais */}
                      {eventForm.recurrence.frequency === 'WEEKLY' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Dias da semana
                          </label>
                          <div className="flex gap-2">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                              <label key={index} className="flex flex-col items-center">
                                <input
                                  type="checkbox"
                                  checked={(eventForm.recurrence.daysOfWeek as number[])?.includes(index) || false}
                                  onChange={(e) => {
                                    const daysOfWeek = (eventForm.recurrence.daysOfWeek as number[]) || [];
                                    const newDaysOfWeek = e.target.checked
                                      ? [...daysOfWeek, index]
                                      : daysOfWeek.filter(d => d !== index);
                                    setEventForm({
                                      ...eventForm,
                                      recurrence: { ...eventForm.recurrence, daysOfWeek: newDaysOfWeek } as any
                                    });
                                  }}
                                  className="mb-1"
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-400">{day}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tipo de recorrência mensal */}
                      {eventForm.recurrence.frequency === 'MONTHLY' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tipo de recorrência mensal
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="monthlyType"
                                value="day"
                                checked={eventForm.recurrence.monthlyType === 'day'}
                                onChange={(e) => setEventForm({
                                  ...eventForm,
                                  recurrence: { ...eventForm.recurrence, monthlyType: 'day' }
                                })}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                No mesmo dia do mês (ex: dia 15 de cada mês)
                              </span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="monthlyType"
                                value="weekday"
                                checked={eventForm.recurrence.monthlyType === 'weekday'}
                                onChange={(e) => setEventForm({
                                  ...eventForm,
                                  recurrence: { ...eventForm.recurrence, monthlyType: 'weekday' }
                                })}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                No mesmo dia da semana (ex: segunda segunda-feira)
                              </span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Número de ocorrências alternativo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Número de ocorrências (alternativo ao "até")
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={eventForm.recurrence.count || ''}
                          onChange={(e) => setEventForm({ 
                            ...eventForm, 
                            recurrence: { 
                              ...eventForm.recurrence, 
                              count: e.target.value ? parseInt(e.target.value) : 0 
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                          placeholder="Deixe vazio para usar data final"
                        />
                      </div>

                      {/* Preview da recorrência */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <strong>Resumo:</strong> {getRecurrenceDescription(eventForm.recurrence as any)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lembretes */}
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Lembretes e Notificações ({eventForm.reminders.length})
                  </h4>
                  
                  <div className="space-y-4">
                    {eventForm.reminders.map((reminder, index) => (
                      <div key={index} className="border border-gray-200 dark:border-zinc-600 rounded-lg p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Tempo
                            </label>
                            <select
                              value={reminder.minutes}
                              onChange={(e) => {
                                const newReminders = [...eventForm.reminders];
                                newReminders[index] = { ...reminder, minutes: parseInt(e.target.value) };
                                setEventForm({ ...eventForm, reminders: newReminders });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm"
                            >
                              <option value={0}>No momento do evento</option>
                              <option value={5}>5 minutos antes</option>
                              <option value={10}>10 minutos antes</option>
                              <option value={15}>15 minutos antes</option>
                              <option value={30}>30 minutos antes</option>
                              <option value={60}>1 hora antes</option>
                              <option value={120}>2 horas antes</option>
                              <option value={1440}>1 dia antes</option>
                              <option value={2880}>2 dias antes</option>
                              <option value={10080}>1 semana antes</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Tipo
                            </label>
                            <select
                              value={reminder.type}
                              onChange={(e) => {
                                const newReminders = [...eventForm.reminders];
                                newReminders[index] = { ...reminder, type: e.target.value };
                                setEventForm({ ...eventForm, reminders: newReminders });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm"
                            >
                              <option value="POPUP">Pop-up (Navegador)</option>
                              <option value="EMAIL">Email</option>
                              <option value="PUSH">Push Notification</option>
                              <option value="SMS">SMS</option>
                              <option value="DESKTOP">Notificação Desktop</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Método
                            </label>
                            <select
                              value={reminder.method || 'browser'}
                              onChange={(e) => {
                                const newReminders = [...eventForm.reminders];
                                newReminders[index] = { ...reminder, method: e.target.value };
                                setEventForm({ ...eventForm, reminders: newReminders });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm"
                            >
                              <option value="browser">Navegador</option>
                              <option value="system">Sistema</option>
                              <option value="sound">Som + Visual</option>
                              <option value="silent">Silencioso</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              reminder.type === 'EMAIL' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              reminder.type === 'SMS' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              reminder.type === 'PUSH' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              reminder.type === 'DESKTOP' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {reminder.type === 'EMAIL' ? '📧 Email' :
                               reminder.type === 'SMS' ? '📱 SMS' :
                               reminder.type === 'PUSH' ? '🔔 Push' :
                               reminder.type === 'DESKTOP' ? '🖥️ Desktop' : '⚡ Pop-up'}
                            </span>
                            
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {reminder.minutes === 0 ? 'No evento' :
                               reminder.minutes < 60 ? `${reminder.minutes} min antes` :
                               reminder.minutes < 1440 ? `${Math.floor(reminder.minutes / 60)}h antes` :
                               reminder.minutes < 10080 ? `${Math.floor(reminder.minutes / 1440)} dia(s) antes` :
                               `${Math.floor(reminder.minutes / 10080)} semana(s) antes`}
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const newReminders = eventForm.reminders.filter((_, i) => i !== index);
                              setEventForm({ ...eventForm, reminders: newReminders });
                            }}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="Remover lembrete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEventForm({
                            ...eventForm,
                            reminders: [...eventForm.reminders, { minutes: 15, type: 'POPUP', method: 'browser' }]
                          });
                        }}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors"
                      >
                        ⚡ Pop-up 15min
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEventForm({
                            ...eventForm,
                            reminders: [...eventForm.reminders, { minutes: 60, type: 'EMAIL', method: 'system' }]
                          });
                        }}
                        className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        📧 Email 1h
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEventForm({
                            ...eventForm,
                            reminders: [...eventForm.reminders, { minutes: 1440, type: 'PUSH', method: 'system' }]
                          });
                        }}
                        className="px-3 py-2 text-sm text-purple-600 hover:text-purple-800 border border-purple-200 hover:border-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                      >
                        🔔 Push 1dia
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEventForm({
                            ...eventForm,
                            reminders: [...eventForm.reminders, { minutes: 15, type: 'DESKTOP', method: 'sound' }]
                          });
                        }}
                        className="px-3 py-2 text-sm text-orange-600 hover:text-orange-800 border border-orange-200 hover:border-orange-300 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                      >
                        🖥️ Desktop
                      </button>
                    </div>

                    {eventForm.reminders.length > 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          <strong>⚠️ Importante:</strong> As notificações por email e SMS dependem das configurações do sistema.
                          Para receber notificações no navegador, é necessário permitir notificações quando solicitado.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Participantes */}
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Participantes ({eventForm.participants.length})
                  </h4>
                  
                  <div className="space-y-4">
                    {eventForm.participants.map((participant, index) => (
                      <div key={index} className="border border-gray-200 dark:border-zinc-600 rounded-lg p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={participant.email}
                              onChange={(e) => {
                                const newParticipants = [...eventForm.participants];
                                newParticipants[index] = { ...participant, email: e.target.value };
                                setEventForm({ ...eventForm, participants: newParticipants });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm"
                              placeholder="email@exemplo.com"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Tipo
                            </label>
                            <select
                              value={participant.role}
                              onChange={(e) => {
                                const newParticipants = [...eventForm.participants];
                                newParticipants[index] = { ...participant, role: e.target.value as any };
                                setEventForm({ ...eventForm, participants: newParticipants });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm"
                            >
                              <option value="required">Obrigatório</option>
                              <option value="optional">Opcional</option>
                              <option value="organizer">Organizador</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Status
                            </label>
                            <select
                              value={participant.status}
                              onChange={(e) => {
                                const newParticipants = [...eventForm.participants];
                                newParticipants[index] = { ...participant, status: e.target.value as any };
                                setEventForm({ ...eventForm, participants: newParticipants });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm"
                            >
                              <option value="pending">Pendente</option>
                              <option value="accepted">Confirmado</option>
                              <option value="declined">Recusado</option>
                              <option value="tentative">Tentativo</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              participant.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              participant.status === 'declined' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              participant.status === 'tentative' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {participant.status === 'accepted' ? '✓ Confirmado' :
                               participant.status === 'declined' ? '✗ Recusado' :
                               participant.status === 'tentative' ? '? Tentativo' : '⏳ Pendente'}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              participant.role === 'organizer' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              participant.role === 'required' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {participant.role === 'organizer' ? '👑 Organizador' :
                               participant.role === 'required' ? '🔴 Obrigatório' : '⚪ Opcional'}
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const newParticipants = eventForm.participants.filter((_, i) => i !== index);
                              setEventForm({ ...eventForm, participants: newParticipants });
                            }}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="Remover participante"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEventForm({
                            ...eventForm,
                            participants: [...eventForm.participants, { email: '', status: 'pending', role: 'required' }]
                          });
                        }}
                        className="flex-1 px-4 py-2 text-sm text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        + Adicionar participante obrigatório
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEventForm({
                            ...eventForm,
                            participants: [...eventForm.participants, { email: '', status: 'pending', role: 'optional' }]
                          });
                        }}
                        className="flex-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors"
                      >
                        + Adicionar participante opcional
                      </button>
                    </div>

                    {eventForm.participants.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <strong>Resumo:</strong> {eventForm.participants.filter(p => p.role === 'required').length} obrigatório(s), {eventForm.participants.filter(p => p.role === 'optional').length} opcional(is)
                          <br />
                          Status: {eventForm.participants.filter(p => p.status === 'accepted').length} confirmado(s), {eventForm.participants.filter(p => p.status === 'pending').length} pendente(s)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fuso Horário */}
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Fuso Horário</h4>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Região
                      </label>
                      <select
                        value={COMMON_TIMEZONES.find(tz => tz.id === eventForm.timezone)?.region || 'Brasil'}
                        onChange={(e) => {
                          const regionTimezones = getTimezonesByRegion(e.target.value);
                          if (regionTimezones.length > 0) {
                            setEventForm({ ...eventForm, timezone: regionTimezones[0].id });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      >
                        {getAllRegions().map(region => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fuso Horário
                      </label>
                      <select
                        value={eventForm.timezone}
                        onChange={(e) => setEventForm({ ...eventForm, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      >
                        {COMMON_TIMEZONES
                          .filter(tz => tz.region === (COMMON_TIMEZONES.find(t => t.id === eventForm.timezone)?.region || 'Brasil'))
                          .map(timezone => (
                            <option key={timezone.id} value={timezone.id}>
                              {timezone.name}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>

                  {eventForm.timezone !== getCurrentTimezone() && (
                    <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>🌍 Fuso diferente:</strong> Este evento será em {getTimezoneDisplayName(eventForm.timezone)}.
                        <br />
                        Seu fuso local: {getTimezoneDisplayName(getCurrentTimezone())}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={eventForm.tags.join(', ')}
                    onChange={(e) => setEventForm({ 
                      ...eventForm, 
                      tags: e.target.value.split(',').map(tag => tag.trim()) 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                    placeholder="trabalho, reunião, importante"
                  />
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEventModal(false);
                      setEditingEvent(null);
                    }}
                    className="px-6 py-2 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    {editingEvent ? 'Atualizar' : 'Criar'} Evento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showDetailsModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl w-full max-w-lg">
            <div className="p-6">
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
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    {selectedEvent.title}
                    {(selectedEvent as any).scaleData && (
                      <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-2 py-1 rounded-full font-normal">
                        Escala
                      </span>
                    )}
                  </h4>
                  
                  {/* Layout especial para eventos de escala */}
                  {(selectedEvent as any).scaleData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {(selectedEvent as any).scaleData.baseTechnicians.length}
                            </div>
                            <div className="text-sm font-medium text-blue-800 dark:text-blue-300">Base</div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                              {(selectedEvent as any).scaleData.baseTechnicians.slice(0, 2).map((tech: any) => (
                                <div key={tech.id}>• {tech.displayName}</div>
                              ))}
                              {(selectedEvent as any).scaleData.baseTechnicians.length > 2 && (
                                <div>+{(selectedEvent as any).scaleData.baseTechnicians.length - 2} mais</div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {(selectedEvent as any).scaleData.visitTechnicians.length}
                            </div>
                            <div className="text-sm font-medium text-green-800 dark:text-green-300">Visitas</div>
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1 space-y-1">
                              {(selectedEvent as any).scaleData.visitTechnicians.slice(0, 2).map((tech: any) => (
                                <div key={tech.id}>• {tech.displayName}</div>
                              ))}
                              {(selectedEvent as any).scaleData.visitTechnicians.length > 2 && (
                                <div>+{(selectedEvent as any).scaleData.visitTechnicians.length - 2} mais</div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                              {(selectedEvent as any).scaleData.offTechnicians.length}
                            </div>
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-300">Folga</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                              {(selectedEvent as any).scaleData.offTechnicians.slice(0, 2).map((tech: any) => (
                                <div key={tech.id}>• {tech.displayName}</div>
                              ))}
                              {(selectedEvent as any).scaleData.offTechnicians.length > 2 && (
                                <div>+{(selectedEvent as any).scaleData.offTechnicians.length - 2} mais</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Demandas do dia */}
                      {(selectedEvent as any).scaleData && (selectedEvent as any).scaleData.demands && (selectedEvent as any).scaleData.demands.length > 0 && (
                        <div className="mt-6">
                          <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                            📋 Demandas do Dia
                            <span className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs px-2 py-1 rounded-full">
                              {(selectedEvent as any).scaleData.demands.length}
                            </span>
                          </h5>
                          <div className="space-y-3 max-h-48 overflow-y-auto">
                            {(selectedEvent as any).scaleData.demands.map((demand: any) => (
                              <div key={demand.id} className="border border-gray-200 dark:border-zinc-600 rounded-lg p-3 bg-gray-50 dark:bg-zinc-700/50">
                                <div className="flex items-start justify-between mb-2">
                                  <h6 className="font-medium text-gray-900 dark:text-white text-sm">
                                    {demand.title}
                                  </h6>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    demand.priority === 'URGENT' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    demand.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                    demand.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  }`}>
                                    {demand.priority === 'URGENT' ? 'Urgente' :
                                     demand.priority === 'HIGH' ? 'Alta' :
                                     demand.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                                  </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                                  {demand.description}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                  🏫 {demand.school}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    selectedEvent.description && (
                      <p className="text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-line">
                        {selectedEvent.description}
                      </p>
                    )
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
                      {formatEventTime(selectedEvent.startDate, selectedEvent.endDate, selectedEvent.timezone || getCurrentTimezone(), selectedEvent.allDay)}
                    </p>
                  </div>
                  {selectedEvent.location && (
                    <div className="col-span-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Local:</span>
                      <p className="text-gray-900 dark:text-white">{selectedEvent.location}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
                  <button
                    onClick={() => {
                      const eventToExport: ICalEvent = {
                        id: selectedEvent.id,
                        title: selectedEvent.title,
                        description: selectedEvent.description,
                        startDate: selectedEvent.startDate,
                        endDate: selectedEvent.endDate,
                        allDay: selectedEvent.allDay,
                        location: selectedEvent.location,
                        timezone: selectedEvent.timezone || getCurrentTimezone(),
                        recurring: selectedEvent.recurring,
                        recurrence: selectedEvent.recurrence,
                        reminders: selectedEvent.reminders,
                        participants: selectedEvent.participants,
                        tags: selectedEvent.tags,
                        status: selectedEvent.status,
                        priority: selectedEvent.priority,
                        createdBy: selectedEvent.createdBy
                      };
                      exportSingleEvent(eventToExport);
                    }}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    title="Exportar este evento para ICS"
                  >
                    📅 Exportar
                  </button>
                  <button
                    onClick={() => {
                      onEventDelete?.(selectedEvent.id);
                      setShowDetailsModal(false);
                      setSelectedEvent(null);
                    }}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    🗑️ Excluir
                  </button>
                  <button
                    onClick={() => {
                      setEditingEvent(selectedEvent);
                      setShowDetailsModal(false);
                      setShowEventModal(true);
                    }}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    ✏️ Editar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Creation Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingCalendar ? 'Editar Calendário' : 'Novo Calendário'}
                </h3>
                <button
                  onClick={() => {
                    setShowCalendarModal(false);
                    setEditingCalendar(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingCalendar) {
                    onCalendarUpdate?.(editingCalendar.id, {
                      ...calendarForm,
                      timezone: 'America/Sao_Paulo'
                    });
                  } else {
                    onCalendarCreate?.({
                      ...calendarForm,
                      ownerId: 'current-user',
                      isPublic: false,
                      timezone: 'America/Sao_Paulo'
                    });
                  }
                  setShowCalendarModal(false);
                  setEditingCalendar(null);
                  setCalendarForm({
                    name: '',
                    description: '',
                    color: '#3b82f6',
                    isVisible: true,
                    isDefault: false
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome do Calendário*
                  </label>
                  <input
                    type="text"
                    required
                    value={calendarForm.name}
                    onChange={(e) => setCalendarForm({ ...calendarForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Trabalho, Pessoal, Eventos"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={calendarForm.description}
                    onChange={(e) => setCalendarForm({ ...calendarForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                    placeholder="Descrição opcional..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cor
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={calendarForm.color}
                      onChange={(e) => setCalendarForm({ ...calendarForm, color: e.target.value })}
                      className="w-12 h-10 rounded-lg border border-gray-300 dark:border-zinc-600 cursor-pointer"
                    />
                    <div className="grid grid-cols-10 gap-2">
                      {[
                        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
                        '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
                        '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
                        '#ec4899', '#f43f5e', '#6b7280', '#374151', '#1f2937'
                      ].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setCalendarForm({ ...calendarForm, color })}
                          className={`w-6 h-6 rounded-full border-2 ${
                            calendarForm.color === color ? 'border-gray-400' : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={calendarForm.isVisible}
                      onChange={(e) => setCalendarForm({ ...calendarForm, isVisible: e.target.checked })}
                      className="mr-2 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Visível</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={calendarForm.isDefault}
                      onChange={(e) => setCalendarForm({ ...calendarForm, isDefault: e.target.checked })}
                      className="mr-2 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Padrão</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCalendarModal(false);
                      setEditingCalendar(null);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  {editingCalendar && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja excluir este calendário?')) {
                          // Implementar exclusão se necessário
                          setShowCalendarModal(false);
                          setEditingCalendar(null);
                        }
                      }}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                      Excluir
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    {editingCalendar ? 'Atualizar' : 'Criar'} Calendário
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  ⌨️ Atalhos de Teclado
                </h3>
                <button
                  onClick={() => setShowKeyboardHelp(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">📅 Ações Principais</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Criar evento:</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded font-mono">C</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Ir para hoje:</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded font-mono">T</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Buscar:</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded font-mono">/</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Fechar modal:</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded font-mono">ESC</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Ajuda:</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded font-mono">? ou H</kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">👁️ Visualizações</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Visualização mensal:</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded font-mono">M</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Visualização semanal:</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded font-mono">W</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Visualização diária:</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded font-mono">D</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Lista de eventos:</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded font-mono">A</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Visualização anual:</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded font-mono">Y</kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">🧭 Navegação</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Período anterior:</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded font-mono">←</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Próximo período:</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded font-mono">→</kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">💡 Dicas</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="mb-2">• Os atalhos funcionam apenas quando não há campos de texto focados</p>
                    <p className="mb-2">• Use ESC para fechar qualquer modal aberto</p>
                    <p>• Clique em qualquer data para criar um evento rapidamente</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-6 border-t border-gray-200 dark:border-zinc-700 mt-6">
                <button
                  onClick={() => setShowKeyboardHelp(false)}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendar;