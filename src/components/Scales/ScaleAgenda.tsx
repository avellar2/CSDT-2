import React from 'react';
import GoogleCalendar from '@/components/GoogleCalendar';

interface ScaleAgendaProps {
  events: any[];
  calendars: any[];
  onEventCreate: (data: any) => Promise<void>;
  onEventUpdate: (id: number, data: any) => Promise<void>;
  onEventDelete: (id: number) => Promise<void>;
  onCalendarCreate: (data: any) => Promise<void>;
  onCalendarUpdate: (id: number, data: any) => Promise<void>;
  onCalendarToggle: (id: number, isVisible: boolean) => Promise<void>;
}

const ScaleAgenda: React.FC<ScaleAgendaProps> = ({
  events,
  calendars,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onCalendarCreate,
  onCalendarUpdate,
  onCalendarToggle,
}) => {
  return (
    <GoogleCalendar
      events={events}
      calendars={calendars}
      onEventCreate={onEventCreate}
      onEventUpdate={onEventUpdate}
      onEventDelete={onEventDelete}
      onCalendarCreate={onCalendarCreate}
      onCalendarUpdate={onCalendarUpdate}
      onCalendarToggle={onCalendarToggle}
    />
  );
};

export default ScaleAgenda;
