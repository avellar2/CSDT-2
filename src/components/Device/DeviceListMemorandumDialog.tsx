import React, { useState } from "react";
import Select from "react-select";
import { format } from "date-fns";
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
import type { Item } from "@/hooks/useDeviceList";
import { ITEMS_PER_PAGE } from "@/hooks/useDeviceList";

interface DeviceListMemorandumDialogProps {
  isDialogOpen: boolean;
  setIsDialogOpen: (v: boolean) => void;
  items: Item[];
  schools: any[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  memorandumType: "entrega" | "troca" | "devolucao";
  setMemorandumType: (v: "entrega" | "troca" | "devolucao") => void;
  schoolName: string;
  setSchoolName: (v: string) => void;
  district: string;
  setDistrict: (v: string) => void;
  exchangeToSchool: string;
  setExchangeToSchool: (v: string) => void;
  selectedFromCSDT: number[];
  setSelectedFromCSDT: React.Dispatch<React.SetStateAction<number[]>>;
  selectedFromDestino: number[];
  setSelectedFromDestino: React.Dispatch<React.SetStateAction<number[]>>;
  currentStep: "step1" | "step2";
  setCurrentStep: (v: "step1" | "step2") => void;
  setModalMessage: (v: string) => void;
  setModalIsOpen: (v: boolean) => void;
  handleGenerateMemorandum: () => Promise<void>;
  resetMemorandum: () => void;
}

const DeviceListMemorandumDialog: React.FC<DeviceListMemorandumDialogProps> = ({
  isDialogOpen,
  setIsDialogOpen,
  items,
  schools,
  searchTerm,
  setSearchTerm,
  memorandumType,
  setMemorandumType,
  schoolName,
  setSchoolName,
  district,
  setDistrict,
  exchangeToSchool,
  setExchangeToSchool,
  selectedFromCSDT,
  setSelectedFromCSDT,
  selectedFromDestino,
  setSelectedFromDestino,
  currentStep,
  setCurrentStep,
  setModalMessage,
  setModalIsOpen,
  handleGenerateMemorandum,
  resetMemorandum,
}) => {
  const [localSearchEntrega, setLocalSearchEntrega] = useState("");
  const [localSearchDevolucao, setLocalSearchDevolucao] = useState("");
  const [localSearchTroca1, setLocalSearchTroca1] = useState("");
  const [localSearchTroca2, setLocalSearchTroca2] = useState("");

  const handleCancel = () => {
    resetMemorandum();
    setLocalSearchEntrega("");
    setLocalSearchDevolucao("");
    setLocalSearchTroca1("");
    setLocalSearchTroca2("");
  };

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogContent className="dark:bg-zinc-900 bg-white text-black max-w-2xl max-h-[90vh] flex flex-col z-[10000]">
        <AlertDialogHeader className="flex-shrink-0">
          <AlertDialogTitle className="dark:text-white">
            Gerar Memorando
          </AlertDialogTitle>
          <AlertDialogDescription>
            Escolha o tipo de memorando e preencha as informacoes necessarias.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 px-1">
          {/* SELETOR DE TIPO DE MEMORANDO */}
          <div className="space-y-3">
            <label className="block">
              <span className="dark:text-gray-300 font-semibold">
                Tipo de Memorando:
              </span>
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="entrega"
                  checked={memorandumType === "entrega"}
                  onChange={(e) => setMemorandumType(e.target.value as "entrega")}
                  className="form-radio text-blue-500"
                />
                <span className="dark:text-gray-300">📦 Entrega de Equipamentos</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="troca"
                  checked={memorandumType === "troca"}
                  onChange={(e) => setMemorandumType(e.target.value as "troca")}
                  className="form-radio text-blue-500"
                />
                <span className="dark:text-gray-300">🔄 Troca de Equipamentos</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="devolucao"
                  checked={memorandumType === "devolucao"}
                  onChange={(e) => setMemorandumType(e.target.value as "devolucao")}
                  className="form-radio text-blue-500"
                />
                <span className="dark:text-gray-300">Devolucao de Equipamentos</span>
              </label>
            </div>
          </div>

          {/* CAMPOS PARA ENTREGA */}
          {memorandumType === "entrega" && (
            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300">
                📦 Configuracoes de Entrega
              </h4>

              <label className="block">
                <span className="dark:text-gray-300">Escola de Destino:</span>
                <Select
                  options={schools.map((school) => ({ value: school.name, label: school.name }))}
                  value={schoolName ? { value: schoolName, label: schoolName } : null}
                  onChange={(selectedOption) => {
                    const selectedSchoolName = selectedOption?.value || "";
                    setSchoolName(selectedSchoolName);
                    const selectedSchool = schools.find((school) => school.name === selectedSchoolName);
                    if (selectedSchool) setDistrict(selectedSchool.district);
                  }}
                  className="text-black"
                  placeholder="Selecione a escola que recebera os equipamentos"
                  isClearable
                />
              </label>

              <label className="block">
                <span className="dark:text-gray-300">Distrito:</span>
                <input
                  type="text"
                  value={district}
                  readOnly
                  className="w-full p-2 rounded dark:bg-zinc-800 dark:text-white bg-gray-100"
                  placeholder="Distrito sera preenchido automaticamente"
                />
              </label>

              <div>
                <span className="dark:text-gray-300 font-semibold">
                  Selecionar itens para entrega:
                </span>
                <div className="my-2">
                  <input
                    type="text"
                    placeholder="Pesquisar equipamento..."
                    value={localSearchEntrega}
                    onChange={(e) => setLocalSearchEntrega(e.target.value)}
                    className="w-full p-2 rounded dark:bg-zinc-800 dark:text-white bg-gray-100 border dark:border-zinc-700"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto bg-white dark:bg-zinc-800 rounded border divide-y divide-gray-200 dark:divide-zinc-700">
                  {items
                    .filter(
                      (item) =>
                        item.School?.name === "CSDT" &&
                        (item.name.toLowerCase().includes(localSearchEntrega.toLowerCase()) ||
                          item.brand.toLowerCase().includes(localSearchEntrega.toLowerCase()) ||
                          item.serialNumber.toLowerCase().includes(localSearchEntrega.toLowerCase())),
                    )
                    .map((item, idx) => (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2 text-xs px-2 py-2 cursor-pointer transition
                          ${idx % 2 === 0 ? "bg-gray-50 dark:bg-zinc-900" : "bg-white dark:bg-zinc-800"}
                          hover:bg-blue-100 dark:hover:bg-blue-900 rounded`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFromCSDT.includes(item.id)}
                          onChange={() => {
                            setSelectedFromCSDT((prev) =>
                              prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id],
                            );
                          }}
                          className="accent-blue-500"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-500 dark:text-gray-400">{item.brand} • {item.serialNumber}</span>
                          <span className="text-gray-400 text-[10px]">
                            Criado em: {format(new Date(item.createdAt), "dd/MM/yyyy")}
                          </span>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* CAMPOS PARA DEVOLUCAO */}
          {memorandumType === "devolucao" && (
            <div className="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">
                Configuracoes de Devolucao
              </h4>

              <label className="block">
                <span className="dark:text-gray-300">Escola de Origem:</span>
                <Select
                  options={schools
                    .filter((school) => school.name !== "CSDT")
                    .map((school) => ({ value: school.name, label: school.name }))}
                  value={schoolName ? { value: schoolName, label: schoolName } : null}
                  onChange={(selectedOption) => {
                    const selectedSchoolName = selectedOption?.value || "";
                    setSchoolName(selectedSchoolName);
                    setSelectedFromDestino([]);
                    const selectedSchool = schools.find((school) => school.name === selectedSchoolName);
                    if (selectedSchool) setDistrict(selectedSchool.district);
                    else setDistrict("");
                  }}
                  className="text-black"
                  placeholder="Selecione a escola que devolvera os equipamentos"
                  isClearable
                />
              </label>

              <label className="block">
                <span className="dark:text-gray-300">Distrito:</span>
                <input
                  type="text"
                  value={district}
                  readOnly
                  className="w-full p-2 rounded dark:bg-zinc-800 dark:text-white bg-gray-100"
                  placeholder="Distrito sera preenchido automaticamente"
                />
              </label>

              <div>
                <span className="dark:text-gray-300 font-semibold">
                  Selecionar itens para devolucao ao CSDT:
                </span>
                <div className="my-2">
                  <input
                    type="text"
                    placeholder="Pesquisar equipamento..."
                    value={localSearchDevolucao}
                    onChange={(e) => setLocalSearchDevolucao(e.target.value)}
                    className="w-full p-2 rounded dark:bg-zinc-800 dark:text-white bg-gray-100 border dark:border-zinc-700"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto bg-white dark:bg-zinc-800 rounded border divide-y divide-gray-200 dark:divide-zinc-700">
                  {items
                    .filter(
                      (item) =>
                        item.School?.name === schoolName &&
                        (item.name.toLowerCase().includes(localSearchDevolucao.toLowerCase()) ||
                          item.brand.toLowerCase().includes(localSearchDevolucao.toLowerCase()) ||
                          item.serialNumber.toLowerCase().includes(localSearchDevolucao.toLowerCase())),
                    )
                    .map((item, idx) => (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2 text-xs px-2 py-2 cursor-pointer transition
                          ${idx % 2 === 0 ? "bg-gray-50 dark:bg-zinc-900" : "bg-white dark:bg-zinc-800"}
                          hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFromDestino.includes(item.id)}
                          onChange={() => {
                            setSelectedFromDestino((prev) =>
                              prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id],
                            );
                          }}
                          className="accent-emerald-500"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-500 dark:text-gray-400">{item.brand} - {item.serialNumber}</span>
                          <span className="text-gray-400 text-[10px]">
                            Criado em: {format(new Date(item.createdAt), "dd/MM/yyyy")}
                          </span>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* CAMPOS PARA TROCA */}
          {memorandumType === "troca" && (
            <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <h4 className="font-semibold text-orange-800 dark:text-orange-300">
                🔄 Configuracoes de Troca
              </h4>

              <label className="block">
                <span className="dark:text-gray-300">Escola de Destino:</span>
                <Select
                  options={schools.map((school) => ({ value: school.name, label: school.name }))}
                  value={exchangeToSchool ? { value: exchangeToSchool, label: exchangeToSchool } : null}
                  onChange={(selectedOption) => {
                    setExchangeToSchool(selectedOption?.value || "");
                    setCurrentStep("step1");
                    setSelectedFromCSDT([]);
                    setSelectedFromDestino([]);
                  }}
                  className="text-black"
                  placeholder="Selecione a escola de destino"
                  isClearable
                />
              </label>

              {exchangeToSchool && (
                <div>
                  <div className="flex items-center justify-between mb-4 p-2 bg-gray-100 dark:bg-zinc-700 rounded">
                    <div className={`px-3 py-1 rounded ${currentStep === "step1" ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-700"}`}>
                      Etapa 1: CSDT → {exchangeToSchool}
                    </div>
                    <div className="text-gray-400">→</div>
                    <div className={`px-3 py-1 rounded ${currentStep === "step2" ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-700"}`}>
                      Etapa 2: {exchangeToSchool} → CSDT
                    </div>
                  </div>

                  {/* ETAPA 1 */}
                  {currentStep === "step1" && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="dark:text-gray-300 font-semibold">
                          Equipamentos que vao do CSDT para {exchangeToSchool}
                        </span>
                        <span className="text-sm text-gray-500">{selectedFromCSDT.length} selecionados</span>
                      </div>
                      <div className="my-2">
                        <input
                          type="text"
                          placeholder="Pesquisar equipamento..."
                          value={localSearchTroca1}
                          onChange={(e) => setLocalSearchTroca1(e.target.value)}
                          className="w-full p-2 rounded dark:bg-zinc-800 dark:text-white bg-gray-100 border dark:border-zinc-700"
                        />
                      </div>
                      <div className="max-h-32 overflow-y-auto bg-white dark:bg-zinc-800 rounded border divide-y divide-gray-200 dark:divide-zinc-700">
                        {items
                          .filter(
                            (item) =>
                              item.School?.name === "CSDT" &&
                              (item.name.toLowerCase().includes(localSearchTroca1.toLowerCase()) ||
                                item.brand.toLowerCase().includes(localSearchTroca1.toLowerCase()) ||
                                item.serialNumber.toLowerCase().includes(localSearchTroca1.toLowerCase())),
                          )
                          .map((item, idx) => (
                            <label
                              key={item.id}
                              className={`flex items-center gap-2 text-xs px-2 py-2 cursor-pointer transition
                                ${idx % 2 === 0 ? "bg-gray-50 dark:bg-zinc-900" : "bg-white dark:bg-zinc-800"}
                                hover:bg-blue-100 dark:hover:bg-blue-900 rounded`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedFromCSDT.includes(item.id)}
                                onChange={() => {
                                  setSelectedFromCSDT((prev) => {
                                    if (prev.includes(item.id)) return prev.filter((id) => id !== item.id);
                                    if (prev.length >= 10) {
                                      setModalMessage(`🚫 Limite excedido!\n\nVoce tentou selecionar ${prev.length + 1} itens do CSDT, mas o maximo permitido sao 10 itens por categoria.\n\nPor favor, desmarque alguns itens antes de continuar.`);
                                      setModalIsOpen(true);
                                      return prev;
                                    }
                                    return [...prev, item.id];
                                  });
                                }}
                                className="accent-blue-500"
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-gray-500 dark:text-gray-400">{item.brand} • {item.serialNumber}</span>
                                <span className="text-gray-400 text-[10px]">
                                  Criado em: {format(new Date(item.createdAt), "dd/MM/yyyy")}
                                </span>
                              </div>
                            </label>
                          ))}
                      </div>
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={() => {
                            if (selectedFromCSDT.length === 0) {
                              alert("Selecione pelo menos um item para continuar.");
                              return;
                            }
                            setCurrentStep("step2");
                          }}
                          disabled={selectedFromCSDT.length === 0}
                          className={`px-4 py-2 rounded ${selectedFromCSDT.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-700"} text-white`}
                        >
                          Confirmar e Proximo ({selectedFromCSDT.length} itens)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ETAPA 2 */}
                  {currentStep === "step2" && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="dark:text-gray-300 font-semibold">
                          Equipamentos que vao de {exchangeToSchool} para o CSDT
                        </span>
                        <span className="text-sm text-gray-500">{selectedFromDestino.length} selecionados</span>
                      </div>
                      <div className="my-2">
                        <input
                          type="text"
                          placeholder="Pesquisar equipamento..."
                          value={localSearchTroca2}
                          onChange={(e) => setLocalSearchTroca2(e.target.value)}
                          className="w-full p-2 rounded dark:bg-zinc-800 dark:text-white bg-gray-100 border dark:border-zinc-700"
                        />
                      </div>
                      <div className="max-h-32 overflow-y-auto bg-white dark:bg-zinc-800 rounded border divide-y divide-gray-200 dark:divide-zinc-700">
                        {items
                          .filter(
                            (item) =>
                              item.School?.name === exchangeToSchool &&
                              (item.name.toLowerCase().includes(localSearchTroca2.toLowerCase()) ||
                                item.brand.toLowerCase().includes(localSearchTroca2.toLowerCase()) ||
                                item.serialNumber.toLowerCase().includes(localSearchTroca2.toLowerCase())),
                          )
                          .map((item, idx) => (
                            <label
                              key={item.id}
                              className={`flex items-center gap-2 text-xs px-2 py-2 cursor-pointer transition
                                ${idx % 2 === 0 ? "bg-gray-50 dark:bg-zinc-900" : "bg-white dark:bg-zinc-800"}
                                hover:bg-blue-100 dark:hover:bg-blue-900 rounded`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedFromDestino.includes(item.id)}
                                onChange={() => {
                                  setSelectedFromDestino((prev) => {
                                    if (prev.includes(item.id)) return prev.filter((id) => id !== item.id);
                                    if (prev.length >= 10) {
                                      setModalMessage(`🚫 Limite excedido!\n\nVoce tentou selecionar ${prev.length + 1} itens da escola ${exchangeToSchool}, mas o maximo permitido sao 10 itens por categoria.\n\nPor favor, desmarque alguns itens antes de continuar.`);
                                      setModalIsOpen(true);
                                      return prev;
                                    }
                                    return [...prev, item.id];
                                  });
                                }}
                                className="accent-blue-500"
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-gray-500 dark:text-gray-400">{item.brand} • {item.serialNumber}</span>
                                <span className="text-gray-400 text-[10px]">
                                  Criado em: {format(new Date(item.createdAt), "dd/MM/yyyy")}
                                </span>
                              </div>
                            </label>
                          ))}
                      </div>
                      <div className="flex justify-between mt-4">
                        <button
                          onClick={() => setCurrentStep("step1")}
                          className="px-4 py-2 bg-gray-500 hover:bg-gray-700 text-white rounded"
                        >
                          ← Voltar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* NUMERO AUTOMATICO */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
            <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
              📋 Numero do memorando sera gerado automaticamente
            </span>
            <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">
              Formato: [Sequencial]/[Ano] (ex: 1/2025, 2/2025...)
            </p>
          </div>

          {/* PREVIEW DOS ITENS SELECIONADOS */}
          <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded border">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              📋 Itens Selecionados:{" "}
              {memorandumType === "entrega" ? (
                <span>{selectedFromCSDT.length}</span>
              ) : memorandumType === "devolucao" ? (
                <span>{selectedFromDestino.length}</span>
              ) : memorandumType === "troca" ? (
                selectedFromCSDT.length + selectedFromDestino.length
              ) : (
                0
              )}
            </p>

            {((memorandumType === "entrega" && selectedFromCSDT.length > 0) ||
              (memorandumType === "devolucao" && selectedFromDestino.length > 0)) && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                📄 Serao geradas {Math.ceil(selectedFromCSDT.length / ITEMS_PER_PAGE)} pagina(s)
              </p>
            )}

            <div className="max-h-24 overflow-y-auto">
              {memorandumType === "entrega" && (
                <>
                  {items
                    .filter((item) => selectedFromCSDT.includes(item.id))
                    .map((item) => (
                      <p key={item.id} className="text-xs text-gray-600 dark:text-gray-400">
                        • {item.name} - {item.brand} ({item.serialNumber})
                      </p>
                    ))}
                </>
              )}

              {memorandumType === "devolucao" && (
                <>
                  {items
                    .filter((item) => selectedFromDestino.includes(item.id))
                    .map((item) => (
                      <p key={item.id} className="text-xs text-gray-600 dark:text-gray-400">
                        • {item.name} - {item.brand} ({item.serialNumber})
                      </p>
                    ))}
                </>
              )}

              {memorandumType === "troca" && (
                <>
                  {selectedFromCSDT.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        🔄 CSDT → {exchangeToSchool}:
                      </p>
                      {items
                        .filter((item) => selectedFromCSDT.includes(item.id))
                        .map((item) => (
                          <p key={item.id} className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                            • {item.name} - {item.brand} ({item.serialNumber})
                          </p>
                        ))}
                    </div>
                  )}
                  {selectedFromDestino.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                        🔄 {exchangeToSchool} → CSDT:
                      </p>
                      {items
                        .filter((item) => selectedFromDestino.includes(item.id))
                        .map((item) => (
                          <p key={item.id} className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                            • {item.name} - {item.brand} ({item.serialNumber})
                          </p>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <AlertDialogFooter className="flex-shrink-0 border-t pt-4">
          <AlertDialogCancel
            onClick={handleCancel}
            className="hover:bg-red-300 dark:text-white"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleGenerateMemorandum}
            className="bg-blue-500 hover:bg-blue-700 text-white"
          >
            {memorandumType === "entrega" ? "📦 Gerar Entrega" : "🔄 Gerar Troca"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeviceListMemorandumDialog;
