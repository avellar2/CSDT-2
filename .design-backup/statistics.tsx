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
import { motion } from 'framer-motion';
import {
  ChartBar,
  Users,
  GraduationCap,
  Wrench,
  TrendUp,
  Clock,
  CheckCircle
} from 'phosphor-react';

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

        // Design system colors for charts
        const chartColors = {
          primary: 'rgba(59, 130, 246, 0.8)',   // blue-500
          secondary: 'rgba(139, 92, 246, 0.8)',  // violet-500
          tertiary: 'rgba(236, 72, 153, 0.8)',   // pink-500
          quaternary: 'rgba(14, 165, 233, 0.8)', // sky-500
        };

        setTechnicianData({
          labels: data.technicianData.map((item: any) => item.label),
          datasets: [
            {
              label: "Ordens de Serviço por Técnico",
              data: data.technicianData.map((item: any) => item.value),
              backgroundColor: chartColors.primary,
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 2,
              borderRadius: 8,
            },
          ],
        });

        setSchoolData({
          labels: data.schoolData.map((item: any) => item.label),
          datasets: [
            {
              label: "Escolas Mais Visitadas",
              data: data.schoolData.map((item: any) => item.value),
              backgroundColor: chartColors.secondary,
              borderColor: 'rgb(139, 92, 246)',
              borderWidth: 2,
              borderRadius: 8,
            },
          ],
        });

        setProblemData({
          labels: data.problemData.map((item: any) => item.label),
          datasets: [
            {
              label: "Problemas Mais Comuns",
              data: data.problemData.map((item: any) => item.value),
              backgroundColor: chartColors.tertiary,
              borderColor: 'rgb(236, 72, 153)',
              borderWidth: 2,
              borderRadius: 8,
            },
          ],
        });
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
      }
    };

    fetchData();
  }, [type]);

  // Chart options for dark mode
  const getChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  });

  // Calculate totals for metric cards
  const getTotalTechnicians = () => technicianData?.datasets[0]?.data?.reduce((a: number, b: number) => a + b, 0) || 0;
  const getTotalSchools = () => schoolData?.datasets[0]?.data?.reduce((a: number, b: number) => a + b, 0) || 0;
  const getTotalProblems = () => problemData?.datasets[0]?.data?.reduce((a: number, b: number) => a + b, 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Estatísticas
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Análise e métricas do sistema
          </p>
        </motion.div>

        {/* Type Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setType("internalOs")}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                type === "internalOs"
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              OS Internas
            </button>
            <button
              onClick={() => setType("osAssinadas")}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                type === "osAssinadas"
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              OS Assinadas
            </button>
          </div>
        </motion.div>

        {/* Metric Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Técnicos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{technicianData?.labels?.length || 0}</p>
              </div>
              <Users size={32} className="text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total OS</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{getTotalTechnicians()}</p>
              </div>
              <ChartBar size={32} className="text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Escolas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{schoolData?.labels?.length || 0}</p>
              </div>
              <GraduationCap size={32} className="text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Problemas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{getTotalProblems()}</p>
              </div>
              <Wrench size={32} className="text-purple-500" />
            </div>
          </div>
        </motion.div>

        {/* Charts Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {technicianData && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="text-blue-500" size={24} />
                  Ordens de Serviço por Técnico
                </h2>
              </div>
              <div className="h-64">
                <Bar data={technicianData} options={getChartOptions()} />
              </div>
            </div>
          )}

          {schoolData && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="text-violet-500" size={24} />
                  Escolas Mais Visitadas
                </h2>
              </div>
              <div className="h-64">
                <Bar data={schoolData} options={getChartOptions()} />
              </div>
            </div>
          )}

          {problemData && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Wrench className="text-pink-500" size={24} />
                  Problemas Mais Comuns
                </h2>
              </div>
              <div className="h-64">
                <Bar data={problemData} options={getChartOptions()} />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default StatisticsPage;

export const getServerSideProps = async () => ({ props: {} });
