import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
  FileText,
  Calendar,
  MapPin,
  User,
  Package,
  CaretLeft,
  CaretRight,
  Eye,
  Buildings,
  ArrowsClockwise,
  X,
  ListChecks,
  Hash,
  Tag,
  FilePdf,
  Download,
  Trash,
  Warning,
  PencilSimple,
  Plus,
  Minus,
  MagnifyingGlass
} from 'phosphor-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MemorandumItem {
  id: number;
  Item: {
    id: number;
    name: string;
    brand: string;
    serialNumber: string;
  };
}

interface Memorandum {
  id: number;
  number: string;
  schoolName: string;
  district: string;
  generatedBy: string;
  type: 'entrega' | 'troca';
  fromSchoolName?: string;
  toSchoolName?: string;
  createdAt: string;
  updatedAt: string;
  items: MemorandumItem[];
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface AvailableItem {
  id: number;
  name: string;
  brand: string;
  serialNumber: string;
  status: string;
  schoolName: string;
  schoolId: number | null;
}

const NewMemorandumsPage: React.FC = () => {
  const router = useRouter();
  const [memorandums, setMemorandums] = useState<Memorandum[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemorandum, setSelectedMemorandum] = useState<Memorandum | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [memorandumToCancel, setMemorandumToCancel] = useState<Memorandum | null>(null);

  // Estados para o modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [memorandumToEdit, setMemorandumToEdit] = useState<Memorandum | null>(null);
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [loadingAvailableItems, setLoadingAvailableItems] = useState(false);
  const [itemsToRemove, setItemsToRemove] = useState<number[]>([]);
  const [itemsToAdd, setItemsToAdd] = useState<number[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSearchTerm, setEditSearchTerm] = useState('');

  const fetchMemorandums = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(`/api/get-new-memorandums?page=${page}&limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMemorandums(response.data.memorandums);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Erro ao buscar memorandos:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemorandums();
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchMemorandums(newPage);
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'entrega' ? '📦' : '🔄';
  };

  const getTypeColor = (type: string) => {
    return type === 'entrega' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
  };

  const filteredMemorandums = memorandums.filter(memorandum =>
    memorandum.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    memorandum.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    memorandum.generatedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openItemsModal = (memorandum: Memorandum) => {
    setSelectedMemorandum(memorandum);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMemorandum(null);
  };

  const generatePDF = async (memorandum: Memorandum) => {
    try {
      setGeneratingPdfId(memorandum.id);
      
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Token não encontrado');
        return;
      }

      console.log('Regenerando PDF para memorando:', memorandum.id);

      const response = await axios.post(
        '/api/regenerate-memorandum-pdf',
        { memorandumId: memorandum.id },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Decodificar o PDF Base64
      const pdfBase64 = response.data.pdfBase64;
      const binaryString = atob(pdfBase64);
      const binaryLen = binaryString.length;
      const bytes = new Uint8Array(binaryLen);

      for (let i = 0; i < binaryLen; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pdfBlob = new Blob([bytes], { type: "application/pdf" });

      // Criar um link para download
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = memorandum.type === "entrega"
        ? `memorando-entrega-${memorandum.number}.pdf`
        : `memorando-troca-${memorandum.number}.pdf`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      // Limpar a URL do objeto para liberar memória
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      if (axios.isAxiosError(error)) {
        alert(`Erro ao gerar PDF: ${error.response?.data?.error || error.message}`);
      } else {
        alert('Erro desconhecido ao gerar PDF');
      }
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const openCancelConfirm = (memorandum: Memorandum) => {
    setMemorandumToCancel(memorandum);
    setShowCancelConfirm(true);
  };

  const closeCancelConfirm = () => {
    setShowCancelConfirm(false);
    setMemorandumToCancel(null);
  };

  const confirmCancel = async () => {
    if (!memorandumToCancel) return;

    try {
      setCancellingId(memorandumToCancel.id);

      const token = localStorage.getItem('token');
      if (!token) {
        alert('Token não encontrado');
        return;
      }

      console.log('Cancelando memorando:', memorandumToCancel.id);

      const response = await axios.post(
        '/api/cancel-memorandum',
        { memorandumId: memorandumToCancel.id },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert(
        `Memorando #${response.data.memorandumNumber} cancelado com sucesso!\n` +
        `${response.data.restoredItems} itens foram restaurados para suas localizações anteriores.`
      );

      // Recarregar a lista de memorandos
      await fetchMemorandums(pagination.currentPage);

      closeCancelConfirm();
    } catch (error) {
      console.error('Erro ao cancelar memorando:', error);
      if (axios.isAxiosError(error)) {
        alert(`Erro ao cancelar memorando: ${error.response?.data?.error || error.message}`);
      } else {
        alert('Erro desconhecido ao cancelar memorando');
      }
    } finally {
      setCancellingId(null);
    }
  };

  // ========== FUNÇÕES DE EDIÇÃO ==========

  const openEditModal = async (memorandum: Memorandum) => {
    setMemorandumToEdit(memorandum);
    setShowEditModal(true);
    setItemsToRemove([]);
    setItemsToAdd([]);
    setEditSearchTerm('');

    // Buscar itens disponíveis
    await fetchAvailableItems(memorandum.id);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setMemorandumToEdit(null);
    setAvailableItems([]);
    setItemsToRemove([]);
    setItemsToAdd([]);
    setEditSearchTerm('');
  };

  const fetchAvailableItems = async (memorandumId: number) => {
    try {
      setLoadingAvailableItems(true);
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Token não encontrado');
        return;
      }

      const response = await axios.get(
        `/api/get-available-items-for-memorandum?memorandumId=${memorandumId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAvailableItems(response.data.NewMemorandumItem || []);
    } catch (error) {
      console.error('Erro ao buscar itens disponíveis:', error);
      if (axios.isAxiosError(error)) {
        alert(`Erro: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setLoadingAvailableItems(false);
    }
  };

  const toggleItemToRemove = (itemId: number) => {
    setItemsToRemove(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleItemToAdd = (itemId: number) => {
    setItemsToAdd(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const saveEdit = async () => {
    if (!memorandumToEdit) return;

    if (itemsToAdd.length === 0 && itemsToRemove.length === 0) {
      alert('Nenhuma alteração foi feita.');
      return;
    }

    try {
      setSavingEdit(true);

      const token = localStorage.getItem('token');
      if (!token) {
        alert('Token não encontrado');
        return;
      }

      const response = await axios.post(
        '/api/edit-memorandum',
        {
          memorandumId: memorandumToEdit.id,
          itemsToAdd: itemsToAdd,
          itemsToRemove: itemsToRemove,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(
        `Memorando #${response.data.memorandumNumber} editado com sucesso!\n` +
        `${response.data.addedItems} itens adicionados.\n` +
        `${response.data.removedItems} itens removidos.`
      );

      // Recarregar a lista de memorandos
      await fetchMemorandums(pagination.currentPage);

      closeEditModal();
    } catch (error) {
      console.error('Erro ao editar memorando:', error);
      if (axios.isAxiosError(error)) {
        alert(`Erro ao editar memorando: ${error.response?.data?.error || error.message}`);
      } else {
        alert('Erro desconhecido ao editar memorando');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  // Filtrar itens disponíveis pela busca
  const filteredAvailableItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(editSearchTerm.toLowerCase()) ||
    item.brand.toLowerCase().includes(editSearchTerm.toLowerCase()) ||
    item.serialNumber.toLowerCase().includes(editSearchTerm.toLowerCase()) ||
    item.schoolName.toLowerCase().includes(editSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
       
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <span className="ml-4 text-lg text-gray-600 dark:text-gray-300">Carregando memorandos...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      
      
      <div className="container mx-auto px-4 py-8">
        {/* Header da página */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-500 rounded-lg">
              <FileText size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Todos os Memorandos (Novo)
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Sistema de numeração automática • Total: {pagination.totalCount} memorandos
              </p>
            </div>
          </div>

          {/* Barra de pesquisa */}
          <div className="relative">
            <input
              type="text"
              placeholder="Pesquisar por número, escola ou gerado por..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-zinc-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <Eye className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Grid de memorandos */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMemorandums.map((memorandum) => (
            <div
              key={memorandum.id}
              className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 
                       hover:shadow-md transition-all duration-200 group"
            >
              {/* Header do card */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <span className="text-lg">{getTypeIcon(memorandum.type)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        #{memorandum.number}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(memorandum.type)}`}>
                        {memorandum.type === 'entrega' ? 'Entrega' : 'Troca'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informações da escola */}
                <div className="space-y-3 mb-4">
                  {memorandum.type === 'entrega' ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Buildings size={16} />
                      <span className="font-medium">Para:</span>
                      <span className="text-gray-900 dark:text-white">{memorandum.schoolName}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <ArrowsClockwise size={16} />
                        <span className="font-medium">De:</span>
                        <span className="text-gray-900 dark:text-white">{memorandum.fromSchoolName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Buildings size={16} />
                        <span className="font-medium">Para:</span>
                        <span className="text-gray-900 dark:text-white">{memorandum.toSchoolName}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin size={16} />
                    <span>Distrito {memorandum.district}</span>
                  </div>
                </div>

                {/* Informações dos itens */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Package size={16} />
                    <span>{memorandum.items.length} itens</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openItemsModal(memorandum)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 
                               bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 
                               rounded-full transition-colors duration-200"
                    >
                      <Eye size={14} />
                      Ver itens
                    </button>
                    <button
                      onClick={() => generatePDF(memorandum)}
                      disabled={generatingPdfId === memorandum.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400
                               bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30
                               rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Gerar PDF do memorando"
                    >
                      {generatingPdfId === memorandum.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-red-600 border-t-transparent"></div>
                          Gerando...
                        </>
                      ) : (
                        <>
                          <FilePdf size={14} />
                          PDF
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => openEditModal(memorandum)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400
                               bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30
                               rounded-full transition-colors duration-200"
                      title="Editar memorando (adicionar ou remover itens)"
                    >
                      <PencilSimple size={14} />
                      Editar
                    </button>
                    <button
                      onClick={() => openCancelConfirm(memorandum)}
                      disabled={cancellingId === memorandum.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400
                               bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30
                               rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cancelar memorando e restaurar itens"
                    >
                      {cancellingId === memorandum.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-rose-600 border-t-transparent"></div>
                          Cancelando...
                        </>
                      ) : (
                        <>
                          <Trash size={14} />
                          Cancelar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer do card */}
                <div className="pt-4 border-t border-gray-100 dark:border-zinc-700">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      <span>{memorandum.generatedBy}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>
                        {format(new Date(memorandum.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mensagem quando não há memorandos */}
        {filteredMemorandums.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-100 dark:bg-zinc-800 rounded-full w-16 h-16 mx-auto mb-4">
              <FileText size={32} className="text-gray-400 mx-auto mt-2" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Nenhum memorando encontrado
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Tente ajustar os filtros de pesquisa.' : 'Ainda não há memorandos cadastrados no sistema novo.'}
            </p>
          </div>
        )}

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Página {pagination.currentPage} de {pagination.totalPages} • 
              {' '}{pagination.totalCount} memorandos no total
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrev}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300
                         hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CaretLeft size={16} />
              </button>
              
              <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {pagination.currentPage}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNext}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300
                         hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CaretRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Modal para visualizar itens */}
        {isModalOpen && selectedMemorandum && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={closeModal}
            ></div>
            
            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-800 rounded-xl shadow-xl">
                {/* Header do modal */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <ListChecks size={20} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Itens do Memorando #{selectedMemorandum.number}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedMemorandum.items.length} {selectedMemorandum.items.length === 1 ? 'item' : 'itens'} • 
                        {' '}{selectedMemorandum.type === 'entrega' ? 'Entrega' : 'Troca'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                {/* Conteúdo do modal */}
                <div className="p-6">
                  {/* Informações do memorando */}
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar size={16} />
                        <span>{format(new Date(selectedMemorandum.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <User size={16} />
                        <span>{selectedMemorandum.generatedBy}</span>
                      </div>
                      {selectedMemorandum.type === 'entrega' ? (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Buildings size={16} />
                          <span>{selectedMemorandum.schoolName}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <ArrowsClockwise size={16} />
                            <span>De: {selectedMemorandum.fromSchoolName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Buildings size={16} />
                            <span>Para: {selectedMemorandum.toSchoolName}</span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin size={16} />
                        <span>Distrito {selectedMemorandum.district}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Tag size={16} />
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedMemorandum.type)}`}>
                          {selectedMemorandum.type === 'entrega' ? 'Entrega' : 'Troca'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de itens */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Equipamentos ({selectedMemorandum.items.length})
                    </h4>
                    {selectedMemorandum.items.map((item, index) => (
                      <div 
                        key={item.id}
                        className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-600/50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-gray-900 dark:text-white truncate">
                              {item.Item.name}
                            </h5>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {item.Item.brand}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <Hash size={12} />
                            <span className="font-mono">{item.Item.serialNumber}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer do modal */}
                <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-zinc-700">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                             bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 
                             rounded-lg transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edição de Memorando */}
        {showEditModal && memorandumToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden">
              {/* Header do modal */}
              <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-full">
                      <PencilSimple size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Editar Memorando</h2>
                      <p className="text-sm text-blue-100">#{memorandumToEdit.number}</p>
                    </div>
                  </div>
                  <button
                    onClick={closeEditModal}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={24} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Conteúdo do modal */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {/* Info do memorando */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-blue-900 dark:text-blue-200">Tipo:</span>{' '}
                      <span className="text-blue-700 dark:text-blue-300">
                        {memorandumToEdit.type === 'entrega' ? 'Entrega' : 'Troca'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-blue-900 dark:text-blue-200">Escola:</span>{' '}
                      <span className="text-blue-700 dark:text-blue-300">{memorandumToEdit.schoolName}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-blue-900 dark:text-blue-200">Distrito:</span>{' '}
                      <span className="text-blue-700 dark:text-blue-300">{memorandumToEdit.district}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-blue-900 dark:text-blue-200">Gerado por:</span>{' '}
                      <span className="text-blue-700 dark:text-blue-300">{memorandumToEdit.generatedBy}</span>
                    </div>
                  </div>
                </div>

                {/* Seção: Itens Atuais do Memorando */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <ListChecks size={20} />
                    Itens Atuais do Memorando ({memorandumToEdit.items.length})
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Marque os itens que deseja <strong className="text-rose-600">remover</strong> do memorando:
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {memorandumToEdit.items.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-600 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={itemsToRemove.includes(item.Item.id)}
                          onChange={() => toggleItemToRemove(item.Item.id)}
                          className="w-4 h-4 text-rose-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {item.Item.name} - {item.Item.brand}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            SN: {item.Item.serialNumber}
                          </div>
                        </div>
                        {itemsToRemove.includes(item.Item.id) && (
                          <div className="px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs rounded-full">
                            Será removido
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-zinc-700 my-6"></div>

                {/* Seção: Adicionar Novos Itens */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Plus size={20} />
                    Adicionar Novos Itens
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Marque os itens que deseja <strong className="text-green-600">adicionar</strong> ao memorando:
                  </p>

                  {/* Campo de busca */}
                  <div className="mb-3 relative">
                    <MagnifyingGlass
                      size={20}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Buscar por nome, marca, série ou escola..."
                      value={editSearchTerm}
                      onChange={(e) => setEditSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg
                               bg-white dark:bg-zinc-700 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {loadingAvailableItems ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando itens...</span>
                    </div>
                  ) : filteredAvailableItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {editSearchTerm ? 'Nenhum item encontrado com esse filtro.' : 'Todos os itens já estão no memorando.'}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {filteredAvailableItems.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-600 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={itemsToAdd.includes(item.id)}
                            onChange={() => toggleItemToAdd(item.id)}
                            className="w-4 h-4 text-green-600 rounded"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {item.name} - {item.brand}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              <span>SN: {item.serialNumber}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Buildings size={12} />
                                {item.schoolName}
                              </span>
                            </div>
                          </div>
                          {itemsToAdd.includes(item.id) && (
                            <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                              Será adicionado
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumo das alterações */}
                {(itemsToAdd.length > 0 || itemsToRemove.length > 0) && (
                  <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold mb-2">
                      Resumo das alterações:
                    </p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                      {itemsToAdd.length > 0 && (
                        <li className="flex items-center gap-2">
                          <Plus size={16} className="text-green-600" />
                          <span><strong>{itemsToAdd.length}</strong> item(ns) será(ão) adicionado(s)</span>
                        </li>
                      )}
                      {itemsToRemove.length > 0 && (
                        <li className="flex items-center gap-2">
                          <Minus size={16} className="text-rose-600" />
                          <span><strong>{itemsToRemove.length}</strong> item(ns) será(ão) removido(s)</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer do modal */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
                <button
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                           bg-white dark:bg-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-600
                           border border-gray-300 dark:border-zinc-600 rounded-lg transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit || (itemsToAdd.length === 0 && itemsToRemove.length === 0)}
                  className="px-4 py-2 text-sm font-medium text-white
                           bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700
                           rounded-lg transition-all shadow-lg hover:shadow-xl
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
                >
                  {savingEdit ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <PencilSimple size={16} />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Cancelamento */}
        {showCancelConfirm && memorandumToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              {/* Header do modal */}
              <div className="p-6 bg-gradient-to-r from-rose-500 to-pink-600">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-full">
                    <Warning size={24} className="text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Cancelar Memorando</h2>
                </div>
              </div>

              {/* Conteúdo do modal */}
              <div className="p-6">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Tem certeza que deseja cancelar o memorando <strong>#{memorandumToCancel.number}</strong>?
                </p>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                  <div className="flex gap-2">
                    <Warning size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-semibold mb-1">Esta ação irá:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Deletar o memorando permanentemente</li>
                        <li>Restaurar os <strong>{memorandumToCancel.items.length} itens</strong> para suas localizações anteriores</li>
                        <li>Remover o histórico de movimentação deste memorando</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Tipo:</strong> {memorandumToCancel.type === 'entrega' ? 'Entrega' : 'Troca'}<br />
                    <strong>Escola:</strong> {memorandumToCancel.schoolName}<br />
                    <strong>Distrito:</strong> {memorandumToCancel.district}
                  </p>
                </div>
              </div>

              {/* Footer do modal */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
                <button
                  onClick={closeCancelConfirm}
                  disabled={cancellingId !== null}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                           bg-white dark:bg-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-600
                           border border-gray-300 dark:border-zinc-600 rounded-lg transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Não, manter memorando
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancellingId !== null}
                  className="px-4 py-2 text-sm font-medium text-white
                           bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700
                           rounded-lg transition-all shadow-lg hover:shadow-xl
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
                >
                  {cancellingId ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <Trash size={16} />
                      Sim, cancelar memorando
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewMemorandumsPage;