import React from 'react';
import {
  Users,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface ScaleDashboardProps {
  technicians: any[];
  baseTechnicians: string[];
  visitTechnicians: string[];
  offTechnicians: string[];
  availableTechnicians: string[];
}

const ScaleDashboard: React.FC<ScaleDashboardProps> = ({
  technicians,
  baseTechnicians,
  visitTechnicians,
  offTechnicians,
  availableTechnicians,
}) => {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Dashboard de Técnicos
      </h3>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total Técnicos</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{technicians.length}</p>
            </div>
            <Users size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 dark:text-green-400 text-sm font-medium">Em Base</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {baseTechnicians.length}
              </p>
            </div>
            <Users size={24} className="text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Visita Técnica</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {visitTechnicians.length}
              </p>
            </div>
            <MapPin size={24} className="text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">De Folga</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {offTechnicians.length}
              </p>
            </div>
            <Clock size={24} className="text-gray-600 dark:text-gray-400" />
          </div>
        </div>

        <div className={`rounded-lg p-4 ${
          availableTechnicians.length === 0
            ? 'bg-green-50 dark:bg-green-900/20'
            : 'bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                availableTechnicians.length === 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>Não Alocados</p>
              <p className={`text-2xl font-bold ${
                availableTechnicians.length === 0
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {availableTechnicians.length}
              </p>
            </div>
            {availableTechnicians.length === 0 ? (
              <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
            )}
          </div>
        </div>
      </div>

      {/* Technicians List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {technicians.map((technician: any) => (
          <div key={technician.id} className="border border-gray-200 dark:border-zinc-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900 dark:text-white">{technician.displayName}</h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                baseTechnicians.includes(technician.id) ? 'bg-blue-100 text-blue-800' :
                visitTechnicians.includes(technician.id) ? 'bg-green-100 text-green-800' :
                offTechnicians.includes(technician.id) ? 'bg-gray-100 text-gray-800' :
                'bg-red-100 text-red-800'
              }`}>
                {baseTechnicians.includes(technician.id) ? 'Base' :
                 visitTechnicians.includes(technician.id) ? 'Visita Técnica' :
                 offTechnicians.includes(technician.id) ? 'Folga' : 'Não Alocado'}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <div>
                <span className="font-medium">Especialidades:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {technician.specialties?.map((spec: string, index: number) => (
                    <span key={index} className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                      {spec}
                    </span>
                  )) || <span className="text-gray-500">Nenhuma</span>}
                </div>
              </div>
              <p><span className="font-medium">Nível:</span> {technician.experienceLevel || 'N/A'}</p>
              <p><span className="font-medium">Capacidade:</span> {technician.maxCapacity || 'N/A'} escolas</p>
              <p><span className="font-medium">Atribuições:</span> {technician.currentAssignments || 0}</p>
              <p><span className="font-medium">Status:</span> {
                baseTechnicians.includes(technician.id) ? 'Alocado em Base' :
                visitTechnicians.includes(technician.id) ? 'Alocado em Visita Técnica' :
                offTechnicians.includes(technician.id) ? 'Alocado em Folga' : 'NÃO ALOCADO'
              }</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScaleDashboard;
