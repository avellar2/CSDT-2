import React from "react";
import Select from "react-select";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeviceListModalsProps {
  // Info modal
  modalIsOpen: boolean;
  setModalIsOpen: (v: boolean) => void;
  modalMessage: string;

  // History drawer
  isDrawerOpen: boolean;
  setIsDrawerOpen: (v: boolean) => void;
  selectedItem: any;
  itemHistory: any[];
  closeHistoryDrawer: () => void;

  // Edit modal
  editModalOpen: boolean;
  setEditModalOpen: (v: boolean) => void;
  itemToEdit: any;
  editName: string;
  setEditName: (v: string) => void;
  editBrand: string;
  setEditBrand: (v: string) => void;
  editSerial: string;
  setEditSerial: (v: string) => void;
  editSchoolId: number | null;
  setEditSchoolId: (v: number | null) => void;
  editSchools: any[];
  editLoading: boolean;
  handleEditSave: () => Promise<void>;

  // Delete modal
  deleteModalOpen: boolean;
  setDeleteModalOpen: (v: boolean) => void;
  itemToDelete: any;
  setItemToDelete: (v: any) => void;
  relatedData: any;
  setRelatedData: (v: any) => void;
  loadingRelatedData: boolean;
  confirmDelete: () => Promise<void>;
}

