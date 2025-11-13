import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChartBar, 
  ChartPie, 
  TrendUp, 
  Clock,
  Warning,
  Calendar,
  Buildings,
  Laptop
} from 'phosphor-react';

interface Item {
  id: number;
  name: string;
  brand: string;
  serialNumber: string;
  createdAt: string;
  inep: string;
  Profile: {
    displayName: string;
    userId: string;
  };
  School: {
    name: string;
  };
}

interface DashboardProps {
  items: Item[];
  schools: any[];
}

const Dashboard: React.FC<DashboardProps> = ({ items, schools }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeChart, setActiveChart] = useState<'distribution' | 'timeline' | 'categories' | 'maintenance'>('distribution');

  // Cores para os gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  // Cálculo das métricas principais
  const metrics = useMemo(() => {
    const total = items.length;
    const inCSDT = items.filter(item => item.School?.name === 'CSDT').length;
    const inCHADA = items.filter(item => item.School?.name === 'CHADA').length;
    const inSchools = total - inCSDT - inCHADA;
    
    const categories = {
      COMPUTADOR: items.filter(item => item.name.toUpperCase().includes('COMPUTADOR')).length,
      NOTEBOOK: items.filter(item => item.name.toUpperCase().includes('NOTEBOOK')).length,
      MONITOR: items.filter(item => item.name.toUpperCase().includes('MONITOR')).length,
      MOUSE: items.filter(item => item.name.toUpperCase().includes('MOUSE')).length,
      TECLADO: items.filter(item => item.name.toUpperCase().includes('TECLADO')).length,
      ESTABILIZADOR: items.filter(item => item.name.toUpperCase().includes('ESTABILIZADOR')).length,
      IMPRESSORA: items.filter(item => item.name.toUpperCase().includes('IMPRESSORA')).length,
    };

    return {
      total,
      inCSDT,
      inCHADA,
      inSchools,
      categories,
      maintenanceRate: total > 0 ? ((inCHADA / total) * 100).toFixed(1) : '0',
      deploymentRate: total > 0 ? ((inSchools / total) * 100).toFixed(1) : '0'
    };
  }, [items]);

  // Dados para gráfico de distribuição por escola
  const schoolDistribution = useMemo(() => {
    const distribution = schools.map(school => {
      const count = items.filter(item => item.School?.name === school.name).length;
      return {
        name: school.name === 'CSDT' ? 'CSDT (Depósito)' : school.name,
        value: count,
        percentage: items.length > 0 ? ((count / items.length) * 100).toFixed(1) : '0'
      };
    }).filter(school => school.value > 0)
     .sort((a, b) => b.value - a.value);

    return distribution;
  }, [items, schools]);

  // Dados para gráfico de categorias
  const categoryData = useMemo(() => {
    return Object.entries(metrics.categories).map(([category, count]) => ({
      name: category,
      value: count,
      percentage: items.length > 0 ? ((count / items.length) * 100).toFixed(1) : '0'
    })).filter(cat => cat.value > 0);
  }, [metrics.categories, items.length]);

  // Timeline de criação de equipamentos
  const timelineData = useMemo(() => {
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : selectedPeriod === '90d' ? 90 : 365;
    const timeline: Array<{
      date: string;
      fullDate: string;
      items: number;
      accumulated: number;
    }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const itemsCreated = items.filter(item => {
        const itemDate = parseISO(item.createdAt);
        return itemDate >= dayStart && itemDate <= dayEnd;
      }).length;

      timeline.push({
        date: format(date, 'dd/MM', { locale: ptBR }),
        fullDate: format(date, 'dd/MM/yyyy', { locale: ptBR }),
        items: itemsCreated,
        accumulated: timeline.reduce((acc, curr) => acc + curr.items, 0) + itemsCreated
      });
    }

    return timeline;
  }, [items, selectedPeriod]);

  // Equipamentos que precisam de atenção
  const alertsData = useMemo(() => {
    const chadaItems = items.filter(item => item.School?.name === 'CHADA');
    const oldItems = items.filter(item => {
      const createdDate = parseISO(item.createdAt);
      const sixMonthsAgo = subDays(new Date(), 180);
      return createdDate < sixMonthsAgo;
    });

    const schoolsWithManyItems = schoolDistribution
      .filter(school => school.value > 50 && school.name !== 'CSDT (Depósito)')
      .slice(0, 3);

    return {
      maintenance: chadaItems.length,
      oldEquipments: oldItems.length,
      overloadedSchools: schoolsWithManyItems.length
    };
  }, [items, schoolDistribution]);

  const renderActiveChart = () => {
    switch (activeChart) {
      case 'distribution':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={schoolDistribution.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: any, name: any) => [
                  `${value} equipamentos (${schoolDistribution.find(s => s.value === value)?.percentage}%)`,
                  'Quantidade'
                ]}
              />
              <Bar dataKey="value" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'categories':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${value} equipamentos`, 'Quantidade']} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'timeline':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: any, name: any) => [
                  `${value} equipamentos`,
                  name === 'items' ? 'Criados no dia' : 'Total acumulado'
                ]}
                labelFormatter={(label) => `Data: ${timelineData.find(d => d.date === label)?.fullDate}`}
              />
              <Area 
                type="monotone" 
                dataKey="accumulated" 
                stackId="1" 
                stroke="#0088FE" 
                fill="#0088FE" 
                fillOpacity={0.6}
                name="accumulated"
              />
              <Bar dataKey="items" fill="#00C49F" name="items" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'maintenance':
        const maintenanceData = [
          { name: 'Em Operação', value: metrics.inSchools + metrics.inCSDT, color: '#00C49F' },
          { name: 'Manutenção (CHADA)', value: metrics.inCHADA, color: '#FF8042' }
        ];
        
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={maintenanceData}
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(1)}%)`}
              >
                {maintenanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${value} equipamentos`, 'Quantidade']} />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total de Equipamentos</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{metrics.total}</p>
            </div>
            <Laptop size={32} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Em Escolas</p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                {metrics.inSchools} ({metrics.deploymentRate}%)
              </p>
            </div>
            <Buildings size={32} className="text-green-500" />
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">No CSDT</p>
              <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">{metrics.inCSDT}</p>
            </div>
            <Calendar size={32} className="text-yellow-500" />
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Manutenção</p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-300">
                {metrics.inCHADA} ({metrics.maintenanceRate}%)
              </p>
            </div>
            <Warning size={32} className="text-red-500" />
          </div>
        </div>
      </div>

      {/* Alertas e notificações */}
      {(alertsData.maintenance > 0 || alertsData.oldEquipments > 0 || alertsData.overloadedSchools > 0) && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-2">
            <Warning size={20} />
            Alertas do Sistema
          </h3>
          <div className="space-y-2 text-sm">
            {alertsData.maintenance > 0 && (
              <p className="text-orange-700 dark:text-orange-300">
                🔧 <strong>{alertsData.maintenance} equipamentos</strong> estão na CHADA para manutenção
              </p>
            )}
            {alertsData.oldEquipments > 0 && (
              <p className="text-orange-700 dark:text-orange-300">
                📅 <strong>{alertsData.oldEquipments} equipamentos</strong> foram cadastrados há mais de 6 meses
              </p>
            )}
            {alertsData.overloadedSchools > 0 && (
              <p className="text-orange-700 dark:text-orange-300">
                🏫 <strong>{alertsData.overloadedSchools} escolas</strong> possuem mais de 50 equipamentos
              </p>
            )}
          </div>
        </div>
      )}

      {/* Controles do dashboard */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Analytics Dashboard</h2>
          
          <div className="flex gap-2 flex-wrap">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 dark:text-white"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="1y">Último ano</option>
            </select>
          </div>
        </div>

        {/* Botões de navegação dos gráficos */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setActiveChart('distribution')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeChart === 'distribution'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
            }`}
          >
            <ChartBar size={16} className="inline mr-1" />
            Distribuição por Escola
          </button>
          
          <button
            onClick={() => setActiveChart('categories')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeChart === 'categories'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
            }`}
          >
            <ChartPie size={16} className="inline mr-1" />
            Categorias
          </button>
          
          <button
            onClick={() => setActiveChart('timeline')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeChart === 'timeline'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
            }`}
          >
            <TrendUp size={16} className="inline mr-1" />
            Timeline
          </button>
          
          <button
            onClick={() => setActiveChart('maintenance')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeChart === 'maintenance'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
            }`}
          >
            <Clock size={16} className="inline mr-1" />
            Status Operacional
          </button>
        </div>

        {/* Gráfico ativo */}
        <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
          {renderActiveChart()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;