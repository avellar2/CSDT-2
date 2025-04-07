import React, { useState, useEffect } from "react";
import { Calendar } from "react-calendar"; // Biblioteca de calendário
import "react-calendar/dist/Calendar.css"; // Estilo do calendário

interface OS {
  id: string;
  setor: string;
  problema: string;
  status: string;
  createdAt: string;
}

interface Demand {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

const History: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [osList, setOsList] = useState<OS[]>([]);
  const [demandList, setDemandList] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const dateString = selectedDate.toISOString().split("T")[0]; // Formata a data como YYYY-MM-DD

        // Busca as OS internas
        const osResponse = await fetch(`/api/history/internal-os?date=${dateString}`);
        const osData = await osResponse.json();

        // Busca as demandas das escolas
        const demandResponse = await fetch(`/api/history/school-demands?date=${dateString}`);
        const demandData = await demandResponse.json();

        setOsList(osData);
        setDemandList(demandData);
      } catch (error) {
        console.error("Erro ao buscar históricos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">Históricos</h1>
        <Calendar
          onChange={(date) => setSelectedDate(date as Date)}
          value={selectedDate}
          className="mb-6"
        />
        {loading ? (
          <p className="text-center text-gray-500">Carregando...</p>
        ) : (
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">OS Internas</h2>
            {osList.length > 0 ? (
              <ul className="list-disc list-inside text-gray-800 mb-6">
                {osList.map((os) => (
                  <li key={os.id}>
                    <strong>Setor:</strong> {os.setor} | <strong>Problema:</strong> {os.problema} |{" "}
                    <strong>Status:</strong> {os.status}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Nenhuma OS interna encontrada para esta data.</p>
            )}

            <h2 className="text-xl font-semibold text-gray-700 mb-4">Demandas das Escolas</h2>
            {demandList.length > 0 ? (
              <ul className="list-disc list-inside text-gray-800">
                {demandList.map((demand) => (
                  <li key={demand.id}>
                    <strong>Título:</strong> {demand.title} | <strong>Descrição:</strong>{" "}
                    {demand.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Nenhuma demanda encontrada para esta data.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;