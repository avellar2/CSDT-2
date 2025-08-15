import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Bell, 
  Warning, 
  Clock, 
  TrendUp, 
  X,
  Eye,
  EyeSlash,
  Gear,
  Archive,
  Buildings,
  Wrench
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

interface Alert {
  id: string;
  type: 'maintenance' | 'inactive' | 'overloaded' | 'old_equipment';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  count: number;
  data: any;
  createdAt: Date;
  acknowledged: boolean;
}

interface AlertSystemProps {
  items: Item[];
  schools: any[];
}

const AlertSystem: React.FC<AlertSystemProps> = ({ items, schools }) => {
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    maintenanceThreshold: 30, // dias
    inactivityThreshold: 90, // dias sem movimentação
    overloadThreshold: 50, // equipamentos por escola
    oldEquipmentThreshold: 365 // dias desde cadastro
  });
  const [showOnlyUnacknowledged, setShowOnlyUnacknowledged] = useState(false);

  // Carregar configurações e alertas acknowleged do localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('alertSettings');
    if (savedSettings) {
      try {
        setAlertSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Erro ao carregar configurações de alertas:', error);
      }
    }

    const savedAcknowledged = localStorage.getItem('acknowledgedAlerts');
    if (savedAcknowledged) {
      try {
        setAcknowledgedAlerts(new Set(JSON.parse(savedAcknowledged)));
      } catch (error) {
        console.error('Erro ao carregar alertas confirmados:', error);
      }
    }
  }, []);

  // Salvar configurações
  const saveSettings = () => {
    localStorage.setItem('alertSettings', JSON.stringify(alertSettings));
    setShowSettings(false);
  };

  // Gerar alertas baseados nos dados
  const alerts = useMemo<Alert[]>(() => {
    const generatedAlerts: Alert[] = [];
    const now = new Date();

    // 1. Equipamentos em manutenção há muito tempo
    const longMaintenanceItems = items.filter(item => {
      if (item.School?.name !== 'CHADA') return false;
      const daysSinceCreated = differenceInDays(now, parseISO(item.createdAt));
      return daysSinceCreated > alertSettings.maintenanceThreshold;
    });

    if (longMaintenanceItems.length > 0) {
      generatedAlerts.push({
        id: 'long-maintenance',
        type: 'maintenance',
        severity: longMaintenanceItems.length > 10 ? 'critical' : longMaintenanceItems.length > 5 ? 'high' : 'medium',
        title: 'Equipamentos em Manutenção Prolongada',
        message: `${longMaintenanceItems.length} equipamentos estão na CHADA há mais de ${alertSettings.maintenanceThreshold} dias`,
        count: longMaintenanceItems.length,
        data: longMaintenanceItems,
        createdAt: now,
        acknowledged: acknowledgedAlerts.has('long-maintenance')
      });
    }

    // 2. Equipamentos muito antigos (sem movimentação)
    const oldItems = items.filter(item => {
      const daysSinceCreated = differenceInDays(now, parseISO(item.createdAt));
      return daysSinceCreated > alertSettings.oldEquipmentThreshold;
    });

    if (oldItems.length > 0) {
      generatedAlerts.push({
        id: 'old-equipment',
        type: 'old_equipment',
        severity: oldItems.length > 50 ? 'high' : 'medium',
        title: 'Equipamentos Antigos sem Movimentação',
        message: `${oldItems.length} equipamentos foram cadastrados há mais de ${alertSettings.oldEquipmentThreshold} dias`,
        count: oldItems.length,
        data: oldItems,
        createdAt: now,
        acknowledged: acknowledgedAlerts.has('old-equipment')
      });
    }

    // 3. Escolas com muitos equipamentos
    const schoolCounts = schools.map(school => ({
      school: school,
      count: items.filter(item => item.School?.name === school.name).length
    })).filter(sc => sc.count > alertSettings.overloadThreshold && sc.school.name !== 'CSDT' && sc.school.name !== 'CHADA');

    if (schoolCounts.length > 0) {
      generatedAlerts.push({
        id: 'overloaded-schools',
        type: 'overloaded',
        severity: schoolCounts.some(sc => sc.count > alertSettings.overloadThreshold * 2) ? 'high' : 'medium',
        title: 'Escolas com Excesso de Equipamentos',
        message: `${schoolCounts.length} escolas possuem mais de ${alertSettings.overloadThreshold} equipamentos`,
        count: schoolCounts.length,
        data: schoolCounts,
        createdAt: now,
        acknowledged: acknowledgedAlerts.has('overloaded-schools')
      });
    }

    // 4. Equipamentos inativos (sem movimentação recente)
    // Este alerta seria mais preciso com dados de histórico de movimentação
    const recentlyCreated = items.filter(item => {
      const daysSinceCreated = differenceInDays(now, parseISO(item.createdAt));
      return daysSinceCreated < 7; // Criados nos últimos 7 dias
    });

    const inactiveAlert = recentlyCreated.length === 0 && items.length > 0;
    if (inactiveAlert) {
      generatedAlerts.push({
        id: 'no-recent-activity',
        type: 'inactive',
        severity: 'low',
        title: 'Baixa Atividade Recente',
        message: 'Nenhum equipamento foi cadastrado nos últimos 7 dias',
        count: 0,
        data: [],
        createdAt: now,
        acknowledged: acknowledgedAlerts.has('no-recent-activity')
      });
    }

    return generatedAlerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [items, schools, alertSettings, acknowledgedAlerts]);

  // Filtrar alertas
  const filteredAlerts = showOnlyUnacknowledged 
    ? alerts.filter(alert => !alert.acknowledged)
    : alerts;

  // Confirmar alerta
  const acknowledgeAlert = (alertId: string) => {
    const newAcknowledged = new Set(acknowledgedAlerts);
    newAcknowledged.add(alertId);
    setAcknowledgedAlerts(newAcknowledged);
    localStorage.setItem('acknowledgedAlerts', JSON.stringify([...newAcknowledged]));
  };

  // Desconfirmar alerta
  const unacknowledgeAlert = (alertId: string) => {
    const newAcknowledged = new Set(acknowledgedAlerts);
    newAcknowledged.delete(alertId);
    setAcknowledgedAlerts(newAcknowledged);
    localStorage.setItem('acknowledgedAlerts', JSON.stringify([...newAcknowledged]));
  };

  // Cores por severidade
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300';
      case 'high': return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300';
      case 'low': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  // Ícones por tipo
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'maintenance': return <Wrench size={20} />;
      case 'overloaded': return <Buildings size={20} />;
      case 'old_equipment': return <Archive size={20} />;
      case 'inactive': return <Clock size={20} />;
      default: return <Bell size={20} />;
    }
  };

  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;
  const criticalCount = alerts.filter(alert => alert.severity === 'critical' && !alert.acknowledged).length;

  return (
    <div className="space-y-4">
      {/* Header do Sistema de Alertas */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell size={24} className="text-blue-500" />
              {unacknowledgedCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unacknowledgedCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Sistema de Alertas
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {unacknowledgedCount === 0 ? 'Todos os alertas foram confirmados' : 
                 `${unacknowledgedCount} alertas não confirmados`}
                {criticalCount > 0 && (
                  <span className="text-red-600 font-semibold ml-2">
                    ({criticalCount} críticos)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowOnlyUnacknowledged(!showOnlyUnacknowledged)}
              className={`p-2 rounded-lg transition-colors ${
                showOnlyUnacknowledged
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-zinc-600'
              }`}
              title={showOnlyUnacknowledged ? 'Mostrar todos' : 'Mostrar apenas não confirmados'}
            >
              {showOnlyUnacknowledged ? <Eye size={20} /> : <EyeSlash size={20} />}
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
              title="Configurações de Alertas"
            >
              <Gear size={20} />
            </button>
          </div>
        </div>

        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {alerts.filter(a => a.severity === 'critical').length}
            </div>
            <div className="text-sm text-red-700 dark:text-red-300">Críticos</div>
          </div>
          
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {alerts.filter(a => a.severity === 'high').length}
            </div>
            <div className="text-sm text-orange-700 dark:text-orange-300">Alta Prioridade</div>
          </div>
          
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {alerts.filter(a => a.severity === 'medium').length}
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300">Média Prioridade</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {alerts.filter(a => a.severity === 'low').length}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Baixa Prioridade</div>
          </div>
        </div>
      </div>

      {/* Configurações */}
      {showSettings && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Configurações de Alertas
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Limite para Manutenção Prolongada (dias)
              </label>
              <input
                type="number"
                value={alertSettings.maintenanceThreshold}
                onChange={(e) => setAlertSettings(prev => ({ ...prev, maintenanceThreshold: parseInt(e.target.value) }))}
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
                min="1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Limite para Equipamento Antigo (dias)
              </label>
              <input
                type="number"
                value={alertSettings.oldEquipmentThreshold}
                onChange={(e) => setAlertSettings(prev => ({ ...prev, oldEquipmentThreshold: parseInt(e.target.value) }))}
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
                min="1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Limite de Equipamentos por Escola
              </label>
              <input
                type="number"
                value={alertSettings.overloadThreshold}
                onChange={(e) => setAlertSettings(prev => ({ ...prev, overloadThreshold: parseInt(e.target.value) }))}
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
                min="1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Limite para Inatividade (dias)
              </label>
              <input
                type="number"
                value={alertSettings.inactivityThreshold}
                onChange={(e) => setAlertSettings(prev => ({ ...prev, inactivityThreshold: parseInt(e.target.value) }))}
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
                min="1"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={saveSettings}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      )}

      {/* Lista de Alertas */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
            <Bell size={48} className="mx-auto mb-4 text-green-500 opacity-50" />
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
              {showOnlyUnacknowledged ? 'Nenhum alerta pendente' : 'Nenhum alerta ativo'}
            </h3>
            <p className="text-green-600 dark:text-green-400">
              {showOnlyUnacknowledged 
                ? 'Todos os alertas foram confirmados!'
                : 'Sistema funcionando sem problemas detectados.'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 transition-all ${getSeverityColor(alert.severity)} ${
                alert.acknowledged ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getTypeIcon(alert.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{alert.title}</h3>
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-500 text-white' :
                        alert.severity === 'high' ? 'bg-orange-500 text-white' :
                        alert.severity === 'medium' ? 'bg-yellow-500 text-black' :
                        'bg-blue-500 text-white'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      {alert.acknowledged && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          CONFIRMADO
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm mb-3">{alert.message}</p>
                    
                    {/* Detalhes específicos por tipo de alerta */}
                    {alert.type === 'overloaded' && alert.data.length > 0 && (
                      <div className="text-sm bg-white/50 dark:bg-black/20 rounded p-2">
                        <strong>Escolas com excesso:</strong>
                        <ul className="mt-1 space-y-1">
                          {alert.data.slice(0, 3).map((item: any, index: number) => (
                            <li key={index}>
                              • {item.school.name}: {item.count} equipamentos
                            </li>
                          ))}
                          {alert.data.length > 3 && (
                            <li>• ... e mais {alert.data.length - 3} escolas</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    {alert.type === 'maintenance' && alert.data.length > 0 && (
                      <div className="text-sm bg-white/50 dark:bg-black/20 rounded p-2">
                        <strong>Equipamentos em manutenção prolongada:</strong>
                        <ul className="mt-1 space-y-1">
                          {alert.data.slice(0, 3).map((item: Item, index: number) => (
                            <li key={index}>
                              • {item.name} - {item.serialNumber} ({differenceInDays(new Date(), parseISO(item.createdAt))} dias)
                            </li>
                          ))}
                          {alert.data.length > 3 && (
                            <li>• ... e mais {alert.data.length - 3} equipamentos</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    <div className="text-xs opacity-75 mt-2">
                      Detectado em {format(alert.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {alert.acknowledged ? (
                    <button
                      onClick={() => unacknowledgeAlert(alert.id)}
                      className="p-2 bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
                      title="Desmarcar como confirmado"
                    >
                      <EyeSlash size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      title="Marcar como confirmado"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertSystem;