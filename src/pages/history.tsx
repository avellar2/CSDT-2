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

const History: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Obter a data atual no formato YYYY-MM-DD
      const currentDate = new Date().toISOString().split("T")[0];

      // Adicionar o parâmetro 'date' na URL
      const osResponse = await fetch(`/api/history/internal-os?date=${currentDate}`);
      const osData = await osResponse.json();
      console.log("osData:", osData);

      const demandResponse = await fetch(`/api/history/school-demands?date=${currentDate}`);
      const demandData = await demandResponse.json();
      console.log("demandData:", demandData);

      const osEvents = Array.isArray(osData)
        ? osData.map((os) => ({
          title: `OS: ${os.setor} - ${os.problema}`,
          start: os.createdAt,
          allDay: true,
          backgroundColor: "#FF5733", // Cor personalizada para OS
          borderColor: "#FF5733", // Cor da borda
          textColor: "#FFFFFF", // Cor do texto
        }))
        : [];

      const demandEvents = Array.isArray(demandData)
        ? demandData.map((demand) => ({
          title: `Demanda: ${demand.demand}`,
          start: demand.createdAt,
          allDay: true,
          backgroundColor: "#33B5FF", // Cor personalizada para Demanda
          borderColor: "#33B5FF", // Cor da borda
          textColor: "#FFFFFF", // Cor do texto
        }))
        : [];

      setEvents([...osEvents, ...demandEvents]);
    } catch (error) {
      console.error("Erro ao buscar históricos:", error);
    } finally {
      setLoading(false);
    }
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
            dateClick={(info) => console.log("Data clicada:", info.dateStr)}
          />
        )}
      </div>
    </div>
  );
};

export default History;