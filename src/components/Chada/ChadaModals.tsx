import React from "react";
import Select from "react-select";
import { Printer, AlertCircle } from "lucide-react";
import type { ChadaStatus } from "@/hooks/useChada";

interface ChadaModalsProps {
  // Add to Chada modal
  modalIsOpen: boolean;
  setModalIsOpen: (v: boolean) => void;
  allItems: any[];
  selectedItem: string | null;
  setSelectedItem: (v: string | null) => void;
  problem: string;
  setProblem: (v: string) => void;
  sector: string;
  setSector: (v: string) => void;
  manutencaoSemMovimentacao: boolean;
  setManutencaoSemMovimentacao: (v: boolean) => void;
  semSerial: boolean;
  setSemSerial: (v: boolean) => void;
  itemNameSemSerial: string;
  setItemNameSemSerial: (v: string) => void;
  itemTypeSemSerial: string;
  setItemTypeSemSerial: (v: string) => void;
  itemBrandSemSerial: string;
  setItemBrandSemSerial: (v: string) => void;
  chadaPhoto: File | null;
  setChadaPhoto: (v: File | null) => void;
  handleAddToChada: () => Promise<void>;

  // Baixa modal
  showBaixaModal: boolean;
  setShowBaixaModal: (v: boolean) => void;
  baixaItemId: string | null;
  setBaixaItemId: (v: string | null) => void;
  novoModelo: string;
  setNovoModelo: (v: string) => void;
  novoSerial: string;
  setNovoSerial: (v: string) => void;
  chadaStatus: ChadaStatus;
  setChadaStatus: (v: ChadaStatus) => void;
  observacoes: string;
  setObservacoes: (v: string) => void;
  userName: string | null;
  setItems: (v: any) => void;

  // Diagnostic modal
  showDiagnosticModal: boolean;
  setShowDiagnosticModal: (v: boolean) => void;
  printers: any[];
  sectors: any[];
  selectedPrinter: any;
  setSelectedPrinter: (v: any) => void;
  selectedSector: any;
  setSelectedSector: (v: any) => void;
  technicianChada: string;
  setTechnicianChada: (v: string) => void;
  diagnostic: string;
  setDiagnostic: (v: string) => void;
  requestedPart: string;
  setRequestedPart: (v: string) => void;
  handleAddDiagnostic: () => Promise<void>;

  // CSDT Warning modal
  showCsdtWarningModal: boolean;
  setShowCsdtWarningModal: (v: boolean) => void;

  // Edit modal
  showEditModal: boolean;
  setShowEditModal: (v: boolean) => void;
  editItemId: string | null;
  setEditItemId: (v: string | null) => void;
  editProblem: string;
  setEditProblem: (v: string) => void;
  editSector: string;
  setEditSector: (v: string) => void;
  editSemSerial: boolean;
  setEditSemSerial: (v: boolean) => void;
  editSelectedItem: string | null;
  setEditSelectedItem: (v: string | null) => void;
  editItemNameSemSerial: string;
  setEditItemNameSemSerial: (v: string) => void;
  editItemTypeSemSerial: string;
  setEditItemTypeSemSerial: (v: string) => void;
  editItemBrandSemSerial: string;
  setEditItemBrandSemSerial: (v: string) => void;
  handleCorrectChada: () => Promise<void>;

  // Cancel modal
  showCancelModal: boolean;
  setShowCancelModal: (v: boolean) => void;
  cancelItemId: string | null;
  setCancelItemId: (v: string | null) => void;
  cancelLoading: boolean;
  handleCancelChada: () => Promise<void>;

  // Send Photo modal
  showSendPhotoModal: boolean;
  setShowSendPhotoModal: (v: boolean) => void;
  sendPhotoItemId: string | null;
  setSendPhotoItemId: (v: string | null) => void;
  sendPhotoFile: File | null;
  setSendPhotoFile: (v: File | null) => void;
  sendingPhoto: boolean;
  handleSendPhoto: () => Promise<void>;
}

