import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

interface OS {
  id: string;
  setor: string;
  problema: string;
  status: string;
  createdAt: string;
}

interface Demand {
  id: string;
  demand: string;
  description: string;
  createdAt: string;
}

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; events: any[]; date: string | null }> = ({
  isOpen,
  onClose,
  events,
  date,
}) => {
  if (!isOpen) return null;

  // Formatar a data no padrão brasileiro (DD/MM/AAAA)
  const formattedDate = date ? new Date(date).toLocaleDateString("pt-BR") : "";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4 text-zinc-700 text-center">
          Demandas do dia {formattedDate}
        </h2>
        {events.length > 0 ? (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left text-zinc-700">Escola/Setor</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-zinc-700">Descrição</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-zinc-700">Técnico</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 text-zinc-600">{event.title}</td>
                  <td className="border border-gray-300 px-4 py-2 text-zinc-600">{event.description}</td>
                  <td className="border border-gray-300 px-4 py-2 text-zinc-600">{event.technician}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-zinc-600 text-center">Nenhuma demanda para este dia.</p>
        )}
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const History: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Obter a data atual no formato YYYY-MM-DD
      const currentDate = new Date().toISOString().split("T")[0];

      // Buscar dados de OS
      const osResponse = await fetch(`/api/history/internal-os?date=${currentDate}`);
      const osData = await osResponse.json();
      console.log("osData:", osData);

      // Buscar dados de demandas
      const demandResponse = await fetch(`/api/history/school-demands?date=${currentDate}`);
      const demandData = await demandResponse.json();
      console.log("demandData:", demandData);

      // Buscar dados das escolas
      const schoolResponse = await fetch(`/api/schools`);
      const schoolData = await schoolResponse.json();
      console.log("schoolData:", schoolData);

      // Criar um mapa de schoolId para schoolName
      const schoolMap = Array.isArray(schoolData)
        ? schoolData.reduce((map, school) => {
          map[school.id] = school.name; // Associa o schoolId ao nome da escola
          return map;
        }, {})
        : {};

      // Mapear eventos de OS
      const osEvents = Array.isArray(osData)
        ? osData.map((os) => ({
          title: `OS: ${os.setor} - ${os.problema}`,
          description: os.problema, // Descrição do problema
          technician: os.technician || "Técnico não informado", // Nome do técnico
          start: os.createdAt,
          allDay: true,
          backgroundColor: "#FF5733", // Cor personalizada para OS
          borderColor: "#FF5733", // Cor da borda
          textColor: "#FFFFFF", // Cor do texto
        }))
        : [];

      // Mapear eventos de demandas
      const demandEvents = Array.isArray(demandData)
        ? demandData.map((demand) => ({
          title: `${schoolMap[demand.schoolId] || "Escola Desconhecida"}`, // Nome da escola
          description: demand.demand, // Descrição da demanda
          technician: demand.technician || "Técnico não informado", // Nome do técnico
          start: demand.createdAt,
          allDay: true,
          backgroundColor: "#33B5FF", // Cor personalizada para Demanda
          borderColor: "#33B5FF", // Cor da borda
          textColor: "#FFFFFF", // Cor do texto
        }))
        : [];

      // Agrupar eventos por data e limitar a exibição no calendário
      const groupedEvents = [...osEvents, ...demandEvents].reduce((acc: Record<string, any[]>, event) => {
        const date = event.start.split("T")[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(event);
        return acc;
      }, {} as Record<string, any[]>);

      const limitedEvents = Object.entries(groupedEvents).flatMap(([date, events]) => {
        if (events.length > 2) {
          return [
            ...events.slice(0, 2), // Exibir no máximo 2 eventos
            {
              title: `+${events.length - 2} mais`,
              start: date,
              allDay: true,
              backgroundColor: "#CCCCCC", // Cor personalizada para o indicador
              borderColor: "#CCCCCC",
              textColor: "#000000",
            },
          ];
        }
        return events;
      });

      // Atualizar os eventos no estado
      setEvents(limitedEvents);
    } catch (error) {
      console.error("Erro ao buscar históricos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (info: any) => {
    const clickedDate = info.dateStr;
    const eventsForDate = events.filter(
      (event) => event.start.split("T")[0] === clickedDate
    );
    setSelectedDate(clickedDate);
    setSelectedEvents(eventsForDate);
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6 text-zinc-800">Históricos</h1>
        {loading ? (
          <p className="text-center text-gray-500">Carregando...</p>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            locale="pt-br"
            eventTextColor="#000"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height={600}
            selectable
            dateClick={handleDateClick}
          />
        )}
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        events={selectedEvents}
        date={selectedDate}
      />
    </div>
  );
};

export default History;