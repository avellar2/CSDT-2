import React from "react";
import {
  Search,
  FileDown,
  Database,
  ChartLine,
  Eye,
  FileText,
  Bell,
  File,
} from "lucide-react";
import { useDeviceList } from "@/hooks/useDeviceList";
import { SkeletonCard } from "./SkeletonCard";
import Dashboard from "./Analytics/Dashboard";
import DeviceViews from "./Views/DeviceViews";
import AdvancedFilters from "./Filters/AdvancedFilters";
import SmartGrouping from "./Grouping/SmartGrouping";
import AdvancedReports from "./Reports/AdvancedReports";
import AlertSystem from "./Alerts/AlertSystem";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import DeviceListModals from "./Device/DeviceListModals";
import DeviceListMemorandumDialog from "./Device/DeviceListMemorandumDialog";

const DeviceList: React.FC = () => {
  const hook = useDeviceList();

  if (hook.loading) {
    return (
      <div className="space-y-4 mt-24">
        {[...Array(5)].map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  const totals = hook.totals;
  const displayItems = hook.displayItems;
  const indexOfFirstItem = hook.indexOfFirstItem;
  const indexOfLastItem = hook.indexOfLastItem;

  return (
    <div className="dark:bg-zinc-950 bg-zinc-200 rounded-lg text-white p-6 container mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h1 className="text-2xl font-bold mb-4 md:mb-0 dark:text-zinc-100 text-zinc-700">
          Gestao de Dispositivos
        </h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => hook.setShowDashboard(!hook.showDashboard)}
            className={`p-2 rounded flex items-center gap-1 transition-colors ${
              hook.showDashboard
                ? 'bg-blue-500 text-white'
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            <ChartLine size={20} />
            <span className="hidden sm:inline">{hook.showDashboard ? 'Ocultar' : 'Dashboard'}</span>
          </button>

          <button
            onClick={() => hook.setShowGrouping(!hook.showGrouping)}
            className={`p-2 rounded flex items-center gap-1 transition-colors ${
              hook.showGrouping
                ? 'bg-purple-500 text-white'
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            <Eye size={20} />
            <span className="hidden sm:inline">{hook.showGrouping ? 'Lista' : 'Agrupar'}</span>
          </button>

          <button
            onClick={() => hook.setShowReports(!hook.showReports)}
            className={`p-2 rounded flex items-center gap-1 transition-colors ${
              hook.showReports
                ? 'bg-green-500 text-white'
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            <FileText size={20} />
            <span className="hidden sm:inline">{hook.showReports ? 'Ocultar' : 'Relatorios'}</span>
          </button>

          <button
            onClick={() => hook.setShowAlerts(!hook.showAlerts)}
            className={`p-2 rounded flex items-center gap-1 transition-colors ${
              hook.showAlerts
                ? 'bg-red-500 text-white'
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            <Bell size={20} />
            <span className="hidden sm:inline">{hook.showAlerts ? 'Ocultar' : 'Alertas'}</span>
          </button>
          <button
            onClick={hook.exportToExcel}
            className="bg-green-500 hover:bg-green-700 text-white p-2 rounded flex items-center"
          >
            <FileDown size={24} className="mr-2" />
            Exportar Excel
          </button>
          <button
            onClick={hook.generateCompleteBackup}
            className="bg-purple-500 hover:bg-purple-700 text-white p-2 rounded flex items-center"
            disabled={hook.loading}
          >
            {hook.loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
            ) : (
              <Database size={24} className="mr-2" />
            )}
            {hook.loading ? "Gerando..." : "Backup Completo"}
          </button>
          {(hook.userRole === "ADMTOTAL" || hook.userRole === "ADMIN") && (
            <button
              onClick={hook.handleOpenMemorandumDialog}
              className="bg-blue-500 hover:bg-blue-700 text-white p-2 rounded flex items-center"
            >
              <File size={24} className="mr-2" />
              Gerar Memorando
            </button>
          )}
        </div>
      </div>

      {/* Alertas */}
      {hook.showAlerts && (
        <div className="mb-6">
          <AlertSystem items={hook.items} schools={hook.schools} />
        </div>
      )}

      {/* Relatorios Avancados */}
      {hook.showReports && (
        <div className="mb-6">
          {hook.activeFilters && (
            <div className="mb-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300">
              🔍 Relatorio usando <strong>{hook.filteredItems.length} itens filtrados</strong> (filtros do painel acima aplicados)
            </div>
          )}
          <AdvancedReports items={hook.activeFilters ? hook.filteredItems : hook.items} schools={hook.schools} />
        </div>
      )}

      {/* Dashboard */}
      {hook.showDashboard && (
        <div className="mb-6">
          <Dashboard items={hook.items} schools={hook.schools} />
        </div>
      )}

      {/* Filtros Avancados */}
      <AdvancedFilters
        items={hook.items}
        schools={hook.schools}
        onFiltersChange={hook.handleFiltersChange}
        onGenerateReport={hook.handleGenerateFilteredReport}
      />

      {/* Busca rapida */}
      {!hook.activeFilters && (
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Pesquisar (use filtros avancados para mais opcoes)"
            value={hook.searchTerm}
            onChange={(e) => hook.setSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 rounded dark:bg-zinc-900 dark:text-white"
          />
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
        </div>
      )}

      {/* Totalizadores */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4 mb-4">
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-bold">Total.</h3>
          <p className="text-2xl font-semibold">{hook.items.length}</p>
        </div>
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-bold">Comp.</h3>
          <p className="text-2xl font-semibold">{totals.COMPUTADOR}</p>
        </div>
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-bold">NotB.</h3>
          <p className="text-2xl font-semibold">{totals.NOTEBOOK}</p>
        </div>
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-bold">Monit.</h3>
          <p className="text-2xl font-semibold">{totals.MONITOR}</p>
        </div>
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-bold">Mouse</h3>
          <p className="text-2xl font-semibold">{totals.MOUSE}</p>
        </div>
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-bold">Tecl.</h3>
          <p className="text-2xl font-semibold">{totals.TECLADO}</p>
        </div>
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-bold">Estab.</h3>
          <p className="text-2xl font-semibold">{totals.ESTABILIZADOR}</p>
        </div>
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-bold">Impr.</h3>
          <p className="text-2xl font-semibold">{totals.IMPRESSORA}</p>
        </div>
      </div>

      {/* Conteudo principal */}
      {hook.showGrouping ? (
        <SmartGrouping
          items={displayItems}
          schools={hook.schools}
          onHistoryClick={hook.openHistoryDrawer}
          onDeleteClick={hook.openDeleteModal}
          userId={hook.userId}
          groupBy={hook.groupBy}
          onGroupByChange={hook.handleGroupByChange}
        />
      ) : (
        <DeviceViews
          items={hook.currentItems}
          viewMode={hook.viewMode}
          onViewModeChange={hook.handleViewModeChange}
          onHistoryClick={hook.openHistoryDrawer}
          onDeleteClick={hook.openDeleteModal}
          onEditClick={hook.openEditModal}
          userId={hook.userId}
          userRole={hook.userRole}
        />
      )}

      <div className="mt-6 flex justify-center">
        {!hook.showGrouping && (
          <div className="w-full flex flex-wrap justify-center gap-2">
            <Pagination
              total={displayItems.length}
              currentPage={hook.currentPage}
              itemsPerPage={10}
              onPageChange={hook.handlePageChange}
            />
          </div>
        )}

        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {hook.showGrouping ? (
            `Mostrando ${displayItems.length} equipamentos agrupados por ${{
              school: 'escola',
              type: 'tipo',
              status: 'status',
              date: 'data',
              district: 'distrito'
            }[hook.groupBy]}`
          ) : (
            `Mostrando ${Math.min(indexOfFirstItem + 1, displayItems.length)}-${Math.min(indexOfLastItem, displayItems.length)} de ${displayItems.length} equipamentos`
          )}
          {hook.activeFilters && ' (filtrados)'}
        </div>

        <DeviceListModals
          modalIsOpen={hook.modalIsOpen}
          setModalIsOpen={hook.setModalIsOpen}
          modalMessage={hook.modalMessage}
          isDrawerOpen={hook.isDrawerOpen}
          setIsDrawerOpen={hook.setIsDrawerOpen}
          selectedItem={hook.selectedItem}
          itemHistory={hook.itemHistory}
          closeHistoryDrawer={hook.closeHistoryDrawer}
          editModalOpen={hook.editModalOpen}
          setEditModalOpen={hook.setEditModalOpen}
          itemToEdit={hook.itemToEdit}
          editName={hook.editName}
          setEditName={hook.setEditName}
          editBrand={hook.editBrand}
          setEditBrand={hook.setEditBrand}
          editSerial={hook.editSerial}
          setEditSerial={hook.setEditSerial}
          editSchoolId={hook.editSchoolId}
          setEditSchoolId={hook.setEditSchoolId}
          editSchools={hook.editSchools}
          editLoading={hook.editLoading}
          handleEditSave={hook.handleEditSave}
          deleteModalOpen={hook.deleteModalOpen}
          setDeleteModalOpen={hook.setDeleteModalOpen}
          itemToDelete={hook.itemToDelete}
          setItemToDelete={hook.setItemToDelete}
          relatedData={hook.relatedData}
          setRelatedData={hook.setRelatedData}
          loadingRelatedData={hook.loadingRelatedData}
          confirmDelete={hook.confirmDelete}
        />

        <DeviceListMemorandumDialog
          isDialogOpen={hook.isDialogOpen}
          setIsDialogOpen={hook.setIsDialogOpen}
          items={hook.items}
          schools={hook.schools}
          searchTerm={hook.searchTerm}
          setSearchTerm={hook.setSearchTerm}
          memorandumType={hook.memorandumType}
          setMemorandumType={hook.setMemorandumType}
          schoolName={hook.schoolName}
          setSchoolName={hook.setSchoolName}
          district={hook.district}
          setDistrict={hook.setDistrict}
          exchangeToSchool={hook.exchangeToSchool}
          setExchangeToSchool={hook.setExchangeToSchool}
          selectedFromCSDT={hook.selectedFromCSDT}
          setSelectedFromCSDT={hook.setSelectedFromCSDT}
          selectedFromDestino={hook.selectedFromDestino}
          setSelectedFromDestino={hook.setSelectedFromDestino}
          currentStep={hook.currentStep}
          setCurrentStep={hook.setCurrentStep}
          setModalMessage={hook.setModalMessage}
          setModalIsOpen={hook.setModalIsOpen}
          handleGenerateMemorandum={hook.handleGenerateMemorandum}
          resetMemorandum={hook.resetMemorandum}
        />
      </div>
    </div>
  );
};

export default DeviceList;
