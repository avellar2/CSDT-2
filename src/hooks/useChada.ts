import { supabase } from "@/lib/supabaseClient";
import { uploadChadaFiles } from "@/utils/storageProvider";
import { useEffect, useState, useMemo } from "react";
import { PDFDocument } from "pdf-lib";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type ChadaStatus = 'PENDENTE' | 'RECEBIDO' | 'EM_ANALISE' | 'CONSERTADO' | 'SEM_CONSERTO' | 'DEVOLVIDO';
export type TabType = 'na_chada' | 'devolvidos' | 'todos' | 'diagnosticos';
export type SortField = 'createdAt' | 'updatedAt' | 'sector' | 'problem';
export type SortDirection = 'asc' | 'desc';
export type DiagnosticStatus = 'AGUARDANDO_PECA' | 'PECA_CHEGOU' | 'INSTALADO' | 'CANCELADO';

export interface ChadaItem {
  id: string;
  name: string;
  brand: string;
  serialNumber: string;
  status: string;
  problem: string;
  sector: string;
  userName: string;
  statusChada: ChadaStatus;
  createdAt: string;
  updatedAt: string;
  updateBy?: string;
  osImages?: any[];
  chadaStatus?: ChadaStatus;
  observacoes?: string;
  custoConserto?: number;
  dataEnvio?: string;
  dataDevolucao?: string;
  numeroChadaOS?: string | null;
  emailSentAt?: string | null;
  emailMessageId?: string | null;
  semSerial?: boolean;
}

export interface ChadaDiagnostic {
  id: string;
  itemId: number;
  sectorId: number;
  sectorName: string;
  technicianChada: string;
  diagnostic: string;
  requestedPart: string;
  status: DiagnosticStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  createdBy: string;
  daysWaiting?: number;
  timeWaiting?: string;
  isDelayed?: boolean;
  Item: {
    id: number;
    name: string;
    brand: string;
    serialNumber: string;
  };
  Sector: {
    id: number;
    name: string;
  };
}

