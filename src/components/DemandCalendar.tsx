import React, { useState } from 'react';
import { CalendarBlank, CaretLeft, CaretRight } from 'phosphor-react';

interface DemandCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  demandDates?: string[]; // Datas que têm demandas
}

const DemandCalendar: React.FC<DemandCalendarProps> = ({ 
  selectedDate, 
  onDateChange, 
  demandDates = [] 
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameMonth = (date: Date, month: Date) => {
    return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const hasDemands = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return demandDates.includes(dateString);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth);
    if (direction === 'prev') {
      newDate.setMonth(currentMonth.getMonth() - 1);
    } else {
      newDate.setMonth(currentMonth.getMonth() + 1);
    }
    setCurrentMonth(newDate);
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <CalendarBlank size={20} className="text-blue-500" />
          Calendário de Demandas
        </h3>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <CaretLeft size={16} />
          </button>
          
          <span className="font-semibold text-gray-700 min-w-[120px] text-center">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <CaretRight size={16} />
          </button>
        </div>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isSelectedDay = isSelected(date);
          const isTodayDate = isToday(date);
          const hasDemandData = hasDemands(date);

          return (
            <button
              key={index}
              onClick={() => onDateChange(date)}
              className={`
                p-2 text-sm rounded-lg transition-all relative
                ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${isSelectedDay ? 'bg-blue-500 text-white font-semibold' : ''}
                ${isTodayDate && !isSelectedDay ? 'bg-blue-50 border border-blue-200 font-semibold' : ''}
                ${!isSelectedDay && !isTodayDate ? 'hover:bg-gray-100' : ''}
                ${hasDemandData && !isSelectedDay ? 'font-medium' : ''}
              `}
            >
              {date.getDate()}
              
              {/* Indicator for dates with demands */}
              {hasDemandData && (
                <div className={`
                  absolute top-1 right-1 w-2 h-2 rounded-full
                  ${isSelectedDay ? 'bg-white' : 'bg-blue-500'}
                `} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>Com demandas</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
          <span>Hoje</span>
        </div>
      </div>
    </div>
  );
};

export default DemandCalendar;