import React from 'react';
import dynamic from 'next/dynamic';
import {
  Users,
  MapPin,
  Calendar,
  TrendingUp,
} from 'lucide-react';

const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });

interface ScaleAnalyticsProps {
  analyticsData: any;
  loadingAnalytics: boolean;
  schoolVisitsData: any;
  loadingSchoolVisits: boolean;
}

const ScaleAnalytics: React.FC<ScaleAnalyticsProps> = ({
  analyticsData,
  loadingAnalytics,
  schoolVisitsData,
  loadingSchoolVisits,
}) => {
  return (
    <div className="space-y-6">
      {loadingAnalytics ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : !analyticsData ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
          <div className="text-center py-12 text-gray-500">
            <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhum dado para análise</p>
            <p className="text-sm">Crie algumas escalas primeiro para ver os relatórios</p>
          </div>
        </div>
      ) : (
        <>
          {/* Estatísticas Gerais */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <TrendingUp size={20} />
              Estatísticas Gerais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total de Escalas</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {analyticsData.stats.totalScales}
                    </p>
                  </div>
                  <Calendar size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 dark:text-green-400 text-sm font-medium">Total Visitas Técnicas</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {analyticsData.stats.totalVisitTechnicians}
                    </p>
                  </div>
                  <Users size={24} className="text-green-600 dark:text-green-400" />
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Média Escolas/Escala</p>
                    <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                      {analyticsData.stats.avgSchoolsPerScale}
                    </p>
                  </div>
                  <MapPin size={24} className="text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Escolas Únicas</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {analyticsData.stats.totalUniqueSchools}
                    </p>
                  </div>
                  <MapPin size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Distribuição por Categoria
              </h3>
              {analyticsData.categoryDistribution.length > 0 && (
                <Line
                  data={{
                    labels: analyticsData.categoryDistribution.map((d: any) =>
                      new Date(d.date).toLocaleDateString('pt-BR')
                    ),
                    datasets: [
                      {
                        label: 'Base',
                        data: analyticsData.categoryDistribution.map((d: any) => d.base),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.3
                      },
                      {
                        label: 'Visita Técnica',
                        data: analyticsData.categoryDistribution.map((d: any) => d.visit),
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.3
                      },
                      {
                        label: 'Folga',
                        data: analyticsData.categoryDistribution.map((d: any) => d.off),
                        borderColor: 'rgb(107, 114, 128)',
                        backgroundColor: 'rgba(107, 114, 128, 0.1)',
                        tension: 0.3
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top' as const }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                      }
                    }
                  }}
                />
              )}
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Especialidades Mais Demandadas
              </h3>
              {analyticsData.topSpecialties.length > 0 && (
                <Doughnut
                  data={{
                    labels: analyticsData.topSpecialties.map((spec: any) => spec[0]),
                    datasets: [{
                      data: analyticsData.topSpecialties.map((spec: any) => spec[1]),
                      backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(156, 163, 175, 0.8)'
                      ],
                      borderWidth: 2
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'bottom' as const }
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users size={20} />
                Técnicos Mais em Visitas
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {analyticsData.topVisitTechnicians.map(([name, count]: any, index: number) => (
                  <div key={name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-amber-600' : 'bg-green-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                    </div>
                    <span className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                      {count} visitas
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin size={20} />
                Escolas Mais Demandadas
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {analyticsData.topSchools.map(([name, count]: any, index: number) => (
                  <div key={name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-amber-600' : 'bg-orange-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">{name}</span>
                    </div>
                    <span className="bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full text-sm font-medium">
                      {count} demandas
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Escolas Mais Visitadas */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin size={20} />
              Escolas Mais Visitadas (OS Realizadas)
            </h3>
            {loadingSchoolVisits ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : schoolVisitsData ? (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {schoolVisitsData.topVisitedSchools.map(([name, count]: any, index: number) => (
                  <div key={name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-amber-600' : 'bg-green-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">{name}</span>
                    </div>
                    <span className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                      {count} OS
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Erro ao carregar dados de visitas</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ScaleAnalytics;
