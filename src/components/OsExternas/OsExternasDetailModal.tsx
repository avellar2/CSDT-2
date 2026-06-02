import React from "react";
import { Button } from "@/components/ui/button";
import { formatDateShort, formatDateTime } from "@/utils/date";
import type { OsExterna } from "@/hooks/useOsExternasList";

interface OsExternasDetailModalProps {
  showModal: boolean;
  selectedOs: OsExterna | null;
  closeModal: () => void;
}

const OsExternasDetailModal: React.FC<OsExternasDetailModalProps> = ({
  showModal,
  selectedOs,
  closeModal,
}) => {
  if (!showModal || !selectedOs) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {selectedOs.unidadeEscolar}
                {selectedOs.motivoRecusa && (
                  <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800 border-2 border-red-500">
                    RECUSADA
                  </span>
                )}
              </h3>
              <p className="text-gray-600">OS Externa - Detalhes Completos</p>
            </div>
            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-2xl">
              ✕
            </button>
          </div>

          {/* Informacoes Principais */}
          <div className="bg-white border border-gray-200 rounded-lg mb-6">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-1/3">
                    Tecnico Responsavel
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {(() => {
                      if (selectedOs.tecnicoResponsavel?.includes(" / ")) {
                        const tecnicos = selectedOs.tecnicoResponsavel.split(" / ");
                        const principal = tecnicos[0];
                        const parceiros = tecnicos.slice(1);
                        return (
                          <div className="space-y-2">
                            <div>
                              <span className="font-semibold text-blue-600">{principal}</span>
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                Tecnico
                              </span>
                            </div>
                            <div className="pl-4 border-l-2 border-gray-300">
                              <div className="text-sm text-gray-600 font-medium mb-1">Tecnicos Parceiros:</div>
                              {parceiros.map((parceiro, idx) => (
                                <div key={idx} className="flex items-center gap-2 mb-1">
                                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                  <span className="text-gray-700">{parceiro}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return <span className="font-semibold">{selectedOs.tecnicoResponsavel}</span>;
                    })()}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">Numero OS</td>
                  <td className="px-4 py-3 text-gray-900">{selectedOs.numeroOs}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">Assinatura</td>
                  <td className="px-4 py-3 text-gray-900">
                    {selectedOs.status === "Assinado" ? selectedOs.assinado : "Pendente"}
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">CPF/Matricula</td>
                  <td className="px-4 py-3 text-gray-900">{selectedOs.cpf || "Nao informado"}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">Data</td>
                  <td className="px-4 py-3 text-gray-900">{selectedOs.data}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">Hora</td>
                  <td className="px-4 py-3 text-gray-900">{selectedOs.hora}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">Status</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedOs.motivoRecusa ? "bg-red-100 text-red-800" : selectedOs.status === "Pendente" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}`}>
                      {selectedOs.motivoRecusa ? "Recusado" : selectedOs.status === "Pendente" ? "Pendente" : "Confirmada"}
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">E-mail Responsavel</td>
                  <td className="px-4 py-3 text-gray-900">{selectedOs.emailResponsavel}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">Cargo do Responsavel</td>
                  <td className="px-4 py-3 text-gray-900">{selectedOs.cargoResponsavel || "Nao informado"}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">Tem Laboratorio?</td>
                  <td className="px-4 py-3 text-gray-900">{selectedOs.temLaboratorio ? "Sim" : "Nao"}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">Diretora Estava na Escola?</td>
                  <td className="px-4 py-3">
                    {selectedOs.diretoraNaEscola === true ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">✅ Sim</span>
                    ) : selectedOs.diretoraNaEscola === false ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">❌ Nao</span>
                    ) : (
                      <span className="text-gray-500">Nao informado</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Motivo da Recusa */}
          {selectedOs.motivoRecusa && (
            <div className="bg-red-50 border-2 border-red-400 rounded-lg mb-6 p-4">
              <div className="flex items-start">
                <div className="bg-red-500 rounded-full w-10 h-10 flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-white font-bold text-lg">!</span>
                </div>
                <div>
                  <h4 className="font-bold text-red-800 text-lg">Recusada pelo Diretor</h4>
                  <p className="text-red-700 mt-1">
                    <span className="font-medium">Responsável:</span> {selectedOs.assinado}
                    {selectedOs.cargoResponsavel && <span> | {selectedOs.cargoResponsavel}</span>}
                  </p>
                  <p className="text-red-700 mt-1">
                    <span className="font-medium">Motivo:</span> {selectedOs.motivoRecusa}
                  </p>
                  {selectedOs.recusadoEm && (
                    <p className="text-red-600 text-sm mt-1">
                      Recusado em {new Date(selectedOs.recusadoEm).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Solicitacao da Visita */}
          <div className="bg-white border border-gray-200 rounded-lg mb-6">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="font-bold text-gray-700">Solicitacao da Visita</h4>
            </div>
            <div className="px-4 py-3">
              <p className="text-gray-900 whitespace-pre-wrap">{selectedOs.solicitacaoDaVisita}</p>
            </div>
          </div>

          {/* Relatorio */}
          {selectedOs.relatorio && (
            <div className="bg-white border border-gray-200 rounded-lg mb-6">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-bold text-gray-700">Relatorio</h4>
              </div>
              <div className="px-4 py-3">
                <p className="text-gray-900 whitespace-pre-wrap">{selectedOs.relatorio}</p>
              </div>
            </div>
          )}

          {/* Equipamentos - Laboratorio */}
          <div className="bg-white border border-gray-200 rounded-lg mb-6">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="font-bold text-gray-700">Equipamentos - Laboratorio</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Item</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Proprio</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Locado</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["PC", selectedOs.pcsProprio, selectedOs.pcsLocado],
                    ["Notebook", selectedOs.notebooksProprio, selectedOs.notebooksLocado],
                    ["Tablet", selectedOs.tabletsProprio, selectedOs.tabletsLocado],
                    ["Monitor", selectedOs.monitoresProprio, selectedOs.monitoresLocado],
                    ["Estabilizador", selectedOs.estabilizadoresProprio, selectedOs.estabilizadoresLocado],
                  ].map(([label, proprio, locado]) => (
                    <tr key={label as string} className="border-b border-gray-200">
                      <td className="px-4 py-2 font-medium text-gray-700">{label as string}</td>
                      <td className="px-4 py-2 text-center text-gray-900">{(proprio as number) || 0}</td>
                      <td className="px-4 py-2 text-center text-gray-900">{(locado as number) || 0}</td>
                      <td className="px-4 py-2 text-center font-medium text-gray-900">
                        {((proprio as number) || 0) + ((locado as number) || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Equipamentos - Outros Locais */}
          <div className="bg-white border border-gray-200 rounded-lg mb-6">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="font-bold text-gray-700">Equipamentos - Outros Locais</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Item</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Proprio</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Locado</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["PC", selectedOs.pcsProprioOutrosLocais, selectedOs.pcsLocadoOutrosLocais],
                    ["Notebook", selectedOs.notebooksProprioOutrosLocais, selectedOs.notebooksLocadoOutrosLocais],
                    ["Tablet", selectedOs.tabletsProprioOutrosLocais, selectedOs.tabletsLocadoOutrosLocais],
                    ["Monitor", selectedOs.monitoresProprioOutrosLocais, selectedOs.monitoresLocadoOutrosLocais],
                    ["Estabilizador", selectedOs.estabilizadoresProprioOutrosLocais, selectedOs.estabilizadoresLocadoOutrosLocais],
                  ].map(([label, proprio, locado]) => (
                    <tr key={label as string} className="border-b border-gray-200">
                      <td className="px-4 py-2 font-medium text-gray-700">{label as string}</td>
                      <td className="px-4 py-2 text-center text-gray-900">{(proprio as number) || 0}</td>
                      <td className="px-4 py-2 text-center text-gray-900">{(locado as number) || 0}</td>
                      <td className="px-4 py-2 text-center font-medium text-gray-900">
                        {((proprio as number) || 0) + ((locado as number) || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Impressoras */}
          <div className="bg-white border border-gray-200 rounded-lg mb-6">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="font-bold text-gray-700">Impressoras</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Item</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">OKI</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Kyocera</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">HP</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Ricoh</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Outras</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-2 font-medium text-gray-700">Impressora</td>
                    <td className="px-4 py-2 text-center text-gray-900">{selectedOs.oki || 0}</td>
                    <td className="px-4 py-2 text-center text-gray-900">{selectedOs.kyocera || 0}</td>
                    <td className="px-4 py-2 text-center text-gray-900">{selectedOs.hp || 0}</td>
                    <td className="px-4 py-2 text-center text-gray-900">{selectedOs.ricoh || 0}</td>
                    <td className="px-4 py-2 text-center text-gray-900">{selectedOs.outrasImpressoras || 0}</td>
                    <td className="px-4 py-2 text-center font-medium text-gray-900">
                      {(selectedOs.oki || 0) + (selectedOs.kyocera || 0) + (selectedOs.hp || 0) + (selectedOs.ricoh || 0) + (selectedOs.outrasImpressoras || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Problemas com Impressoras */}
          {selectedOs.temImpressoraComProblema !== undefined && (
            <div className="bg-white border border-gray-200 rounded-lg mb-6">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <h4 className="font-bold text-gray-700">Problemas com Impressoras</h4>
              </div>
              <div className="px-4 py-3">
                <div className="mb-3">
                  <span className="font-medium text-gray-700">Existe impressora com problema?</span>
                  <span className="ml-3">
                    {selectedOs.temImpressoraComProblema === true ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">⚠️ Sim - Ha problema</span>
                    ) : selectedOs.temImpressoraComProblema === false ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">✅ Nao - Tudo funcionando</span>
                    ) : (
                      <span className="text-gray-500">Nao informado</span>
                    )}
                  </span>
                </div>

                {selectedOs.temImpressoraComProblema === true && (
                  <div className="mt-4 space-y-4">
                    {selectedOs.relatorioImpressora && (
                      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                        <div className="flex items-start">
                          <div className="flex-shrink-0"><span className="text-lg">📝</span></div>
                          <div className="ml-3 flex-1">
                            <h5 className="text-sm font-bold text-red-900 mb-2">Relatorio do Problema</h5>
                            <p className="text-sm text-red-800 whitespace-pre-wrap">{selectedOs.relatorioImpressora}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedOs.impressoraComProblema && (
                      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
                        <div className="flex items-start">
                          <div className="flex-shrink-0"><span className="text-lg">🖨️</span></div>
                          <div className="ml-3 flex-1">
                            <h5 className="text-sm font-bold text-orange-900 mb-2">Identificacao da Impressora</h5>
                            <p className="text-sm text-orange-800 font-mono">{selectedOs.impressoraComProblema}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internet e Rede */}
          <div className="bg-white border border-gray-200 rounded-lg mb-6">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="font-bold text-gray-700">Internet e Rede</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Item</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Rede BR</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Educacao Conectada</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Nao Ha Provedor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-2 font-medium text-gray-700">Internet</td>
                    <td className="px-4 py-2 text-center text-gray-900">{selectedOs.redeBr || "-"}</td>
                    <td className="px-4 py-2 text-center text-gray-900">{selectedOs.educacaoConectada || "-"}</td>
                    <td className="px-4 py-2 text-center text-gray-900">{selectedOs.naoHaProvedor || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4">
                <div><span className="font-medium text-gray-700">Rack:</span><span className="ml-2 text-gray-900">{selectedOs.rack || 0}</span></div>
                <div><span className="font-medium text-gray-700">Switch:</span><span className="ml-2 text-gray-900">{selectedOs.switch || 0}</span></div>
                <div><span className="font-medium text-gray-700">Roteador:</span><span className="ml-2 text-gray-900">{selectedOs.roteador || 0}</span></div>
              </div>
            </div>
          </div>

          {/* Pecas ou Material */}
          {selectedOs.pecasOuMaterial && (
            <div className="bg-white border border-gray-200 rounded-lg mb-6">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-bold text-gray-700">Pecas ou Material</h4>
              </div>
              <div className="px-4 py-3">
                <p className="text-gray-900 whitespace-pre-wrap">{selectedOs.pecasOuMaterial}</p>
              </div>
            </div>
          )}

          {/* Solucionado */}
          {selectedOs.solucionado && (
            <div className="bg-white border border-gray-200 rounded-lg mb-6">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-bold text-gray-700">Problema Solucionado</h4>
              </div>
              <div className="px-4 py-3">
                <p className="text-gray-900 whitespace-pre-wrap">{selectedOs.solucionado}</p>
              </div>
            </div>
          )}

          {/* Fotos Antes */}
          {selectedOs.fotosAntes && selectedOs.fotosAntes.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg mb-6">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-bold text-gray-700">Fotos Antes</h4>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedOs.fotosAntes.map((foto, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={foto}
                        alt={`Antes ${index + 1}`}
                        className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(foto, "_blank")}
                      />
                      <p className="text-center text-sm text-gray-600 mt-1">Foto Antes {index + 1}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Fotos Depois */}
          {selectedOs.fotosDepois && selectedOs.fotosDepois.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg mb-6">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-bold text-gray-700">Fotos Depois</h4>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedOs.fotosDepois.map((foto, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={foto}
                        alt={`Depois ${index + 1}`}
                        className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(foto, "_blank")}
                      />
                      <p className="text-center text-sm text-gray-600 mt-1">Foto Depois {index + 1}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Informacoes do Sistema */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg">
            <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
              <h4 className="font-bold text-gray-700">Informacoes do Sistema</h4>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div><span className="font-medium text-gray-700">ID da OS:</span><span className="ml-2 text-gray-900">{selectedOs.id}</span></div>
                <div><span className="font-medium text-gray-700">Criada em:</span><span className="ml-2 text-gray-900">{formatDateTime(selectedOs.createdAt)}</span></div>
                <div><span className="font-medium text-gray-700">Atualizada em:</span><span className="ml-2 text-gray-900">{formatDateTime(selectedOs.updatedAt)}</span></div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={closeModal} className="bg-gray-500 hover:bg-gray-600 text-white">
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OsExternasDetailModal;
