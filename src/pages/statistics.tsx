import React, { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement);

const StatisticsPage: React.FC = () => {
  const [technicianData, setTechnicianData] = useState<any>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [timePeriodData, setTimePeriodData] = useState<any>(null);
  const [visitTypeData, setVisitTypeData] = useState<any>(null);
  const [problemSolvedData, setProblemSolvedData] = useState<any>(null);
  const [itemCountData, setItemCountData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/api/statistics');
      const data = await response.json();
      setTechnicianData(data.technicianData);
      setSchoolData(data.schoolData);
      setTimePeriodData(data.timePeriodData);
      setVisitTypeData(data.visitTypeData);
      setProblemSolvedData(data.problemSolvedData);
      setItemCountData(data.itemCountData);
    };

    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Estatísticas de Ordens de Serviço</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {technicianData && (
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-2 text-zinc-800">Ordens de Serviço por Técnico</h2>
            <Bar data={technicianData} />
          </div>
        )}
        {schoolData && (
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl text-zinc-800 font-semibold mb-2">Escolas Mais Visitadas</h2>
            <Bar data={schoolData} />
          </div>
        )}
        {timePeriodData && (
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold text-zinc-800 mb-2">Ordens de Serviço por Período de Tempo</h2>
            <Line data={timePeriodData} />
          </div>
        )}
        {visitTypeData && (
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-2 text-zinc-800">Tipos de Visita</h2>
            <Bar data={visitTypeData} />
          </div>
        )}
        {problemSolvedData && (
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-2 text-zinc-800">Problemas Solucionados</h2>
            <Bar data={problemSolvedData} />
          </div>
        )}
        {itemCountData && (
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-2 text-zinc-800">Quantidade de Itens por Escola</h2>
            <Bar data={itemCountData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsPage;