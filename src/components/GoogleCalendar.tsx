import React, { useState, useEffect, useRef } from 'react';

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
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<ScheduleEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickCreateText, setQuickCreateText] = useState('');
  const [selectedCalendar, setSelectedCalendar] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
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
      count: 0
    },
    reminders: [{ minutes: 15, type: 'POPUP' }],
    participants: [] as string[],
    timezone: 'America/Sao_Paulo',
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

  // Filtrar eventos por calendários visíveis e busca
  const filteredEvents = events.filter(event => {
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
      if (e.ctrlKey || e.metaKey) return;
      
      switch (e.key.toLowerCase()) {
        case 'c':
          if (!showEventModal && !showDetailsModal) {
            setShowEventModal(true);
            e.preventDefault();
          }
          break;
        case 't':
          setCurrentDate(new Date());
          e.preventDefault();
          break;
        case 'm':
          setView('month');
          e.preventDefault();
          break;
        case 'w':
          setView('week');
          e.preventDefault();
          break;
        case 'd':
          setView('day');
          e.preventDefault();
          break;
        case 'a':
          setView('agenda');
          e.preventDefault();
          break;
        case 'arrowleft':
          navigateDate('prev');
          e.preventDefault();
          break;
        case 'arrowright':
          navigateDate('next');
          e.preventDefault();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showEventModal, showDetailsModal]);

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
            } ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''}`}
            onClick={() => handleTimeSlotClick(day.date)}
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
                    className="text-xs p-1 rounded text-white truncate cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: calendar?.color || '#3b82f6' }}
                    title={`${event.title} - ${formatTime(event.startDate)}`}
                    draggable
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(event);
                      setShowDetailsModal(true);
                    }}
                  >
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
                            style={{ backgroundColor: calendar?.color || '#3b82f6' }}
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
                        style={{ backgroundColor: calendar?.color || '#3b82f6' }}
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
                    style={{ backgroundColor: calendar?.color || '#3b82f6' }}
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
                      {event.allDay ? 'Dia inteiro' : `${formatTime(event.startDate)} - ${formatTime(event.endDate)}`}
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
                <div key={calendar.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={calendar.isVisible}
                    onChange={(e) => onCalendarToggle?.(calendar.id, e.target.checked)}
                    className="rounded"
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: calendar.color }}
                  ></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {calendar.name}
                  </span>
                </div>
              ))}
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
              >
                Hoje
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <input
                type="text"
                placeholder="Buscar eventos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm"
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
              >
                Criar Evento
              </button>
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
                    participants: eventForm.participants.filter(p => p.trim() !== ''),
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
                      <select
                        value={eventForm.priority}
                        onChange={(e) => setEventForm({ ...eventForm, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      >
                        {Object.entries(priorityLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Frequência
                        </label>
                        <select
                          value={eventForm.recurrence.frequency}
                          onChange={(e) => setEventForm({ 
                            ...eventForm, 
                            recurrence: { ...eventForm.recurrence, frequency: e.target.value }
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
                          value={eventForm.recurrence.interval}
                          onChange={(e) => setEventForm({ 
                            ...eventForm, 
                            recurrence: { ...eventForm.recurrence, interval: parseInt(e.target.value) }
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
                  )}
                </div>

                {/* Lembretes */}
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Lembretes</h4>
                  
                  {eventForm.reminders.map((reminder, index) => (
                    <div key={index} className="flex items-center space-x-4 mb-3">
                      <select
                        value={reminder.minutes}
                        onChange={(e) => {
                          const newReminders = [...eventForm.reminders];
                          newReminders[index] = { ...reminder, minutes: parseInt(e.target.value) };
                          setEventForm({ ...eventForm, reminders: newReminders });
                        }}
                        className="px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      >
                        <option value={5}>5 minutos antes</option>
                        <option value={15}>15 minutos antes</option>
                        <option value={30}>30 minutos antes</option>
                        <option value={60}>1 hora antes</option>
                        <option value={1440}>1 dia antes</option>
                        <option value={10080}>1 semana antes</option>
                      </select>

                      <select
                        value={reminder.type}
                        onChange={(e) => {
                          const newReminders = [...eventForm.reminders];
                          newReminders[index] = { ...reminder, type: e.target.value };
                          setEventForm({ ...eventForm, reminders: newReminders });
                        }}
                        className="px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      >
                        <option value="POPUP">Pop-up</option>
                        <option value="EMAIL">Email</option>
                        <option value="PUSH">Push</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          const newReminders = eventForm.reminders.filter((_, i) => i !== index);
                          setEventForm({ ...eventForm, reminders: newReminders });
                        }}
                        className="text-red-500 hover:text-red-700 px-2"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setEventForm({
                        ...eventForm,
                        reminders: [...eventForm.reminders, { minutes: 15, type: 'POPUP' }]
                      });
                    }}
                    className="text-sm text-blue-500 hover:text-blue-700"
                  >
                    + Adicionar lembrete
                  </button>
                </div>

                {/* Participantes */}
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Participantes</h4>
                  
                  <div className="space-y-3">
                    {eventForm.participants.map((email, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const newParticipants = [...eventForm.participants];
                            newParticipants[index] = e.target.value;
                            setEventForm({ ...eventForm, participants: newParticipants });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                          placeholder="email@exemplo.com"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newParticipants = eventForm.participants.filter((_, i) => i !== index);
                            setEventForm({ ...eventForm, participants: newParticipants });
                          }}
                          className="text-red-500 hover:text-red-700 px-2"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setEventForm({
                          ...eventForm,
                          participants: [...eventForm.participants, '']
                        });
                      }}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      + Adicionar participante
                    </button>
                  </div>
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
                      {selectedEvent.allDay ? 'Dia inteiro' : `${formatTime(selectedEvent.startDate)} - ${formatTime(selectedEvent.endDate)}`}
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
                  Novo Calendário
                </h3>
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onCalendarCreate?.({
                    ...calendarForm,
                    ownerId: 'current-user',
                    isPublic: false,
                    timezone: 'America/Sao_Paulo'
                  });
                  setShowCalendarModal(false);
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
                    <div className="grid grid-cols-8 gap-2">
                      {[
                        '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
                        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
                        '#6b7280', '#f97316', '#8b5cf6', '#14b8a6'
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
                    onClick={() => setShowCalendarModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Criar Calendário
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendar;