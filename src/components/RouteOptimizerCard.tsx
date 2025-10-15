import React, { useState, useEffect } from 'react';
import { Route, Clock, MapPin, Users, TrendingDown } from 'lucide-react';
import { useRouter } from 'next/router';

interface RouteStats {
  totalRoutes: number;
  totalDistance: number;
  totalTime: number;
  averageEfficiency: number;
}

const RouteOptimizerCard: React.FC = () => {
  const router = useRouter();
  const [stats, setStats] = useState<RouteStats>({
    totalRoutes: 0,
    totalDistance: 0,
    totalTime: 0,
    averageEfficiency: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRouteStats();
  }, []);

  const fetchRouteStats = async () => {
    try {
      // Simula dados por enquanto - depois conectar com API real
      setStats({
        totalRoutes: 15,
        totalDistance: 245.8,
        totalTime: 1240,
        averageEfficiency: 23.5
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas de rota:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Route className="mr-2 text-blue-500" size={20} />
          Otimização de Rotas
        </h3>
        <button
          onClick={() => router.push('/route-optimizer')}
          className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition-colors"
        >
          Abrir
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Users className="mr-1 text-gray-500" size={16} />
            <span className="text-2xl font-bold text-blue-600">{stats.totalRoutes}</span>
          </div>
          <p className="text-xs text-gray-500">Rotas este mês</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <MapPin className="mr-1 text-gray-500" size={16} />
            <span className="text-2xl font-bold text-green-600">{stats.totalDistance.toFixed(0)}</span>
          </div>
          <p className="text-xs text-gray-500">Km otimizados</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="flex items-center text-gray-600">
            <Clock className="mr-1" size={14} />
            Tempo economizado
          </span>
          <span className="font-semibold text-green-600">
            {Math.floor(stats.totalTime / 60)}h {stats.totalTime % 60}min
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="flex items-center text-gray-600">
            <TrendingDown className="mr-1" size={14} />
            Eficiência média
          </span>
          <span className="font-semibold text-blue-600">
            +{stats.averageEfficiency.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Próxima otimização</span>
          <span>Amanhã, 08:00</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
          <div className="bg-blue-500 h-1 rounded-full" style={{ width: '75%' }}></div>
        </div>
      </div>
    </div>
  );
};

export default RouteOptimizerCard;