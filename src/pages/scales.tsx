import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
} from 'chart.js';
import {
  Users,
  MapPin,
  Clock,
  Calendar,
  BarChart3,
  Plus,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Wrench,
  Route,
} from "lucide-react";
import QuickRoutes from '@/components/QuickRoutes';
import { useScales } from '@/hooks/useScales';
import CreateScale from '@/components/Scales/CreateScale';
import ScaleDashboard from '@/components/Scales/ScaleDashboard';
import ScaleHistory from '@/components/Scales/ScaleHistory';
import ScaleAnalytics from '@/components/Scales/ScaleAnalytics';
import ScaleAgenda from '@/components/Scales/ScaleAgenda';
import ScaleTickets from '@/components/Scales/ScaleTickets';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Scales: React.FC = () => {
  const ctx = useScales();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 shadow-sm border-b border-gray-200 dark:border-zinc-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gerenciamento de Escalas
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Organize técnicos e crie escalas de trabalho
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-700 rounded-lg p-1">
              {[
                { id: 'create', label: 'Criar Escala', icon: <Plus size={16} /> },
                { id: 'routes', label: 'Rotas Rápidas', icon: <Route size={16} />, action: 'modal' },
                { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
                { id: 'history', label: 'Histórico', icon: <Clock size={16} /> },
                { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={16} /> },
                { id: 'agenda', label: 'Agenda', icon: <Calendar size={16} /> },
                { id: 'tickets', label: 'Chamados', icon: <Wrench size={16} /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.action === 'modal' && tab.id === 'routes') {
                      ctx.setShowQuickRoutes(true);
                    } else {
                      ctx.setActiveView(tab.id as any);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                    ctx.activeView === tab.id
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {ctx.loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : ctx.activeView === 'create' ? (
          <CreateScale
            technicians={ctx.technicians}
            schools={ctx.schools}
            selectedSchools={ctx.selectedSchools}
            searchText={ctx.searchText}
            setSearchText={ctx.setSearchText}
            schoolDemands={ctx.schoolDemands}
            baseTechnicians={ctx.baseTechnicians}
            visitTechnicians={ctx.visitTechnicians}
            offTechnicians={ctx.offTechnicians}
            availableTechnicians={ctx.availableTechnicians}
            filteredSchools={ctx.filteredSchools}
            searchLoading={ctx.searchLoading}
            demandAnalysis={ctx.demandAnalysis}
            showSmartSuggestions={ctx.showSmartSuggestions}
            capacityWarnings={ctx.capacityWarnings}
            templates={ctx.templates}
            templateName={ctx.templateName}
            setTemplateName={ctx.setTemplateName}
            showTemplateModal={ctx.showTemplateModal}
            setShowTemplateModal={ctx.setShowTemplateModal}
            draggedTechnician={ctx.draggedTechnician}
            handleDragStart={ctx.handleDragStart}
            handleDragEnd={ctx.handleDragEnd}
            handleSelectSchool={ctx.handleSelectSchool}
            handleRemoveSchool={ctx.handleRemoveSchool}
            handleDemandChange={ctx.handleDemandChange}
            handleSubmit={ctx.handleSubmit}
            saveTemplate={ctx.saveTemplate}
            loadTemplate={ctx.loadTemplate}
            deleteTemplate={ctx.deleteTemplate}
          />
        ) : ctx.activeView === 'dashboard' ? (
          <ScaleDashboard
            technicians={ctx.technicians}
            baseTechnicians={ctx.baseTechnicians}
            visitTechnicians={ctx.visitTechnicians}
            offTechnicians={ctx.offTechnicians}
            availableTechnicians={ctx.availableTechnicians}
          />
        ) : ctx.activeView === 'history' ? (
          <ScaleHistory
            scaleHistory={ctx.scaleHistory}
            loadingHistory={ctx.loadingHistory}
            selectedHistoryScale={ctx.selectedHistoryScale}
            setSelectedHistoryScale={ctx.setSelectedHistoryScale}
            historyDateFilter={ctx.historyDateFilter}
            setHistoryDateFilter={ctx.setHistoryDateFilter}
            parseLocalDate={ctx.parseLocalDate}
            fetchScaleHistory={ctx.fetchScaleHistory}
          />
        ) : ctx.activeView === 'analytics' ? (
          <ScaleAnalytics
            analyticsData={ctx.analyticsData}
            loadingAnalytics={ctx.loadingAnalytics}
            schoolVisitsData={ctx.schoolVisitsData}
            loadingSchoolVisits={ctx.loadingSchoolVisits}
          />
        ) : ctx.activeView === 'agenda' ? (
          <ScaleAgenda
            events={ctx.events}
            calendars={ctx.calendars}
            onEventCreate={ctx.handleEventCreate}
            onEventUpdate={ctx.handleEventUpdate}
            onEventDelete={ctx.handleEventDelete}
            onCalendarCreate={ctx.handleCalendarCreate}
            onCalendarUpdate={ctx.handleCalendarUpdate}
            onCalendarToggle={ctx.handleCalendarToggle}
          />
        ) : ctx.activeView === 'tickets' ? (
          <ScaleTickets
            technicalTickets={ctx.technicalTickets}
            chamadosEscala={ctx.chamadosEscala}
            loadingTickets={ctx.loadingTickets}
            ticketStats={ctx.ticketStats}
            selectedTicket={ctx.selectedTicket}
            setSelectedTicket={ctx.setSelectedTicket}
            showTicketModal={ctx.showTicketModal}
            setShowTicketModal={ctx.setShowTicketModal}
            ticketFilter={ctx.ticketFilter}
            setTicketFilter={ctx.setTicketFilter}
            ticketSearchTerm={ctx.ticketSearchTerm}
            setTicketSearchTerm={ctx.setTicketSearchTerm}
            showDeleteModal={ctx.showDeleteModal}
            setShowDeleteModal={ctx.setShowDeleteModal}
            ticketToDelete={ctx.ticketToDelete}
            setTicketToDelete={ctx.setTicketToDelete}
            deletionReason={ctx.deletionReason}
            setDeletionReason={ctx.setDeletionReason}
            currentUser={ctx.currentUser}
            loadingUser={ctx.loadingUser}
            schedulePriority={ctx.schedulePriority}
            setSchedulePriority={ctx.setSchedulePriority}
            scheduleDate={ctx.scheduleDate}
            setScheduleDate={ctx.setScheduleDate}
            scheduleTime={ctx.scheduleTime}
            setScheduleTime={ctx.setScheduleTime}
            scheduleNotes={ctx.scheduleNotes}
            setScheduleNotes={ctx.setScheduleNotes}
            scheduling={ctx.scheduling}
            setScheduling={ctx.setScheduling}
            showScheduleModal={ctx.showScheduleModal}
            setShowScheduleModal={ctx.setShowScheduleModal}
            scheduleTicketId={ctx.scheduleTicketId}
            setScheduleTicketId={ctx.setScheduleTicketId}
            scheduleSchool={ctx.scheduleSchool}
            setScheduleSchool={ctx.setScheduleSchool}
            scheduleTitle={ctx.scheduleTitle}
            setScheduleTitle={ctx.setScheduleTitle}
            scheduleDescription={ctx.scheduleDescription}
            setScheduleDescription={ctx.setScheduleDescription}
            handleScheduleTicket={ctx.handleScheduleTicket}
            handleDeleteTicket={ctx.handleDeleteTicket}
            fetchChamadosEscala={ctx.fetchChamadosEscala}
            fetchTechnicalTickets={ctx.fetchTechnicalTickets}
          />
        ) : null}
      </div>

      {/* Shared Modal System (conflicts/success/error) */}
      {ctx.showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-2xl mx-auto p-8 max-h-[90vh] overflow-y-auto">
            {ctx.successMessage ? (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-600 mb-4">Sucesso!</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-6 text-center text-lg">{ctx.successMessage}</p>
                <button
                  onClick={ctx.handleCloseModal}
                  className="w-full bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition duration-300 text-lg font-medium"
                >
                  Fechar
                </button>
              </>
            ) : ctx.errorMessage ? (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-red-600 mb-2">{ctx.errorMessage.title}</h2>
                </div>

                {ctx.errorMessage.schoolName && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-red-800 dark:text-red-300 mb-4 text-lg">
                      📍 Escola Selecionada:
                    </h3>
                    <p className="text-red-700 dark:text-red-200 text-base mb-4 break-words font-medium">
                      {ctx.errorMessage.schoolName}
                    </p>

                    {ctx.errorMessage.totalPending > 0 && (
                      <div className="bg-white dark:bg-red-800/30 rounded-md p-4 border border-red-200 dark:border-red-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-red-800 dark:text-red-300 text-lg">📋 OS Pendentes:</span>
                          <span className="bg-red-100 dark:bg-red-700 text-red-800 dark:text-red-100 px-3 py-2 rounded-full text-base font-bold">
                            {ctx.errorMessage.totalPending}
                          </span>
                        </div>
                        {ctx.errorMessage.details && (
                          <p className="text-red-600 dark:text-red-200 text-base font-medium">{ctx.errorMessage.details}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-5 mb-6">
                  <div className="flex items-start">
                    <AlertTriangle className="h-6 w-6 text-yellow-400 mt-1 mr-3" />
                    <div>
                      <h4 className="text-yellow-800 dark:text-yellow-300 font-semibold text-lg mb-2">Ação Necessária:</h4>
                      <p className="text-yellow-700 dark:text-yellow-200 text-base font-medium">{ctx.errorMessage.instruction}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={ctx.handleCloseModal}
                  className="w-full bg-red-500 text-white py-4 px-6 rounded-lg hover:bg-red-600 transition duration-300 font-semibold text-lg"
                >
                  Entendi
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-red-600 mb-4">Erros na Escala</h2>
                </div>

                <div className="space-y-6">
                  {ctx.conflictingTechnicians.some((t) => t.categories[0].includes("Alocado em")) && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-5">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-3">
                        ⚠️ Conflitos de Alocação:
                      </h3>
                      <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                        {ctx.conflictingTechnicians
                          .filter((t) => t.categories[0].includes("Alocado em"))
                          .map((tech, index) => (
                            <li key={index} className="text-base">
                              <span className="font-medium">{tech.name}</span> - {tech.categories[0]}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {ctx.conflictingTechnicians.some((t) => t.categories[0].includes("Não está")) && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-5">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-3">
                        📋 Técnicos Não Alocados:
                      </h3>
                      <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                        {ctx.conflictingTechnicians
                          .filter((t) => t.categories[0].includes("Não está"))
                          .map((tech, index) => (
                            <li key={index} className="text-base">
                              <span className="font-medium">{tech.name}</span> - {tech.categories[0]}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>

                <button
                  onClick={ctx.handleCloseModal}
                  className="w-full mt-6 bg-red-500 text-white py-4 px-6 rounded-lg hover:bg-red-600 transition duration-300 font-semibold text-lg"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quick Routes Modal */}
      {ctx.showQuickRoutes && (
        <QuickRoutes
          technicians={ctx.visitTechnicians.map(id => ({
            id,
            name: ctx.technicians.find(t => t.id === id)?.displayName || `Técnico ${id}`,
            technicianId: parseInt(id) || 0
          }))}
          onClose={() => ctx.setShowQuickRoutes(false)}
        />
      )}
    </div>
  );
};

export default Scales;

export const getServerSideProps = async () => ({ props: {} });