const DeviceListModals: React.FC<DeviceListModalsProps> = ({
  modalIsOpen,
  setModalIsOpen,
  modalMessage,
  isDrawerOpen,
  setIsDrawerOpen,
  selectedItem,
  itemHistory,
  closeHistoryDrawer,
  editModalOpen,
  setEditModalOpen,
  itemToEdit,
  editName,
  setEditName,
  editBrand,
  setEditBrand,
  editSerial,
  setEditSerial,
  editSchoolId,
  setEditSchoolId,
  editSchools,
  editLoading,
  handleEditSave,
  deleteModalOpen,
  setDeleteModalOpen,
  itemToDelete,
  setItemToDelete,
  relatedData,
  setRelatedData,
  loadingRelatedData,
  confirmDelete,
}) => {
  return (
    <>
      {/* Info/Warning AlertDialog */}
      <AlertDialog open={modalIsOpen} onOpenChange={setModalIsOpen}>
        <AlertDialogContent className="dark:bg-zinc-900 bg-white max-w-md">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="dark:text-white text-xl font-bold flex items-center justify-center gap-2">
              {modalMessage.includes('🚫') ? (
                <>
                  <span className="text-2xl">🚫</span>
                  Limite Excedido
                </>
              ) : (
                <>
                  <span className="text-2xl">ℹ️</span>
                  Informacao
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-300 text-gray-600 text-base whitespace-pre-line">
              {modalMessage.replace(/🚫|ℹ️/g, '').trim()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-center">
            <AlertDialogAction
              onClick={() => setModalIsOpen(false)}
              className="bg-blue-500 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* History Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent
          className="fixed inset-y-0 right-0 w-full max-w-md bg-zinc-900 text-white shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col"
          style={{
            transform: isDrawerOpen ? "translateX(0)" : "translateX(100%)",
          }}
        >
          <DrawerHeader className="p-4 border-b border-zinc-800">
            <DrawerTitle className="text-xl font-bold">
              Historico do Item
            </DrawerTitle>
            <DrawerDescription className="text-sm text-gray-400">
              Historico de movimentacao para o item:{" "}
              <strong>
                {selectedItem?.name}, {selectedItem?.brand},{" "}
                {selectedItem?.serialNumber}
              </strong>
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {itemHistory.length > 0 ? (
              itemHistory.map((history, index) => (
                <div
                  key={index}
                  className="bg-zinc-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <p><strong>Foi para:</strong> {history.toSchool || "N/A"}</p>
                  <p><strong>Data:</strong> {new Date(history.movedAt).toLocaleString("pt-BR")}</p>
                  <p><strong>Gerado por:</strong> {history.generatedBy || "N/A"}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">Nenhum historico encontrado.</p>
            )}
          </div>
          <DrawerFooter className="p-4 border-t border-zinc-800 flex justify-end">
            <Button
              onClick={closeHistoryDrawer}
              className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-300"
            >
              Fechar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Edit Item Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-lg font-bold mb-4 text-zinc-800 dark:text-white">Editar Item</h2>

            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Nome</label>
            <input
              type="text"
              className="w-full mb-3 p-2 border border-gray-300 rounded dark:bg-zinc-800 dark:text-white dark:border-zinc-600"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />

            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Marca / Modelo</label>
            <input
              type="text"
              className="w-full mb-3 p-2 border border-gray-300 rounded dark:bg-zinc-800 dark:text-white dark:border-zinc-600"
              value={editBrand}
              onChange={(e) => setEditBrand(e.target.value)}
            />

            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Serial</label>
            <input
              type="text"
              className="w-full mb-3 p-2 border border-gray-300 rounded dark:bg-zinc-800 dark:text-white dark:border-zinc-600"
              value={editSerial}
              onChange={(e) => setEditSerial(e.target.value)}
            />

            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Escola / Setor</label>
            <Select
              options={editSchools.map((s: any) => ({ value: s.id, label: s.name }))}
              onChange={(opt) => setEditSchoolId(opt ? opt.value : null)}
              placeholder={`Atual: ${itemToEdit?.School?.name} — pesquise para alterar`}
              isClearable
              className="mb-4"
              styles={{
                control: (base) => ({ ...base, backgroundColor: "#fff", borderColor: "#d1d5db", color: "#111" }),
                input: (base) => ({ ...base, color: "#111" }),
                singleValue: (base) => ({ ...base, color: "#111" }),
                placeholder: (base) => ({ ...base, color: "#6b7280" }),
                menu: (base) => ({ ...base, backgroundColor: "#fff", zIndex: 9999 }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isFocused ? "#eff6ff" : "#fff",
                  color: "#111",
                  cursor: "pointer",
                }),
              }}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {editLoading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent className="dark:bg-zinc-900 bg-white max-w-2xl max-h-[90vh] flex flex-col">
          <AlertDialogHeader className="flex-shrink-0">
            <AlertDialogTitle className="dark:text-white text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">🗑️</span>
              Confirmar Delecao
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-300 text-gray-600">
              Voce esta prestes a deletar este item e TODOS os dados relacionados. Esta acao e irreversivel.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 px-1">
            {loadingRelatedData ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 dark:text-white">Carregando dados relacionados...</span>
              </div>
            ) : relatedData ? (
              <>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">📦 Item a ser deletado:</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Nome:</strong> {relatedData.item.name}</p>
                    <p><strong>Marca:</strong> {relatedData.item.brand}</p>
                    <p><strong>Serie:</strong> {relatedData.item.serialNumber}</p>
                    <p><strong>Escola:</strong> {relatedData.item.school}</p>
                    <p><strong>Criado por:</strong> {relatedData.item.createdBy}</p>
                  </div>
                </div>

                {relatedData.totalRelatedRecords > 0 ? (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-800 dark:text-orange-300 mb-2">
                      ⚠️ Dados relacionados que serao deletados:
                    </h3>
                    <div className="space-y-2 text-sm">
                      {relatedData.relationships.history.count > 0 && (
                        <div>
                          <p><strong>📋 Historico de movimentacoes:</strong> {relatedData.relationships.history.count} registros</p>
                          {relatedData.relationships.history.recent.slice(0, 3).map((h: any, idx: number) => (
                            <p key={idx} className="ml-4 text-xs text-gray-600 dark:text-gray-400">
                              • {h.from} → {h.to} em {new Date(h.date).toLocaleDateString('pt-BR')}
                            </p>
                          ))}
                          {relatedData.relationships.history.count > 3 && (
                            <p className="ml-4 text-xs text-gray-500">... e mais {relatedData.relationships.history.count - 3} registros</p>
                          )}
                        </div>
                      )}

                      {relatedData.relationships.memorandums.count > 0 && (
                        <div>
                          <p><strong>📄 Memorandos:</strong> {relatedData.relationships.memorandums.count} memorandos</p>
                          {relatedData.relationships.memorandums.list.slice(0, 3).map((m: any, idx: number) => (
                            <p key={idx} className="ml-4 text-xs text-gray-600 dark:text-gray-400">
                              • #{m.number} - {m.school} ({m.type}) em {new Date(m.date).toLocaleDateString('pt-BR')}
                            </p>
                          ))}
                          {relatedData.relationships.memorandums.count > 3 && (
                            <p className="ml-4 text-xs text-gray-500">... e mais {relatedData.relationships.memorandums.count - 3} memorandos</p>
                          )}
                        </div>
                      )}

                      {relatedData.relationships.chada.count > 0 && (
                        <div>
                          <p><strong>🔧 Registros CHADA:</strong> {relatedData.relationships.chada.count} registros</p>
                          {relatedData.relationships.chada.list.slice(0, 3).map((c: any, idx: number) => (
                            <p key={idx} className="ml-4 text-xs text-gray-600 dark:text-gray-400">
                              • {c.problem} ({c.status}) - {c.setor}
                            </p>
                          ))}
                          {relatedData.relationships.chada.count > 3 && (
                            <p className="ml-4 text-xs text-gray-500">... e mais {relatedData.relationships.chada.count - 3} registros</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-green-800 dark:text-green-300">
                      ✅ Este item nao possui dados relacionados. Apenas o item principal sera deletado.
                    </p>
                  </div>
                )}

                {!relatedData.canDelete && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-800 dark:text-red-300">
                      ❌ Voce nao tem permissao para deletar este item. Apenas quem criou o item pode deleta-lo.
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </div>

          <AlertDialogFooter className="flex-shrink-0 border-t pt-4">
            <AlertDialogCancel
              onClick={() => {
                setDeleteModalOpen(false);
                setItemToDelete(null);
                setRelatedData(null);
              }}
              className="hover:bg-gray-300 dark:text-white"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={!relatedData?.canDelete || loadingRelatedData}
              className={`${relatedData?.canDelete && !loadingRelatedData ? "bg-red-500 hover:bg-red-700" : "bg-gray-400 cursor-not-allowed"} text-white font-semibold`}
            >
              {loadingRelatedData ? "Carregando..." : "🗑️ Deletar Tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DeviceListModals;