export function useChada() {
  // Estados principais
  const [items, setItems] = useState<ChadaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingEmails, setCheckingEmails] = useState(false);

  // Estados para diagnósticos
  const [diagnostics, setDiagnostics] = useState<ChadaDiagnostic[]>([]);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(true);
  const [printers, setPrinters] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);

  // Estados do modal de adicionar
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const [sector, setSector] = useState("");
  const [userName, setUserName] = useState<string | null>(null);
  const [manutencaoSemMovimentacao, setManutencaoSemMovimentacao] = useState(false);
  const [semSerial, setSemSerial] = useState(false);
  const [itemNameSemSerial, setItemNameSemSerial] = useState("");
  const [itemTypeSemSerial, setItemTypeSemSerial] = useState("");
  const [itemBrandSemSerial, setItemBrandSemSerial] = useState("");

  // Estados do modal de baixa/atualização
  const [showBaixaModal, setShowBaixaModal] = useState(false);
  const [baixaItemId, setBaixaItemId] = useState<string | null>(null);
  const [novoModelo, setNovoModelo] = useState("");
  const [novoSerial, setNovoSerial] = useState("");
  const [chadaStatus, setChadaStatus] = useState<ChadaStatus>('CONSERTADO');
  const [observacoes, setObservacoes] = useState("");

  // Estados do modal de diagnóstico
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<any>(null);
  const [selectedSector, setSelectedSector] = useState<any>(null);
  const [technicianChada, setTechnicianChada] = useState("");
  const [diagnostic, setDiagnostic] = useState("");
  const [requestedPart, setRequestedPart] = useState("");

  // Foto anexada ao email (não salva no banco)
  const [chadaPhoto, setChadaPhoto] = useState<File | null>(null);

  // Estado do modal de aviso CSDT
  const [showCsdtWarningModal, setShowCsdtWarningModal] = useState(false);

  // Estados do modal de edição/correção
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editProblem, setEditProblem] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editSemSerial, setEditSemSerial] = useState(false);
  const [editSelectedItem, setEditSelectedItem] = useState<string | null>(null);
  const [editItemNameSemSerial, setEditItemNameSemSerial] = useState("");
  const [editItemTypeSemSerial, setEditItemTypeSemSerial] = useState("");
  const [editItemBrandSemSerial, setEditItemBrandSemSerial] = useState("");

  // Estados do modal de envio de foto
  const [showSendPhotoModal, setShowSendPhotoModal] = useState(false);
  const [sendPhotoItemId, setSendPhotoItemId] = useState<string | null>(null);
  const [sendPhotoFile, setSendPhotoFile] = useState<File | null>(null);
  const [sendingPhoto, setSendingPhoto] = useState(false);

  // Estados do modal de confirmação de cancelamento
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelItemId, setCancelItemId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Estados de UI
  const [activeTab, setActiveTab] = useState<TabType>('na_chada');
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Novos filtros
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [daysInChadaFilter, setDaysInChadaFilter] = useState<string>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<string>('none');

  // Função para calcular dias na CHADA
  const getDaysInChada = (createdAt: string, statusChada: string, updatedAt?: string) => {
    const start = new Date(createdAt);
    const isFinalized = ['DEVOLVIDO', 'CONSERTADO', 'SEM_CONSERTO'].includes(statusChada);
    const end = isFinalized && updatedAt ? new Date(updatedAt) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Função para verificar se item precisa de alerta
  const needsAlert = (item: ChadaItem) => {
    if (item.statusChada === 'DEVOLVIDO' || item.statusChada === 'CONSERTADO' || item.statusChada === 'SEM_CONSERTO') {
      return false;
    }
    return getDaysInChada(item.createdAt, item.statusChada, item.updatedAt) > 15;
  };

  // Filtrar e ordenar itens
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      const tabFilter = () => {
        switch (activeTab) {
          case 'na_chada': return item.statusChada === 'PENDENTE' || item.statusChada === 'RECEBIDO' || item.statusChada === 'EM_ANALISE';
          case 'devolvidos': return item.statusChada === 'DEVOLVIDO' || item.statusChada === 'CONSERTADO' || item.statusChada === 'SEM_CONSERTO';
          case 'todos': return true;
          default: return true;
        }
      };

      const searchFilter = searchTerm === '' ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.problem.toLowerCase().includes(searchTerm.toLowerCase());

      const sectorFilterCheck = sectorFilter === 'all' || item.sector === sectorFilter;
      const statusFilterCheck = statusFilter === 'all' || item.statusChada === statusFilter;

      const periodFilterCheck = () => {
        if (periodFilter === 'all') return true;
        const itemDate = new Date(item.createdAt);
        const now = new Date();
        if (periodFilter === 'custom') {
          if (!customStartDate && !customEndDate) return true;
          const start = customStartDate ? new Date(customStartDate) : new Date(0);
          const end = customEndDate ? new Date(customEndDate) : new Date();
          return itemDate >= start && itemDate <= end;
        }
        const days = parseInt(periodFilter);
        const diffTime = now.getTime() - itemDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= days;
      };

      const daysInChadaCheck = () => {
        if (daysInChadaFilter === 'all') return true;
        const days = getDaysInChada(item.createdAt, item.statusChada, item.updatedAt);
        switch (daysInChadaFilter) {
          case '<15': return days < 15;
          case '>15': return days > 15;
          case '>30': return days > 30;
          default: return true;
        }
      };

      const itemTypeCheck = () => {
        if (itemTypeFilter === 'all') return true;
        const nameLower = item.name.toLowerCase();
        switch (itemTypeFilter) {
          case 'impressora': return nameLower.includes('impressora') || nameLower.includes('printer');
          case 'computador': return nameLower.includes('computador') || nameLower.includes('pc') || nameLower.includes('desktop');
          case 'notebook': return nameLower.includes('notebook') || nameLower.includes('laptop');
          case 'monitor': return nameLower.includes('monitor');
          case 'projetor': return nameLower.includes('projetor') || nameLower.includes('datashow');
          case 'outros': return !nameLower.includes('impressora') && !nameLower.includes('printer') &&
                                !nameLower.includes('computador') && !nameLower.includes('pc') &&
                                !nameLower.includes('notebook') && !nameLower.includes('laptop') &&
                                !nameLower.includes('monitor') && !nameLower.includes('projetor');
          default: return true;
        }
      };

      const quickFilterCheck = () => {
        switch (quickFilter) {
          case 'alert': return needsAlert(item);
          case 'withOS': return item.numeroChadaOS && item.numeroChadaOS.trim() !== '';
          case 'withoutOS': return !item.numeroChadaOS || item.numeroChadaOS.trim() === '';
          case 'emailSent': return item.emailSentAt !== null && item.emailSentAt !== undefined;
          case 'emailNotSent': return !item.emailSentAt;
          case 'none': return true;
          default: return true;
        }
      };

      return tabFilter() && searchFilter && sectorFilterCheck && statusFilterCheck &&
             periodFilterCheck() && daysInChadaCheck() && itemTypeCheck() && quickFilterCheck();
    });

    return filtered;
  }, [items, activeTab, searchTerm, sectorFilter, statusFilter, periodFilter, customStartDate, customEndDate, daysInChadaFilter, itemTypeFilter, quickFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalEnviados = items.length;
    const naChada = items.filter(item =>
      item.statusChada === 'PENDENTE' ||
      item.statusChada === 'RECEBIDO' ||
      item.statusChada === 'EM_ANALISE'
    ).length;
    const devolvidos = items.filter(item =>
      item.statusChada === 'DEVOLVIDO' ||
      item.statusChada === 'CONSERTADO' ||
      item.statusChada === 'SEM_CONSERTO'
    ).length;

    const itemsDevolvidos = items.filter(item =>
      item.statusChada === 'DEVOLVIDO' ||
      item.statusChada === 'CONSERTADO' ||
      item.statusChada === 'SEM_CONSERTO'
    );

    let tempoMedioDias = 0;
    if (itemsDevolvidos.length > 0) {
      const totalDias = itemsDevolvidos.reduce((acc, item) => {
        return acc + getDaysInChada(item.createdAt, item.statusChada, item.updatedAt);
      }, 0);
      tempoMedioDias = Math.round(totalDias / itemsDevolvidos.length);
    }

    const itensComAlerta = items.filter(item => {
      if (item.statusChada === 'DEVOLVIDO' || item.statusChada === 'CONSERTADO' || item.statusChada === 'SEM_CONSERTO') {
        return false;
      }
      return getDaysInChada(item.createdAt, item.statusChada, item.updatedAt) > 15;
    }).length;

    return { totalEnviados, naChada, devolvidos, tempoMedioDias, itensComAlerta };
  }, [items]);

  // Listas únicas para filtros
  const uniqueSectors = useMemo(() => {
    return [...new Set(items.map(item => item.sector))].sort();
  }, [items]);

  const uniqueStatus = useMemo(() => {
    return [...new Set(items.map(item => item.statusChada))].sort();
  }, [items]);

  // Função para carregar diagnósticos
  const fetchDiagnostics = async () => {
    try {
      const response = await fetch("/api/chada-diagnostics");
      if (response.ok) {
        const data = await response.json();
        setDiagnostics(data);
      }
    } catch (error) {
      console.error('Erro ao carregar diagnósticos:', error);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  // Função para carregar impressoras
  const fetchPrinters = async () => {
    try {
      const response = await fetch("/api/chada-diagnostics/printers");
      if (response.ok) {
        const data = await response.json();
        setPrinters(data);
      }
    } catch (error) {
      console.error('Erro ao carregar impressoras:', error);
    }
  };

  // Função para carregar setores
  const fetchSectors = async () => {
    try {
      const response = await fetch("/api/chada-diagnostics/sectors");
      if (response.ok) {
        const data = await response.json();
        setSectors(data);
      }
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Erro ao obter usuário logado:", error);
      } else {
        const response = await fetch("/api/get-user-displayname", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id }),
        });
        if (response.ok) {
          const data = await response.json();
          setUserName(data.displayName);
        } else {
          console.error("Erro ao buscar displayName do usuário logado");
        }
      }
    };

    const fetchChadaItems = async () => {
      try {
        const response = await fetch("/api/chada-items", { headers: getAuthHeaders() });
        if (!response.ok) throw new Error("Erro ao buscar itens da CHADA");
        const data = await response.json();
        setItems(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
    fetchChadaItems();
    fetchDiagnostics();
    fetchPrinters();
    fetchSectors();
  }, []);

  const fetchAllItems = async () => {
    try {
      const response = await fetch("/api/items");
      if (!response.ok) throw new Error("Erro ao buscar todos os itens");
      const data = await response.json();
      setAllItems(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddToChada = async () => {
    if (!problem || !sector) {
      alert("Descreva o problema e informe o setor.");
      return;
    }
    if (semSerial) {
      if (!itemNameSemSerial || !itemTypeSemSerial) {
        alert("Informe o nome e o tipo do item sem serial.");
        return;
      }
    } else if (!selectedItem) {
      alert("Selecione um item ou marque a opção 'Item sem serial'.");
      return;
    }

    // Converte a foto pra base64 se tiver (vai só no email, não salva no banco)
    let photoBase64: string | undefined;
    if (chadaPhoto) {
      photoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(chadaPhoto);
      });
    }

    try {
      const response = await fetch("/api/add-to-chada", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          itemId: semSerial ? undefined : selectedItem,
          problem,
          userName,
          sector,
          manutencaoSemMovimentacao: semSerial ? false : manutencaoSemMovimentacao,
          semSerial,
          itemNameSemSerial: semSerial ? itemNameSemSerial : undefined,
          itemTypeSemSerial: semSerial ? itemTypeSemSerial : undefined,
          itemBrandSemSerial: semSerial ? itemBrandSemSerial : undefined,
          photo: photoBase64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === "ITEM_NAO_NO_CSDT") {
          setModalIsOpen(false);
          setShowCsdtWarningModal(true);
          return;
        }
        throw new Error(errorData.message || "Erro ao adicionar item à CHADA");
      }

      alert("Item adicionado à CHADA com sucesso!");
      setModalIsOpen(false);
      setProblem("");
      setSector("");
      setSelectedItem(null);
      setManutencaoSemMovimentacao(false);
      setSemSerial(false);
      setItemNameSemSerial("");
      setItemTypeSemSerial("");
      setItemBrandSemSerial("");
      setChadaPhoto(null);

      const updatedItems = await fetch("/api/chada-items", { headers: getAuthHeaders() }).then((res) => res.json());
      setItems(updatedItems);
    } catch (error) {
      console.error(error);
      alert("Erro ao adicionar item à CHADA. Tente novamente.");
    }
  };

  const handleCancelChada = async () => {
    if (!cancelItemId) return;

    if (!confirm("Tem certeza que deseja cancelar este chamado? Um email de cancelamento será enviado à CHADA.")) {
      return;
    }

    setCancelLoading(true);
    try {
      const response = await fetch("/api/chada-cancel", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ itemId: cancelItemId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao cancelar item");
      }

      alert("Chamado cancelado com sucesso! Email de cancelamento enviado.");
      setShowCancelModal(false);
      setCancelItemId(null);

      const updatedItems = await fetch("/api/chada-items", { headers: getAuthHeaders() }).then((res) => res.json());
      setItems(updatedItems);
    } catch (error) {
      console.error(error);
      alert("Erro ao cancelar chamado. Tente novamente.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCorrectChada = async () => {
    if (!editItemId || !editProblem || !editSector) {
      alert("Preencha o problema e o setor.");
      return;
    }

    try {
      const response = await fetch("/api/chada-correct", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          itemId: editItemId,
          problem: editProblem,
          sector: editSector,
          selectedItem: editSemSerial ? undefined : editSelectedItem,
          semSerial: editSemSerial,
          itemNameSemSerial: editSemSerial ? editItemNameSemSerial : undefined,
          itemTypeSemSerial: editSemSerial ? editItemTypeSemSerial : undefined,
          itemBrandSemSerial: editSemSerial ? editItemBrandSemSerial : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao corrigir item");
      }

      alert("Item corrigido com sucesso! Email de retificação enviado à CHADA.");
      setShowEditModal(false);
      setEditItemId(null);
      setEditProblem("");
      setEditSector("");
      setEditSelectedItem(null);
      setEditSemSerial(false);
      setEditItemNameSemSerial("");
      setEditItemTypeSemSerial("");
      setEditItemBrandSemSerial("");

      const updatedItems = await fetch("/api/chada-items", { headers: getAuthHeaders() }).then((res) => res.json());
      setItems(updatedItems);
    } catch (error) {
      console.error(error);
      alert("Erro ao corrigir item. Tente novamente.");
    }
  };

  const openEditModal = (item: ChadaItem) => {
    setEditItemId(item.id);
    setEditProblem(item.problem);
    setEditSector(item.sector);
    setEditSemSerial(item.semSerial || false);
    setEditSelectedItem(null);
    setEditItemNameSemSerial(item.name || "");
    setEditItemTypeSemSerial("");
    setEditItemBrandSemSerial(item.brand || "");
    setShowEditModal(true);
  };

  const openCancelModal = (itemId: string) => {
    setCancelItemId(itemId);
    setShowCancelModal(true);
  };

  const openSendPhotoModal = (itemId: string) => {
    setSendPhotoItemId(itemId);
    setSendPhotoFile(null);
    setShowSendPhotoModal(true);
  };

  const handleSendPhoto = async () => {
    if (!sendPhotoItemId || !sendPhotoFile) {
      alert("Selecione uma foto primeiro.");
      return;
    }

    const photoBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(sendPhotoFile);
    });

    setSendingPhoto(true);
    try {
      const response = await fetch("/api/chada-send-photo", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          itemId: sendPhotoItemId,
          photo: photoBase64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao enviar foto");
      }

      alert("Foto enviada com sucesso!");
      setShowSendPhotoModal(false);
      setSendPhotoItemId(null);
      setSendPhotoFile(null);
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar foto. Tente novamente.");
    } finally {
      setSendingPhoto(false);
    }
  };

  const handleAddDiagnostic = async () => {
    if (!selectedPrinter || !selectedSector || !technicianChada || !diagnostic || !requestedPart) {
      alert("Todos os campos são obrigatórios.");
      return;
    }

    try {
      const response = await fetch("/api/chada-diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selectedPrinter.printer.id,
          sectorId: selectedSector.sector.id,
          sectorName: selectedSector.sector.name,
          technicianChada,
          diagnostic,
          requestedPart,
          createdBy: userName
        }),
      });

      if (!response.ok) throw new Error("Erro ao adicionar diagnóstico");

      alert("Diagnóstico cadastrado com sucesso!");
      setShowDiagnosticModal(false);
      setSelectedPrinter(null);
      setSelectedSector(null);
      setTechnicianChada("");
      setDiagnostic("");
      setRequestedPart("");
      fetchDiagnostics();
    } catch (error) {
      console.error(error);
      alert("Erro ao cadastrar diagnóstico. Tente novamente.");
    }
  };

  const handleUpdateDiagnosticStatus = async (id: string, status: DiagnosticStatus) => {
    try {
      const response = await fetch("/api/chada-diagnostics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar status");
      alert("Status atualizado com sucesso!");
      fetchDiagnostics();
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar status. Tente novamente.");
    }
  };

  const handleResolveItem = async (id: string) => {
    if (!userName) {
      alert("Nome do usuário logado não encontrado.");
      return;
    }

    try {
      const response = await fetch("/api/update-item-status", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status: "RESOLVIDO", updatedBy: userName }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar o status do item");
      alert("Status do item atualizado para RESOLVIDO!");
      const updatedItems = await fetch("/api/chada-items", { headers: getAuthHeaders() }).then((res) => res.json());
      setItems(updatedItems);
    } catch (error) {
      console.error("Erro ao resolver o item:", error);
      alert("Falha ao atualizar o status do item. Tente novamente.");
    }
  };

  const handlePrintOS = async (item: any) => {
    try {
      const existingPdfBytes = await fetch("/os-interna.pdf").then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      form.getTextField("SETOR").setText(item.sector || "Não informado");
      form.getTextField("HORA").setText(new Date().toLocaleTimeString("pt-BR"));
      form.getTextField("DATA").setText(new Date().toLocaleDateString("pt-BR"));
      form.getTextField("TECNICO").setText(item.userName || "Não informado");
      form.getTextField("ITEM").setText(
        item.semSerial
          ? `${item.brand} (sem serial)`
          : `${item.brand || "Não informado"}, serial: ${item.serialNumber || "Não informado"}`
      );

      const relatorioText = item.numeroChadaOS
        ? `OS CHADA: ${item.numeroChadaOS}\n\n${item.problem || "Não informado"}`
        : item.problem || "Não informado";
      form.getTextField("RELATORIO").setText(relatorioText);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `os-${item.serialNumber || "item"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao gerar o PDF:", error);
      alert("Erro ao gerar o PDF. Tente novamente.");
    }
  };

  const handleUploadOS = async (id: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;

    input.onchange = async (event: any) => {
      const files = event.target.files;
      if (!files || files.length === 0) {
        alert("Nenhuma imagem selecionada.");
        return;
      }

      try {
        const uploadedUrls = await uploadChadaFiles(Array.from(files), id);
        if (uploadedUrls.length === 0) {
          alert("Erro ao fazer upload das imagens.");
          return;
        }

        const response = await fetch("/api/upload-os", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, osImages: uploadedUrls, userName }),
        });

        if (!response.ok) throw new Error("Erro ao salvar as imagens na tabela");
        alert("Imagens enviadas com sucesso!");
      } catch (error) {
        console.error("Erro ao fazer upload das imagens:", error);
        alert("Erro ao fazer upload das imagens. Tente novamente.");
      }
    };

    input.click();
  };

  // Função para contar filtros ativos
  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (sectorFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (periodFilter !== 'all') count++;
    if (daysInChadaFilter !== 'all') count++;
    if (itemTypeFilter !== 'all') count++;
    if (quickFilter !== 'none') count++;
    return count;
  };

  // Função para obter resumo dos filtros ativos
  const getActiveFiltersResume = () => {
    const filters = [];
    if (searchTerm) filters.push(`Busca: "${searchTerm}"`);
    if (sectorFilter !== 'all') filters.push(`Setor: ${sectorFilter}`);
    if (statusFilter !== 'all') filters.push(`Status: ${statusFilter}`);
    if (periodFilter !== 'all') {
      if (periodFilter === 'custom') {
        filters.push(`Período: ${customStartDate || '...'} até ${customEndDate || '...'}`);
      } else {
        filters.push(`Período: Últimos ${periodFilter} dias`);
      }
    }
    if (daysInChadaFilter !== 'all') {
      const labels = { '<15': 'Menos de 15 dias', '>15': 'Mais de 15 dias', '>30': 'Mais de 30 dias' };
      filters.push(`Tempo na CHADA: ${labels[daysInChadaFilter as keyof typeof labels]}`);
    }
    if (itemTypeFilter !== 'all') filters.push(`Tipo: ${itemTypeFilter}`);
    if (quickFilter !== 'none') {
      const labels = {
        alert: 'Com alerta', withOS: 'Com número de OS', withoutOS: 'Sem número de OS',
        emailSent: 'Email enviado', emailNotSent: 'Email não enviado'
      };
      filters.push(`Filtro rápido: ${labels[quickFilter as keyof typeof labels]}`);
    }
    return filters;
  };

  // Função para resetar filtros
  const resetFilters = () => {
    setSearchTerm('');
    setSectorFilter('all');
    setStatusFilter('all');
    setSortField('createdAt');
    setSortDirection('desc');
    setPeriodFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setDaysInChadaFilter('all');
    setItemTypeFilter('all');
    setQuickFilter('none');
  };

  // Função para alterar ordenação
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/chada-items", { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar dados. Tente novamente.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCheckEmails = async () => {
    setCheckingEmails(true);
    try {
      const response = await fetch("/api/chada/check-emails", { method: "POST", headers: getAuthHeaders() });
      if (response.ok) {
        const result = await response.json();
        alert(`Verificação concluída!\n\nEmails processados: ${result.processed}\nItens atualizados: ${result.updated}\n\nAtualizando lista...`);
        await handleRefresh();
      } else {
        const error = await response.json();
        alert(`Erro ao verificar emails: ${error.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao verificar emails:', error);
      alert('Erro ao verificar emails. Verifique as configurações de email no .env');
    } finally {
      setCheckingEmails(false);
    }
  };

  // Exportar planilha OS Impressoras (formato BASE SME)
  const exportOSImpressoras = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('CHAMADO OS IMPRESSORAS');

      const AZUL_TITULO  = '1F3864';
      const AZUL_HEADER  = '2E75B6';
      const ZEBRA        = 'EBF3FB';
      const BRANCO       = 'FFFFFF';

      ws.mergeCells('A1:H1');
      ws.getRow(1).height = 65;
      ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRANCO } };

      try {
        const imgResponse = await fetch('/images/logo-secretaria.png');
        const imgBuffer = await imgResponse.arrayBuffer();
        const imgId = wb.addImage({ buffer: imgBuffer, extension: 'png' });
        ws.addImage(imgId, {
          tl: { col: 2.5, row: 0.1 } as any,
          br: { col: 5.5, row: 0.9 } as any,
          editAs: 'oneCell',
        });
      } catch (_) {}

      ws.mergeCells('A2:H2');
      const tituloCell = ws.getCell('A2');
      tituloCell.value = `CSDT — CHAMADO PARA AS IMPRESSORAS - BASE SME         ${new Date().toLocaleDateString('pt-BR')}`;
      tituloCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
      tituloCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_TITULO } };
      tituloCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 28;

      const headers = ['SQ', 'SETOR', 'MODELO', 'MARCA', 'SERIAL', 'DATA CHAMADO', 'Nº OS', 'REPARO / MANUTENÇÃO'];
      const headerRow = ws.addRow(headers);
      headerRow.eachCell((cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_HEADER } };
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: AZUL_TITULO } },
          bottom: { style: 'thin', color: { argb: AZUL_TITULO } },
          left: { style: 'thin', color: { argb: AZUL_TITULO } },
          right: { style: 'thin', color: { argb: AZUL_TITULO } },
        };
      });
      headerRow.height = 24;

      ws.columns = [
        { key: 'sq', width: 5 }, { key: 'setor', width: 14 }, { key: 'modelo', width: 12 },
        { key: 'marca', width: 10 }, { key: 'serial', width: 18 }, { key: 'data', width: 14 },
        { key: 'os', width: 10 }, { key: 'reparo', width: 55 },
      ];

      const impressoras = filteredAndSortedItems.filter(i =>
        i.name?.toLowerCase().includes('impressora') &&
        ['PENDENTE', 'RECEBIDO', 'EM_ANALISE'].includes(i.statusChada)
      );

      impressoras.forEach((item, idx) => {
        const nomeCompleto = (item.brand || item.name || '').toUpperCase();
        const marcasConhecidas = ['XEROX', 'OKI', 'OKIDATA', 'HP', 'EPSON', 'CANON', 'RICOH', 'LEXMARK', 'BROTHER'];
        let marca = '';
        let modelo = nomeCompleto;
        for (const m of marcasConhecidas) {
          if (nomeCompleto.includes(m)) {
            marca = m === 'OKIDATA' ? 'OKI' : m;
            modelo = nomeCompleto.replace('IMPRESSORA', '').replace(m, '').trim();
            break;
          }
        }
        if (!marca) { modelo = nomeCompleto.replace('IMPRESSORA', '').trim(); }

        const row = ws.addRow([
          idx + 1, item.sector?.toUpperCase() || '', modelo, marca,
          item.serialNumber || '',
          item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '',
          item.numeroChadaOS || '', item.problem || '',
        ]);

        const isZebra = idx % 2 === 1;
        row.eachCell({ includeEmpty: true }, (cell: any, colNum: number) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isZebra ? ZEBRA : BRANCO } };
          cell.font = { size: 10, bold: colNum === 5 || colNum === 7, color: colNum === 8 ? { argb: 'C00000' } : { argb: '000000' } };
          cell.alignment = { horizontal: colNum < 8 ? 'center' : 'left', vertical: 'middle', wrapText: colNum === 8 };
          cell.border = {
            top: { style: 'hair', color: { argb: 'C0C0C0' } },
            bottom: { style: 'hair', color: { argb: 'C0C0C0' } },
            left: { style: 'hair', color: { argb: 'C0C0C0' } },
            right: { style: 'hair', color: { argb: 'C0C0C0' } },
          };
        });
        row.height = 25;
      });

      ws.autoFilter = { from: 'A3', to: 'H3' };
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OS_Impressoras_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao gerar OS Impressoras:', error);
      alert('Erro ao gerar planilha. Tente novamente.');
    }
  };

  const exportToCSV = () => {
    const headers = ['Nome', 'Marca', 'Serial', 'Status', 'Problema', 'Setor', 'Enviado por', 'Data Envio', 'Última Atualização', 'Dias na CHADA', 'Observações', 'Custo Conserto'];
    const csvData = filteredAndSortedItems.map(item => [
      item.name || '', item.brand || '', item.serialNumber || '', item.statusChada || '',
      item.problem || '', item.sector || '', item.userName || '',
      new Date(item.createdAt).toLocaleDateString('pt-BR'),
      new Date(item.updatedAt).toLocaleDateString('pt-BR'),
      getDaysInChada(item.createdAt, item.statusChada, item.updatedAt),
      item.observacoes || '', item.custoConserto || ''
    ]);
    const csvContent = [headers.join(','), ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio-chada-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportToExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'CSDT';
      wb.created = new Date();

      const AZUL_ESCURO = '1F3864';
      const ZEBRA = 'EBF3FB';
      const BRANCO = 'FFFFFF';

      const headerStyle = (ws: any, row: any) => {
        row.eachCell((cell: any) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_ESCURO } };
          cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: AZUL_ESCURO } },
            bottom: { style: 'thin', color: { argb: AZUL_ESCURO } },
            left: { style: 'thin', color: { argb: AZUL_ESCURO } },
            right: { style: 'thin', color: { argb: AZUL_ESCURO } },
          };
        });
        row.height = 30;
      };

      const dataStyle = (row: any, isZebra: boolean) => {
        row.eachCell({ includeEmpty: true }, (cell: any) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isZebra ? ZEBRA : BRANCO } };
          cell.font = { size: 10 };
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'hair', color: { argb: 'C0C0C0' } },
            bottom: { style: 'hair', color: { argb: 'C0C0C0' } },
            left: { style: 'hair', color: { argb: 'C0C0C0' } },
            right: { style: 'hair', color: { argb: 'C0C0C0' } },
          };
        });
        row.height = 20;
      };

      // ABA 1: ITENS CHADA
      const ws1 = wb.addWorksheet('Itens CHADA');
      ws1.columns = [
        { header: 'Nome', key: 'nome', width: 22 },
        { header: 'Marca/Modelo', key: 'marca', width: 26 },
        { header: 'Número de Série', key: 'serial', width: 22 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'OS CHADA', key: 'os', width: 16 },
        { header: 'Problema', key: 'problema', width: 42 },
        { header: 'Setor/Escola', key: 'setor', width: 28 },
        { header: 'Enviado por', key: 'enviado', width: 20 },
        { header: 'Data Envio', key: 'dataEnvio', width: 14 },
        { header: 'Dias na CHADA', key: 'dias', width: 14 },
        { header: 'Última Atualização', key: 'atualizado', width: 18 },
        { header: 'Atualizado por', key: 'atualizadoPor', width: 20 },
      ];
      headerStyle(ws1, ws1.getRow(1));

      filteredAndSortedItems.forEach((item, idx) => {
        const row = ws1.addRow({
          nome: item.name || '', marca: item.brand || '', serial: item.serialNumber || '',
          status: item.statusChada || '', os: item.numeroChadaOS || 'Aguardando',
          problema: item.problem || '', setor: item.sector || '', enviado: item.userName || '',
          dataEnvio: item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '',
          dias: getDaysInChada(item.createdAt, item.statusChada, item.updatedAt),
          atualizado: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('pt-BR') : '',
          atualizadoPor: item.updateBy || '',
        });
        dataStyle(row, idx % 2 === 1);
      });
      ws1.autoFilter = { from: 'A1', to: 'L1' };

      // ABA 2: ESTATÍSTICAS
      const ws2 = wb.addWorksheet('Estatísticas');
      ws2.columns = [
        { header: 'Métrica', key: 'metrica', width: 32 },
        { header: 'Valor', key: 'valor', width: 16 },
      ];
      headerStyle(ws2, ws2.getRow(1));

      const statsRows = [
        { metrica: 'Total de Itens Enviados', valor: stats.totalEnviados },
        { metrica: 'Itens na CHADA', valor: stats.naChada },
        { metrica: 'Itens Devolvidos', valor: stats.devolvidos },
        { metrica: 'Tempo Médio (dias)', valor: stats.tempoMedioDias },
        { metrica: '', valor: '' },
        { metrica: 'Status PENDENTE', valor: items.filter(i => i.statusChada === 'PENDENTE').length },
        { metrica: 'Status RECEBIDO', valor: items.filter(i => i.statusChada === 'RECEBIDO').length },
        { metrica: 'Status EM ANÁLISE', valor: items.filter(i => i.statusChada === 'EM_ANALISE').length },
        { metrica: 'Status CONSERTADO', valor: items.filter(i => i.statusChada === 'CONSERTADO').length },
        { metrica: 'Status SEM CONSERTO', valor: items.filter(i => i.statusChada === 'SEM_CONSERTO').length },
        { metrica: 'Status DEVOLVIDO', valor: items.filter(i => i.statusChada === 'DEVOLVIDO').length },
        { metrica: '', valor: '' },
        { metrica: 'Com Número de OS', valor: items.filter(i => i.numeroChadaOS?.trim()).length },
        { metrica: 'Aguardando OS', valor: items.filter(i => !i.numeroChadaOS?.trim()).length },
        { metrica: '', valor: '' },
        { metrica: 'Data da Exportação', valor: new Date().toLocaleString('pt-BR') },
      ];
      statsRows.forEach((r, idx) => {
        const row = ws2.addRow(r);
        if (r.metrica) dataStyle(row, idx % 2 === 1);
      });

      // ABA 3: POR SETOR
      const ws3 = wb.addWorksheet('Por Setor');
      ws3.columns = [
        { header: 'Setor', key: 'setor', width: 30 },
        { header: 'Total', key: 'total', width: 12 },
        { header: 'Na CHADA', key: 'naChada', width: 12 },
        { header: 'Devolvidos', key: 'devolvidos', width: 12 },
        { header: 'Com OS', key: 'comOs', width: 12 },
      ];
      headerStyle(ws3, ws3.getRow(1));

      const setores = [...new Set(items.map(i => i.sector))].sort();
      setores.forEach((setor, idx) => {
        const its = items.filter(i => i.sector === setor);
        const row = ws3.addRow({
          setor, total: its.length,
          naChada: its.filter(i => ['PENDENTE','RECEBIDO','EM_ANALISE'].includes(i.statusChada)).length,
          devolvidos: its.filter(i => ['CONSERTADO','SEM_CONSERTO','DEVOLVIDO'].includes(i.statusChada)).length,
          comOs: its.filter(i => i.numeroChadaOS?.trim()).length,
        });
        dataStyle(row, idx % 2 === 1);
      });

      const activeFiltersCount = getActiveFiltersCount();
      const filterSuffix = activeFiltersCount > 0 ? `_${activeFiltersCount}filtros` : '';
      const fileName = `Relatorio_CHADA_${new Date().toISOString().split('T')[0]}${filterSuffix}.xlsx`;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      alert('Relatório Excel gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      alert('Erro ao gerar relatório Excel. Tente novamente.');
    }
  };

  const exportToPDF = async () => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();

      page.drawText('Relatório CHADA - ' + new Date().toLocaleDateString('pt-BR'), {
        x: 50, y: height - 50, size: 16, color: { r: 0, g: 0, b: 0 } as any,
      });

      let yPosition = height - 100;
      page.drawText(`Total de itens: ${stats.totalEnviados}`, { x: 50, y: yPosition, size: 12, color: { r: 0, g: 0, b: 0 } as any });
      yPosition -= 20;
      page.drawText(`Na CHADA: ${stats.naChada}`, { x: 50, y: yPosition, size: 12, color: { r: 0, g: 0, b: 0 } as any });
      yPosition -= 20;
      page.drawText(`Devolvidos: ${stats.devolvidos}`, { x: 50, y: yPosition, size: 12, color: { r: 0, g: 0, b: 0 } as any });
      yPosition -= 20;
      page.drawText(`Tempo médio: ${stats.tempoMedioDias} dias`, { x: 50, y: yPosition, size: 12, color: { r: 0, g: 0, b: 0 } as any });
      yPosition -= 40;

      page.drawText('Lista de Itens:', { x: 50, y: yPosition, size: 14, color: { r: 0, g: 0, b: 0 } as any });
      yPosition -= 30;

      filteredAndSortedItems.forEach((item, index) => {
        if (yPosition < 50) {
          const newPage = pdfDoc.addPage();
          yPosition = newPage.getSize().height - 50;
        }

        const itemText = `${index + 1}. ${item.name} - ${item.brand} (${item.serialNumber}) - ${item.statusChada}`;
        page.drawText(itemText, { x: 50, y: yPosition, size: 10, color: { r: 0, g: 0, b: 0 } as any });
        yPosition -= 15;

        if (item.problem) {
          const problemText = `   Problema: ${item.problem.substring(0, 80)}${item.problem.length > 80 ? '...' : ''}`;
          page.drawText(problemText, { x: 50, y: yPosition, size: 8, color: { r: 0.5, g: 0.5, b: 0.5 } as any });
          yPosition -= 15;
        }
        yPosition -= 10;
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-chada-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar relatório em PDF. Tente novamente.');
    }
  };

  // Funções de renderização (retornam JSX elements)
  const getStatusBadge = (status: ChadaStatus) => {
    const styles: Record<string, string> = {
      'PENDENTE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'RECEBIDO': 'bg-blue-100 text-blue-800 border-blue-200',
      'EM_ANALISE': 'bg-purple-100 text-purple-800 border-purple-200',
      'CONSERTADO': 'bg-green-100 text-green-800 border-green-200',
      'SEM_CONSERTO': 'bg-red-100 text-red-800 border-red-200',
      'DEVOLVIDO': 'bg-green-100 text-green-800 border-green-200'
    };
    const labels: Record<string, string> = {
      'PENDENTE': '📦 Enviado',
      'RECEBIDO': '📥 Recebido',
      'EM_ANALISE': '🔍 Em Análise',
      'CONSERTADO': '✅ Consertado',
      'SEM_CONSERTO': '❌ Sem Conserto',
      'DEVOLVIDO': '📤 Devolvido'
    };
    return { className: `px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`, label: labels[status] || status };
  };

  return {
    // Estado
    items, setItems, loading, refreshing, checkingEmails,
    diagnostics, setDiagnostics, loadingDiagnostics, printers, sectors,
    modalIsOpen, setModalIsOpen, allItems, setAllItems,
    selectedItem, setSelectedItem, problem, setProblem,
    sector, setSector, userName, setUserName,
    manutencaoSemMovimentacao, setManutencaoSemMovimentacao,
    semSerial, setSemSerial, itemNameSemSerial, setItemNameSemSerial,
    itemTypeSemSerial, setItemTypeSemSerial, itemBrandSemSerial, setItemBrandSemSerial,
    showBaixaModal, setShowBaixaModal, baixaItemId, setBaixaItemId,
    novoModelo, setNovoModelo, novoSerial, setNovoSerial,
    chadaStatus, setChadaStatus, observacoes, setObservacoes,
    showDiagnosticModal, setShowDiagnosticModal,
    selectedPrinter, setSelectedPrinter, selectedSector, setSelectedSector,
    technicianChada, setTechnicianChada, diagnostic, setDiagnostic,
    requestedPart, setRequestedPart, showCsdtWarningModal, setShowCsdtWarningModal,
    // Photo
    chadaPhoto, setChadaPhoto,
    // UI
    activeTab, setActiveTab, searchTerm, setSearchTerm,
    sectorFilter, setSectorFilter, statusFilter, setStatusFilter,
    sortField, sortDirection, setSortField, setSortDirection,
    periodFilter, setPeriodFilter, customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate, daysInChadaFilter, setDaysInChadaFilter,
    itemTypeFilter, setItemTypeFilter, quickFilter, setQuickFilter,
    // Computed
    filteredAndSortedItems, stats, uniqueSectors, uniqueStatus,
    // Helpers
    getDaysInChada, needsAlert, getStatusBadge,
    // Handlers
    fetchDiagnostics, fetchAllItems, handleAddToChada, handleAddDiagnostic,
    handleUpdateDiagnosticStatus, handleResolveItem, handlePrintOS,
    handleUploadOS, handleRefresh, handleCheckEmails,
    handleSort, resetFilters, getActiveFiltersCount, getActiveFiltersResume,
    handleCancelChada, handleCorrectChada, openEditModal, openCancelModal, cancelLoading,
    // Edit/Cancel state
    showEditModal, setShowEditModal, editItemId, setEditItemId,
    editProblem, setEditProblem, editSector, setEditSector,
    editSemSerial, setEditSemSerial, editSelectedItem, setEditSelectedItem,
    editItemNameSemSerial, setEditItemNameSemSerial,
    editItemTypeSemSerial, setEditItemTypeSemSerial,
    editItemBrandSemSerial, setEditItemBrandSemSerial,
    showCancelModal, setShowCancelModal, cancelItemId, setCancelItemId,
    // Send Photo
    showSendPhotoModal, setShowSendPhotoModal,
    sendPhotoItemId, setSendPhotoItemId,
    sendPhotoFile, setSendPhotoFile,
    sendingPhoto,
    handleSendPhoto, openSendPhotoModal,
    // Export
    exportToCSV, exportOSImpressoras, exportToExcel, exportToPDF,
  };
}
