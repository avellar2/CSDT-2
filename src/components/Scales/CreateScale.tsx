import React from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Users,
  MapPin,
  Clock,
  Search,
  Plus,
  Save,
  User,
  Settings,
  ArrowRight,
} from 'lucide-react';

interface TechnicianCardProps {
  technician: { id: string; displayName: string; specialties?: string[]; experienceLevel?: string; currentAssignments?: number };
  baseTechnicians: string[];
  visitTechnicians: string[];
  offTechnicians: string[];
  isDragging?: boolean;
}

const TechnicianCard: React.FC<TechnicianCardProps> = ({
  technician,
  baseTechnicians,
  visitTechnicians,
  offTechnicians,
  isDragging = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: technician.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const allocationStatus =
    baseTechnicians.includes(technician.id) ? { label: 'Base', color: 'bg-blue-100 text-blue-800 border-blue-200' } :
    visitTechnicians.includes(technician.id) ? { label: 'Visita Técnica', color: 'bg-green-100 text-green-800 border-green-200' } :
    offTechnicians.includes(technician.id) ? { label: 'Folga', color: 'bg-gray-100 text-gray-800 border-gray-200' } :
    { label: 'Não Alocado', color: 'bg-red-100 text-red-800 border-red-200' };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <User size={16} className="text-gray-500" />
          <span className="font-medium text-gray-900 text-sm">{technician.displayName}</span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${allocationStatus.color}`}>
          {allocationStatus.label}
        </span>
      </div>
      {technician.specialties && technician.specialties.length > 0 && (
        <div className="text-xs text-gray-600 mb-1">
          <span className="font-medium">Especialidades:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {technician.specialties.map((spec, index) => (
              <span key={index} className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}
      {technician.experienceLevel && (
        <div className="text-xs text-gray-600 mb-1">
          <span className="font-medium">Nível:</span> {technician.experienceLevel}
        </div>
      )}
      {technician.currentAssignments !== undefined && (
        <div className="text-xs text-gray-600">
          <span className="font-medium">Atribuições:</span> {technician.currentAssignments}
        </div>
      )}
    </div>
  );
};

interface DropZoneProps {
  id: string;
  title: string;
  technicanIds: string[];
  color: string;
  icon: React.ReactNode;
  technicians: any[];
  baseTechnicians: string[];
  visitTechnicians: string[];
  offTechnicians: string[];
  maxCapacity?: number;
}

const DropZone: React.FC<DropZoneProps> = ({
  id,
  title,
  technicanIds,
  color,
  icon,
  technicians,
  baseTechnicians,
  visitTechnicians,
  offTechnicians,
  maxCapacity,
}) => {
  const techniciansInZone = technicians.filter((t: any) => technicanIds.includes(t.id));
  const isOverCapacity = maxCapacity && techniciansInZone.length > maxCapacity;

  const { setNodeRef, isOver } = useDroppable({ id });

  const isAvailablePool = id === 'available';

  return (
    <div
      ref={setNodeRef}
      className={`${isAvailablePool ? 'bg-transparent' : 'bg-gray-50 dark:bg-zinc-800'} rounded-xl p-4 min-h-[200px] ${isAvailablePool ? '' : 'border-2 border-dashed'} transition-colors ${
        isOverCapacity ? 'border-red-300 bg-red-50' :
        isOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' :
        isAvailablePool ? '' : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      {!isAvailablePool && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
              {techniciansInZone.length} técnico{techniciansInZone.length !== 1 ? 's' : ''}
            </span>
            {maxCapacity && (
              <span className="text-xs text-gray-500">
                Máx: {maxCapacity}
              </span>
            )}
          </div>
        </div>
      )}

      <div className={`space-y-2 ${isAvailablePool ? 'max-h-[500px] overflow-y-auto' : ''}`}>
        {techniciansInZone.map((technician: any) => (
          <TechnicianCard
            key={technician.id}
            technician={technician}
            baseTechnicians={baseTechnicians}
            visitTechnicians={visitTechnicians}
            offTechnicians={offTechnicians}
          />
        ))}
        {techniciansInZone.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {isAvailablePool ? 'Todos os técnicos foram alocados' : 'Arraste técnicos aqui'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface CreateScaleProps {
  technicians: any[];
  schools: any[];
  selectedSchools: any[];
  searchText: string;
  setSearchText: (v: string) => void;
  schoolDemands: { [key: string]: string };
  baseTechnicians: string[];
  visitTechnicians: string[];
  offTechnicians: string[];
  availableTechnicians: string[];
  filteredSchools: any[];
  searchLoading: boolean;
  demandAnalysis: { [key: string]: any };
  showSmartSuggestions: boolean;
  capacityWarnings: string[];
  templates: any[];
  templateName: string;
  setTemplateName: (v: string) => void;
  showTemplateModal: boolean;
  setShowTemplateModal: (v: boolean) => void;
  draggedTechnician: any;
  handleDragStart: (event: any) => void;
  handleDragEnd: (event: any) => void;
  handleSelectSchool: (school: any) => Promise<void>;
  handleRemoveSchool: (schoolId: string) => void;
  handleDemandChange: (schoolId: string, demand: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  saveTemplate: () => void;
  loadTemplate: (template: any) => void;
  deleteTemplate: (templateId: string) => void;
}

const CreateScale: React.FC<CreateScaleProps> = ({
  technicians,
  schools,
  selectedSchools,
  searchText,
  setSearchText,
  schoolDemands,
  baseTechnicians,
  visitTechnicians,
  offTechnicians,
  availableTechnicians,
  filteredSchools,
  searchLoading,
  demandAnalysis,
  showSmartSuggestions,
  capacityWarnings,
  templates,
  templateName,
  setTemplateName,
  showTemplateModal,
  setShowTemplateModal,
  draggedTechnician,
  handleDragStart,
  handleDragEnd,
  handleSelectSchool,
  handleRemoveSchool,
  handleDemandChange,
  handleSubmit,
  saveTemplate,
  loadTemplate,
  deleteTemplate,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Technicians Pool */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={20} />
                Técnicos Não Alocados
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                availableTechnicians.length === 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {availableTechnicians.length}
              </span>
            </div>

            <SortableContext
              items={availableTechnicians}
              strategy={verticalListSortingStrategy}
            >
              <DropZone
                id="available"
                title="Disponíveis"
                technicanIds={availableTechnicians}
                color="bg-gray-100 text-gray-800"
                icon={<Users size={20} />}
                technicians={technicians}
                baseTechnicians={baseTechnicians}
                visitTechnicians={visitTechnicians}
                offTechnicians={offTechnicians}
              />
            </SortableContext>
          </div>

          {/* Templates Section */}
          <div className="mt-6 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Save size={20} />
                Templates
              </h3>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            {templates.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhum template salvo
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {templates.map((template: any) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-zinc-700 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {template.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(template.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => loadTemplate(template)}
                        className="p-1 text-blue-500 hover:text-blue-700"
                        title="Carregar template"
                      >
                        <ArrowRight size={14} />
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="Excluir template"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assignment Areas */}
        <div className="xl:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DropZone
              id="base"
              title="Base"
              technicanIds={baseTechnicians}
              color="bg-blue-100 text-blue-800"
              icon={<Users size={20} />}
              technicians={technicians}
              baseTechnicians={baseTechnicians}
              visitTechnicians={visitTechnicians}
              offTechnicians={offTechnicians}
            />
            <DropZone
              id="visit"
              title="Visita Técnica"
              technicanIds={visitTechnicians}
              color="bg-green-100 text-green-800"
              icon={<MapPin size={20} />}
              technicians={technicians}
              baseTechnicians={baseTechnicians}
              visitTechnicians={visitTechnicians}
              offTechnicians={offTechnicians}
              maxCapacity={6}
            />
            <DropZone
              id="off"
              title="Folga"
              technicanIds={offTechnicians}
              color="bg-gray-100 text-gray-800"
              icon={<Clock size={20} />}
              technicians={technicians}
              baseTechnicians={baseTechnicians}
              visitTechnicians={visitTechnicians}
              offTechnicians={offTechnicians}
            />
          </div>

          {/* Schools Selection */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Escolas para Visita Técnica
            </h3>

            {/* School Search */}
            <div className="relative mb-6">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Pesquisar escolas..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Search Results */}
            {searchText && (
              <div className="mb-6 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg max-h-60 overflow-y-auto shadow-lg">
                {searchLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : filteredSchools.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Nenhuma escola encontrada
                  </div>
                ) : (
                  filteredSchools.map((school: any) => (
                    <button
                      key={school.id}
                      onClick={() => handleSelectSchool(school)}
                      className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-zinc-600 transition-colors border-b border-gray-100 dark:border-zinc-600 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">{school.name}</p>
                      {school.district && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{school.district}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Selected Schools */}
            {selectedSchools.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Escolas Selecionadas ({selectedSchools.length})
                </h4>
                {selectedSchools.map((school: any) => (
                  <div
                    key={school.id}
                    className="border border-gray-200 dark:border-zinc-600 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h5 className="font-semibold text-gray-900 dark:text-white">{school.name}</h5>
                        {school.district && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{school.district}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveSchool(school.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>

                    <textarea
                      value={schoolDemands[school.id] || ''}
                      onChange={(e) => handleDemandChange(school.id, e.target.value)}
                      placeholder="Descreva a demanda da escola..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                    />

                    {/* Smart Analysis Display */}
                    {showSmartSuggestions && demandAnalysis[school.id] && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Settings size={14} className="text-blue-600" />
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                            Análise Inteligente
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium text-blue-700 dark:text-blue-300">Complexidade:</span>{' '}
                            <span className={`px-1 py-0.5 rounded ${
                              demandAnalysis[school.id].complexity === 'alta' ? 'bg-red-100 text-red-700' :
                              demandAnalysis[school.id].complexity === 'media' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {demandAnalysis[school.id].complexity}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-blue-700 dark:text-blue-300">Horas estimadas:</span>{' '}
                            {demandAnalysis[school.id].estimatedHours}h
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Especialidades:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {demandAnalysis[school.id].detectedSpecialties.map((spec: string, i: number) => (
                              <span key={i} className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded text-xs">
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Capacity Warnings */}
          {capacityWarnings.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                Avisos de Capacidade
              </h4>
              <ul className="space-y-1">
                {capacityWarnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700 dark:text-yellow-200">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              Salvar Escala
            </button>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggedTechnician && (
          <div className="opacity-90">
            <TechnicianCard
              technician={draggedTechnician}
              baseTechnicians={baseTechnicians}
              visitTechnicians={visitTechnicians}
              offTechnicians={offTechnicians}
              isDragging
            />
          </div>
        )}
      </DragOverlay>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-md mx-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Salvar Template
            </h2>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nome do template..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={saveTemplate}
                disabled={!templateName.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg transition-colors"
              >
                <Save size={16} className="inline mr-2" />
                Salvar
              </button>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setTemplateName("");
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
};

export default CreateScale;