const ChadaModals: React.FC<ChadaModalsProps> = ({
  modalIsOpen, setModalIsOpen, allItems, selectedItem, setSelectedItem,
  problem, setProblem, sector, setSector,
  manutencaoSemMovimentacao, setManutencaoSemMovimentacao,
  semSerial, setSemSerial, itemNameSemSerial, setItemNameSemSerial,
  itemTypeSemSerial, setItemTypeSemSerial, itemBrandSemSerial, setItemBrandSemSerial,
  chadaPhoto, setChadaPhoto,
  handleAddToChada,
  showBaixaModal, setShowBaixaModal, baixaItemId, setBaixaItemId,
  novoModelo, setNovoModelo, novoSerial, setNovoSerial,
  chadaStatus, setChadaStatus, observacoes, setObservacoes, userName, setItems,
  showDiagnosticModal, setShowDiagnosticModal, printers, sectors,
  selectedPrinter, setSelectedPrinter, selectedSector, setSelectedSector,
  technicianChada, setTechnicianChada, diagnostic, setDiagnostic,
  requestedPart, setRequestedPart, handleAddDiagnostic,
  showCsdtWarningModal, setShowCsdtWarningModal,
  // Edit modal
  showEditModal, setShowEditModal,
  editItemId, setEditItemId,
  editProblem, setEditProblem, editSector, setEditSector,
  editSemSerial, setEditSemSerial, editSelectedItem, setEditSelectedItem,
  editItemNameSemSerial, setEditItemNameSemSerial,
  editItemTypeSemSerial, setEditItemTypeSemSerial,
  editItemBrandSemSerial, setEditItemBrandSemSerial,
  handleCorrectChada,
  // Cancel modal
  showCancelModal, setShowCancelModal, cancelItemId, setCancelItemId, cancelLoading, handleCancelChada,
  // Send Photo modal
  showSendPhotoModal, setShowSendPhotoModal,
  sendPhotoItemId, setSendPhotoItemId,
  sendPhotoFile, setSendPhotoFile,
  sendingPhoto, handleSendPhoto,
}) => {
  const handleBaixaSubmit = async () => {
    if (!baixaItemId) return;

    const body: any = {
      id: baixaItemId,
      status: chadaStatus,
      updatedBy: userName,
    };

    if (novoModelo.trim()) body.novoModelo = novoModelo.trim();
    if (novoSerial.trim()) body.novoSerial = novoSerial.trim();

    try {
      const response = await fetch("/api/update-item-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        alert('Status atualizado com sucesso!');
        const updatedItems = await fetch("/api/chada-items?" + new Date().getTime()).then((res) => res.json());
        setItems(updatedItems);
        setTimeout(() => { setItems((prev: any) => [...updatedItems]); }, 100);
      } else {
        throw new Error('Erro ao atualizar status');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status. Tente novamente.');
    }

    setShowBaixaModal(false);
    setNovoModelo("");
    setNovoSerial("");
    setChadaStatus('CONSERTADO');
    setObservacoes("");
    setBaixaItemId(null);
  };

  return (
    <>
      {/* Modal Adicionar à CHADA */}
      {modalIsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-zinc-700">Adicionar Item à CHADA</h2>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={semSerial}
                  onChange={(e) => {
                    setSemSerial(e.target.checked);
                    setSelectedItem(null);
                    setManutencaoSemMovimentacao(false);
                  }}
                  className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                />
                <span className="font-medium text-gray-900">Item sem serial</span>
              </label>
              <p className="text-sm text-gray-600 mt-1 ml-7">
                Use para cabos de força, mouses, teclados e outros itens sem número de série.
              </p>
            </div>

            {semSerial ? (
              <>
                <input type="text" className="w-full mb-4 p-2 border border-gray-300 rounded"
                  placeholder="Marca (ex: Multilaser, Intelbras, Genérico)"
                  value={itemBrandSemSerial} onChange={(e) => setItemBrandSemSerial(e.target.value)} />
                <input type="text" className="w-full mb-4 p-2 border border-gray-300 rounded"
                  placeholder="Modelo (ex: VX Pro, MF4570, 3 metros)"
                  value={itemNameSemSerial} onChange={(e) => setItemNameSemSerial(e.target.value)} />
                <select className="w-full mb-4 p-2 border border-gray-300 rounded text-gray-700"
                  value={itemTypeSemSerial} onChange={(e) => setItemTypeSemSerial(e.target.value)}>
                  <option value="">Selecione o tipo do item</option>
                  <option value="Mouse">Mouse</option>
                  <option value="Teclado">Teclado</option>
                  <option value="Cabo de Força">Cabo de Força</option>
                  <option value="Cabo de Rede">Cabo de Rede</option>
                  <option value="Fonte">Fonte</option>
                  <option value="Carregador">Carregador</option>
                  <option value="Headset">Headset</option>
                  <option value="Outro">Outro</option>
                </select>
              </>
            ) : (
              <Select
                options={allItems.map((item: any) => ({
                  value: item.id,
                  label: `${item.name} - ${item.serialNumber || "Sem Serial"}`,
                }))}
                onChange={(selectedOption) => setSelectedItem(selectedOption ? selectedOption.value : null)}
                placeholder="Selecione um item"
                className="mb-4 text-zinc-800"
              />
            )}
            <input type="text" className="w-full mb-4 p-2 border border-gray-300 rounded"
              placeholder="Informe o setor" value={sector} onChange={(e) => setSector(e.target.value)} />
            <textarea className="w-full mb-4 p-2 border border-gray-300 rounded"
              placeholder="Descreva o problema" value={problem} onChange={(e) => setProblem(e.target.value)} />

            {!semSerial && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={manutencaoSemMovimentacao}
                    onChange={(e) => setManutencaoSemMovimentacao(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 block">Manutenção sem movimentação física</span>
                    <span className="text-sm text-gray-600 block mt-1">
                      Marque esta opção se o equipamento não será fisicamente movido para o CSDT.
                      Ideal para <strong>impressoras fixas</strong> ou equipamentos que serão consertados no local.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Foto opcional — vai apenas no email, não salva no banco */}
            <div className="mb-4">
              <label className="block mb-1 font-medium text-zinc-600 text-sm">
                Foto (opcional) — anexada apenas no email
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors text-sm text-gray-700">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setChadaPhoto(file);
                    }}
                  />
                  {chadaPhoto ? "Trocar foto" : "📷 Escolher foto"}
                </label>
                {chadaPhoto && (
                  <>
                    <span className="text-sm text-gray-500 truncate max-w-[180px]">{chadaPhoto.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setChadaPhoto(null);
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
              {chadaPhoto && (
                <div className="mt-2">
                  <img
                    src={URL.createObjectURL(chadaPhoto)}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button onClick={() => {
                setModalIsOpen(false); setProblem(""); setSector(""); setSelectedItem(null);
                setManutencaoSemMovimentacao(false); setSemSerial(false);
                setItemNameSemSerial(""); setItemTypeSemSerial(""); setItemBrandSemSerial("");
                setChadaPhoto(null);
              }} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors order-2 sm:order-1">
                Cancelar
              </button>
              <button onClick={handleAddToChada} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors order-1 sm:order-2">
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Baixa/Atualização */}
      {showBaixaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-zinc-700">Atualizar Status do Item</h2>

            <label className="block mb-2 font-medium text-zinc-600">Novo Status</label>
            <select value={chadaStatus} onChange={(e) => setChadaStatus(e.target.value as ChadaStatus)}
              className="w-full mb-4 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="RECEBIDO">📥 Recebido</option>
              <option value="EM_ANALISE">🔍 Em Análise</option>
              <option value="CONSERTADO">✅ Consertado</option>
              <option value="SEM_CONSERTO">❌ Sem Conserto</option>
              <option value="DEVOLVIDO">📤 Devolvido</option>
            </select>

            <label className="block mb-2 font-medium text-zinc-600">Observações da CHADA</label>
            <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
              className="w-full mb-4 p-2 border border-gray-300 rounded h-20 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Observações sobre o reparo, diagnóstico, etc..." />

            <label className="block mb-2 font-medium text-zinc-600">Trocou o modelo?</label>
            <input type="text" className="w-full mb-4 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Novo modelo (deixe em branco se não trocou)" value={novoModelo} onChange={(e) => setNovoModelo(e.target.value)} />

            <label className="block mb-2 font-medium text-zinc-600">Mudou o serial?</label>
            <input type="text" className="w-full mb-4 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Novo serial (deixe em branco se não mudou)" value={novoSerial} onChange={(e) => setNovoSerial(e.target.value)} />

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <button onClick={() => {
                setShowBaixaModal(false); setNovoModelo(""); setNovoSerial("");
                setChadaStatus('CONSERTADO'); setObservacoes(""); setBaixaItemId(null);
              }} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors order-2 sm:order-1">
                Cancelar
              </button>
              <button onClick={handleBaixaSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors order-1 sm:order-2">
                Atualizar Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Diagnóstico */}
      {showDiagnosticModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 text-zinc-700 flex items-center gap-2">
              <Printer size={24} />
              Novo Diagnóstico de Impressora
            </h2>

            <div className="mb-4">
              <label className="block mb-2 font-medium text-zinc-600">Impressora *</label>
              <Select options={printers} value={selectedPrinter} onChange={setSelectedPrinter}
                placeholder="Selecione uma impressora" className="text-zinc-800" isSearchable />
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium text-zinc-600">Setor *</label>
              <Select options={sectors} value={selectedSector} onChange={setSelectedSector}
                placeholder="Selecione o setor" className="text-zinc-800" isSearchable />
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium text-zinc-600">Técnico da CHADA *</label>
              <input type="text" value={technicianChada} onChange={(e) => setTechnicianChada(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Nome do técnico que fez o diagnóstico" />
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium text-zinc-600">Diagnóstico/Laudo *</label>
              <textarea value={diagnostic} onChange={(e) => setDiagnostic(e.target.value)} rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Descreva o problema encontrado e o diagnóstico..." />
            </div>

            <div className="mb-6">
              <label className="block mb-2 font-medium text-zinc-600">Peça Solicitada *</label>
              <input type="text" value={requestedPart} onChange={(e) => setRequestedPart(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Qual peça foi solicitada para o reparo?" />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={() => {
                setShowDiagnosticModal(false); setSelectedPrinter(null); setSelectedSector(null);
                setTechnicianChada(""); setDiagnostic(""); setRequestedPart("");
              }} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors order-2 sm:order-1">
                Cancelar
              </button>
              <button onClick={handleAddDiagnostic}
                disabled={!selectedPrinter || !selectedSector || !technicianChada || !diagnostic || !requestedPart}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2">
                Cadastrar Diagnóstico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Aviso - Item não está no CSDT */}
      {showCsdtWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-yellow-100 p-4 rounded-full">
                <AlertCircle size={48} className="text-yellow-600" />
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4 text-center text-gray-900">
              Item não está no CSDT
            </h2>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
              <p className="text-gray-800 text-center leading-relaxed">
                O item precisa estar no <strong>CSDT</strong> primeiro antes de poder enviar para a CHADA.
              </p>
              <p className="text-gray-700 text-center mt-3 font-medium">
                Por favor, consulte o <strong>Aurélio</strong> para fazer o memorando e trazer o item para o CSDT.
              </p>
            </div>

            <button onClick={() => {
              setShowCsdtWarningModal(false); setProblem(""); setSector(""); setSelectedItem(null);
            }} className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Modal de Edição/Correção */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-zinc-700">✏️ Editar Chamado CHADA</h2>
            <p className="text-sm text-amber-600 mb-4 bg-amber-50 p-3 rounded-lg">
              Um email de retificação será enviado à CHADA com os dados corrigidos.
            </p>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editSemSerial}
                  onChange={(e) => {
                    setEditSemSerial(e.target.checked);
                    setEditSelectedItem(null);
                  }}
                  className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                />
                <span className="font-medium text-gray-900">Item sem serial</span>
              </label>
            </div>

            {editSemSerial ? (
              <>
                <input type="text" className="w-full mb-4 p-2 border border-gray-300 rounded"
                  placeholder="Marca"
                  value={editItemBrandSemSerial} onChange={(e) => setEditItemBrandSemSerial(e.target.value)} />
                <input type="text" className="w-full mb-4 p-2 border border-gray-300 rounded"
                  placeholder="Modelo"
                  value={editItemNameSemSerial} onChange={(e) => setEditItemNameSemSerial(e.target.value)} />
                <select className="w-full mb-4 p-2 border border-gray-300 rounded text-gray-700"
                  value={editItemTypeSemSerial} onChange={(e) => setEditItemTypeSemSerial(e.target.value)}>
                  <option value="">Selecione o tipo</option>
                  <option value="Mouse">Mouse</option>
                  <option value="Teclado">Teclado</option>
                  <option value="Cabo de Força">Cabo de Força</option>
                  <option value="Cabo de Rede">Cabo de Rede</option>
                  <option value="Fonte">Fonte</option>
                  <option value="Carregador">Carregador</option>
                  <option value="Headset">Headset</option>
                  <option value="Outro">Outro</option>
                </select>
              </>
            ) : (
              <Select
                options={allItems.map((item: any) => ({
                  value: item.id,
                  label: `${item.name} - ${item.serialNumber || "Sem Serial"}`,
                }))}
                onChange={(selectedOption) => setEditSelectedItem(selectedOption ? selectedOption.value : null)}
                placeholder="Selecione um item (opcional)"
                className="mb-4 text-zinc-800"
                isClearable
              />
            )}
            <input type="text" className="w-full mb-4 p-2 border border-gray-300 rounded"
              placeholder="Setor/Escola" value={editSector} onChange={(e) => setEditSector(e.target.value)} />
            <textarea className="w-full mb-4 p-2 border border-gray-300 rounded"
              placeholder="Descreva o problema" value={editProblem} onChange={(e) => setEditProblem(e.target.value)} />

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button onClick={() => {
                setShowEditModal(false); setEditItemId(null);
                setEditProblem(""); setEditSector(""); setEditSelectedItem(null);
                setEditSemSerial(false); setEditItemNameSemSerial(""); setEditItemTypeSemSerial(""); setEditItemBrandSemSerial("");
              }} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors order-2 sm:order-1">
                Cancelar
              </button>
              <button onClick={handleCorrectChada} className="bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600 transition-colors order-1 sm:order-2">
                ✏️ Enviar Correção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-100 p-4 rounded-full">
                <span className="text-4xl">🗑️</span>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-2 text-center text-gray-900">
              Cancelar Chamado
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Um email de cancelamento será enviado à CHADA informando que este chamado não é mais necessário.
            </p>
            <p className="text-red-600 text-center text-sm font-medium mb-6 bg-red-50 p-3 rounded-lg">
              ⚠️ O item será removido do controle CHADA e, se estiver com status "CHADA", será restaurado para disponível.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button onClick={() => {
                setShowCancelModal(false); setCancelItemId(null);
              }} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                Voltar
              </button>
              <button onClick={handleCancelChada} disabled={cancelLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {cancelLoading ? "Cancelando..." : "Sim, Cancelar Chamado"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Envio de Foto */}
      {showSendPhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <span className="text-4xl">📷</span>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-2 text-center text-gray-900">
              Enviar Foto para CHADA
            </h2>
            <p className="text-gray-600 text-center mb-6">
              A foto será enviada como resposta na mesma conversa do email original.
            </p>

            <div className="mb-6">
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {sendPhotoFile ? (
                    <img
                      src={URL.createObjectURL(sendPhotoFile)}
                      alt="Preview"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <>
                      <span className="text-4xl mb-2">📸</span>
                      <p className="text-sm text-gray-500">Clique para selecionar uma foto</p>
                      <p className="text-xs text-gray-400">PNG, JPEG ou GIF</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSendPhotoFile(e.target.files?.[0] || null)}
                />
              </label>
              {sendPhotoFile && (
                <p className="text-sm text-gray-500 mt-2 text-center">{sendPhotoFile.name}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button onClick={() => {
                setShowSendPhotoModal(false); setSendPhotoFile(null);
              }} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSendPhoto} disabled={!sendPhotoFile || sendingPhoto}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {sendingPhoto ? "Enviando..." : "📤 Enviar Foto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChadaModals;
