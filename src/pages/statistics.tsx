import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const StatisticsPage: React.FC = () => {
  const [type, setType] = useState<"internalOs" | "osAssinadas">("internalOs"); // Tipo selecionado
  const [technicianData, setTechnicianData] = useState<any>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [problemData, setProblemData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/statistics?type=${type}`);
        const data = await response.json();
        setTechnicianData({
          labels: data.technicianData.map((item: any) => item.label),
          datasets: [
            {
              label: "Ordens de Serviço por Técnico",
              data: data.technicianData.map((item: any) => item.value),
              backgroundColor: "rgba(75, 192, 192, 0.6)",
            },
          ],
        });
        setSchoolData({
          labels: data.schoolData.map((item: any) => item.label),
          datasets: [
            {
              label: "Escolas Mais Visitadas",
              data: data.schoolData.map((item: any) => item.value),
              backgroundColor: "rgba(153, 102, 255, 0.6)",
            },
          ],
        });
setProblemData({
          labels: data.problemData.map((item: any) => item.label),
          datasets: [
            {
              label: "Problemas Mais Comuns",
              data: data.problemData.map((item: any) => item.value),
              backgroundColor: "rgba(255, 99, 132, 0.6)",
            },
          ],
        });
        setProblemData({
          labels: data.problemData.map((item: any) => item.label),
          datasets: [
            {
              label: "Problemas Mais Comuns",
              data: data.problemData.map((item: any) => item.value),
              backgroundColor: "rgba(255, 99, 132, 0.6)",
            },
          ],
        });
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
      }
    };

    fetchData();
  }, [type]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Estatísticas de Ordens de Serviço
      </h1>

      {/* Seletor de Tipo */}
      <div className="mb-6">
        <button
          onClick={() => setType("internalOs")}
          className={`px-4 py-2 mr-2 rounded ${
            type === "internalOs" ? "bg-blue-500 text-white" : "bg-gray-300"
          }`}
        >
          OS Internas
        </button>
        <button
          onClick={() => setType("osAssinadas")}
          className={`px-4 py-2 rounded ${
            type === "osAssinadas" ? "bg-blue-500 text-white" : "bg-gray-300"
          }`}
        >
          OS Assinadas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {technicianData && (
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-2 text-zinc-800">
              Ordens de Serviço por Técnico
            </h2>
            <Bar data={technicianData} />
          </div>
        )}
        {schoolData && (
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl text-zinc-800 font-semibold mb-2">
              Escolas Mais Visitadas
            </h2>
            <Bar data={schoolData} />
          </div>
        )}
        {problemData && (
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-2 text-zinc-800">
              Problemas Mais Comuns
            </h2>
            <Bar data={problemData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsPage;
