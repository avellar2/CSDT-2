import { supabase } from "@/lib/supabaseClient";
import { uploadChadaFiles } from "@/utils/storageProvider";
import React, { useEffect, useState, useMemo } from "react";
import Select from "react-select";
import { 
  CheckCircle, 
  CloudArrowUp, 
  Eye, 
  Printer,
  Package,
  Wrench,
  Clock,
  Calendar,
  MagnifyingGlass,
  Funnel,
  Plus,
  X,
  FileText,
  Buildings,
  User,
  ClipboardText,
  CaretDown,
  CaretUp,
  CheckSquare,
  WarningCircle,
  Download,
  ArrowClockwise
} from "phosphor-react";
import { PDFDocument, rgb } from "pdf-lib";
import Modal from "@/components/Modal";
import * as XLSX from 'xlsx';

type ChadaStatus = 'PENDENTE' | 'RECEBIDO' | 'EM_ANALISE' | 'CONSERTADO' | 'SEM_CONSERTO' | 'DEVOLVIDO';
type TabType = 'na_chada' | 'devolvidos' | 'todos' | 'diagnosticos';
type SortField = 'createdAt' | 'updatedAt' | 'sector' | 'problem';
type SortDirection = 'asc' | 'desc';
type DiagnosticStatus = 'AGUARDANDO_PECA' | 'PECA_CHEGOU' | 'INSTALADO' | 'CANCELADO';

interface ChadaItem {
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
}

interface ChadaDiagnostic {
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

const ChadaPage: React.FC = () => {
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

  // Estado do modal de aviso CSDT
  const [showCsdtWarningModal, setShowCsdtWarningModal] = useState(false);
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState<TabType>('na_chada');
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Novos filtros
  const [periodFilter, setPeriodFilter] = useState<string>('all'); // 7d, 15d, 30d, 60d, custom, all
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [daysInChadaFilter, setDaysInChadaFilter] = useState<string>('all'); // all, <15, >15, >30
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all'); // all, impressora, computador, etc
  const [quickFilter, setQuickFilter] = useState<string>('none'); // none, alert, withOS, withoutOS, emailSent, emailNotSent

  // Função para calcular dias na CHADA
  const getDaysInChada = (createdAt: string, updatedAt?: string) => {
    const start = new Date(createdAt);
    const end = updatedAt && new Date(updatedAt).getTime() > start.getTime() ? new Date(updatedAt) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filtrar e ordenar itens
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      // Filtro por aba
      const tabFilter = () => {
        switch (activeTab) {
          case 'na_chada': return item.statusChada === 'PENDENTE' || item.statusChada === 'RECEBIDO' || item.statusChada === 'EM_ANALISE';
          case 'devolvidos': return item.statusChada === 'DEVOLVIDO' || item.statusChada === 'CONSERTADO' || item.statusChada === 'SEM_CONSERTO';
          case 'todos': return true;
          default: return true;
        }
      };

      // Filtro por busca
      const searchFilter = searchTerm === '' ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.problem.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por setor
      const sectorFilterCheck = sectorFilter === 'all' || item.sector === sectorFilter;

      // Filtro por status
      const statusFilterCheck = statusFilter === 'all' || item.statusChada === statusFilter;

      // Filtro por período
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

      // Filtro por dias na CHADA
      const daysInChadaCheck = () => {
        if (daysInChadaFilter === 'all') return true;
        const days = getDaysInChada(item.createdAt, item.updatedAt);

        switch (daysInChadaFilter) {
          case '<15': return days < 15;
          case '>15': return days > 15;
          case '>30': return days > 30;
          default: return true;
        }
      };

      // Filtro por tipo de item
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

      // Filtros rápidos
      const quickFilterCheck = () => {
        switch (quickFilter) {
          case 'alert': return needsAlert(item);
          case 'withOS': return item.numeroChadaOS !== null && item.numeroChadaOS !== undefined && item.numeroChadaOS !== '';
          case 'withoutOS': return !item.numeroChadaOS;
          case 'emailSent': return item.emailSentAt !== null && item.emailSentAt !== undefined;
          case 'emailNotSent': return !item.emailSentAt;
          case 'none': return true;
          default: return true;
        }
      };

      return tabFilter() && searchFilter && sectorFilterCheck && statusFilterCheck &&
             periodFilterCheck() && daysInChadaCheck() && itemTypeCheck() && quickFilterCheck();
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Converter datas para comparação
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        const aTime = new Date(aValue).getTime();
        const bTime = new Date(bValue).getTime();
        aValue = aTime;
        bValue = bTime;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    console.log('🔍 DEBUG - Aba ativa:', activeTab, 'Total items:', items.length, 'Filtrados:', filtered.length);
    console.log('📊 Items por status:', {
      PENDENTE: items.filter(i => i.statusChada === 'PENDENTE').length,
      RECEBIDO: items.filter(i => i.statusChada === 'RECEBIDO').length,
      EM_ANALISE: items.filter(i => i.statusChada === 'EM_ANALISE').length,
      CONSERTADO: items.filter(i => i.statusChada === 'CONSERTADO').length,
      SEM_CONSERTO: items.filter(i => i.statusChada === 'SEM_CONSERTO').length,
      DEVOLVIDO: items.filter(i => i.statusChada === 'DEVOLVIDO').length
    });
    
    if (activeTab === 'devolvidos') {
      console.log('👀 ITENS QUE DEVERIAM APARECER NA ABA DEVOLVIDOS:', 
        items.filter(i => i.statusChada === 'DEVOLVIDO' || i.statusChada === 'CONSERTADO' || i.statusChada === 'SEM_CONSERTO')
          .map(i => ({ nome: i.name, status: i.statusChada, id: i.id }))
      );
      console.log('🔎 FILTROS APLICADOS:', {
        searchTerm, 
        sectorFilter, 
        statusFilter,
        'Total que passou no tabFilter': items.filter(item => 
          item.statusChada === 'DEVOLVIDO' || item.statusChada === 'CONSERTADO' || item.statusChada === 'SEM_CONSERTO'
        ).length
      });
    }

    return filtered;
  }, [items, activeTab, searchTerm, sectorFilter, statusFilter, sortField, sortDirection, periodFilter, customStartDate, customEndDate, daysInChadaFilter, itemTypeFilter, quickFilter]);

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
    
    // Tempo médio na CHADA (apenas itens devolvidos)
    const itemsDevolvidos = items.filter(item => 
      item.statusChada === 'DEVOLVIDO' || 
      item.statusChada === 'CONSERTADO' || 
      item.statusChada === 'SEM_CONSERTO'
    );
    
    let tempoMedioDias = 0;
    if (itemsDevolvidos.length > 0) {
      const totalDias = itemsDevolvidos.reduce((acc, item) => {
        return acc + getDaysInChada(item.createdAt, item.updatedAt);
      }, 0);
      tempoMedioDias = Math.round(totalDias / itemsDevolvidos.length);
    }

    // Itens com alerta (mais de 15 dias na CHADA)
    const itensComAlerta = items.filter(item => {
      if (item.statusChada === 'DEVOLVIDO' || item.statusChada === 'CONSERTADO' || item.statusChada === 'SEM_CONSERTO') {
        return false;
      }
      return getDaysInChada(item.createdAt, item.updatedAt) > 15;
    }).length;

    return {
      totalEnviados,
      naChada,
      devolvidos,
      tempoMedioDias,
      itensComAlerta
    };
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
        console.log("Usuário logado:", user);

        const response = await fetch("/api/get-user-displayname", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

    fetchUser();

    const fetchChadaItems = async () => {
      try {
        const response = await fetch("/api/chada-items");
        if (!response.ok) {
          throw new Error("Erro ao buscar itens da CHADA");
        }
        const data = await response.json();
        setItems(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchChadaItems();
    fetchDiagnostics();
    fetchPrinters();
    fetchSectors();
  }, []);

  const fetchAllItems = async () => {
    try {
      const response = await fetch("/api/items");
      if (!response.ok) {
        throw new Error("Erro ao buscar todos os itens");
      }
      const data = await response.json();
      setAllItems(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddToChada = async () => {
    if (!selectedItem || !problem || !sector) {
      alert("Selecione um item, descreva o problema e informe o setor.");
      return;
    }

    console.log("Item selecionado:", selectedItem);
    console.log("Problema:", problem);
    console.log("Usuário:", userName);
    console.log("Setor:", sector);

    try {
      const response = await fetch("/api/add-to-chada", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: selectedItem, // ID do item selecionado
          problem, // Problema informado pelo usuário
          userName, // Nome do usuário logado
          sector, // Setor informado pelo usuário
          manutencaoSemMovimentacao, // Manutenção sem movimentação física
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Verificar se o erro é porque o item não está no CSDT
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

      const updatedItems = await fetch("/api/chada-items").then((res) => res.json());
      setItems(updatedItems);
    } catch (error) {
      console.error(error);
      alert("Erro ao adicionar item à CHADA. Tente novamente.");
    }
  };

  // Função para adicionar diagnóstico
  const handleAddDiagnostic = async () => {
    if (!selectedPrinter || !selectedSector || !technicianChada || !diagnostic || !requestedPart) {
      alert("Todos os campos são obrigatórios.");
      return;
    }

    try {
      const response = await fetch("/api/chada-diagnostics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      if (!response.ok) {
        throw new Error("Erro ao adicionar diagnóstico");
      }

      alert("Diagnóstico cadastrado com sucesso!");
      setShowDiagnosticModal(false);
      
      // Limpar campos
      setSelectedPrinter(null);
      setSelectedSector(null);
      setTechnicianChada("");
      setDiagnostic("");
      setRequestedPart("");

      // Atualizar lista
      fetchDiagnostics();
    } catch (error) {
      console.error(error);
      alert("Erro ao cadastrar diagnóstico. Tente novamente.");
    }
  };

  // Função para atualizar status do diagnóstico
  const handleUpdateDiagnosticStatus = async (id: string, status: DiagnosticStatus) => {
    try {
      const response = await fetch("/api/chada-diagnostics", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar status");
      }

      alert("Status atualizado com sucesso!");
      fetchDiagnostics();
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar status. Tente novamente.");
    }
  };

  const handleResolveItem = async (id: string) => {
    console.log("ID enviado para o backend:", id);

    if (!userName) {
      alert("Nome do usuário logado não encontrado.");
      return;
    }

    try {
      const response = await fetch("/api/update-item-status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id, // Certifique-se de que o `id` é o UUID correto
          status: "RESOLVIDO", // Status a ser atualizado
          updatedBy: userName, // Nome do usuário logado
        }),
      });

      console.log("Resposta do backend:", response);

      if (!response.ok) {
        throw new Error("Erro ao atualizar o status do item");
      }

      alert("Status do item atualizado para RESOLVIDO!");

      const updatedItems = await fetch("/api/chada-items").then((res) => res.json());
      setItems(updatedItems);
    } catch (error) {
      console.error("Erro ao resolver o item:", error);
      alert("Falha ao atualizar o status do item. Tente novamente.");
    }
  };

  const handlePrintOS = async (item: any) => {
    try {
      const existingPdfBytes = await fetch("/os-interna.pdf").then((res) =>
        res.arrayBuffer()
      );

      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      form.getTextField("SETOR").setText(item.sector || "Não informado");
      form.getTextField("HORA").setText(new Date().toLocaleTimeString("pt-BR"));
      form.getTextField("DATA").setText(new Date().toLocaleDateString("pt-BR"));
      form.getTextField("TECNICO").setText(item.userName || "Não informado");
      form.getTextField("ITEM").setText(
        `${item.brand || "Não informado"}, serial: ${item.serialNumber || "Não informado"}`
      );
      form.getTextField("RELATORIO").setText(item.problem || "Não informado");

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
    console.log("ID enviado para o backend:", id);
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
        // Upload usando o novo sistema de storage (Cloudinary ou Supabase)
        const uploadedUrls = await uploadChadaFiles(Array.from(files), id);

        if (uploadedUrls.length === 0) {
          alert("Erro ao fazer upload das imagens.");
          return;
        }

        console.log("URLs enviadas para osImages:", uploadedUrls);

        const response = await fetch("/api/upload-os", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id, // Certifique-se de que o `id` é uma string
            osImages: uploadedUrls,
            userName, // Enviar o nome do usuário logado
          }),
        });

        if (!response.ok) {
          throw new Error("Erro ao salvar as imagens na tabela");
        }

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
        alert: 'Com alerta',
        withOS: 'Com número de OS',
        withoutOS: 'Sem número de OS',
        emailSent: 'Email enviado',
        emailNotSent: 'Email não enviado'
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

  // Função para renderizar botão de ordenação
  const renderSortButton = (field: SortField, label: string) => {
    const isActive = sortField === field;
    const Icon = isActive 
      ? (sortDirection === 'asc' ? CaretUp : CaretDown)
      : CaretDown;
    
    return (
      <button
        onClick={() => handleSort(field)}
        className={`
          flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors
          ${isActive 
            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
            : 'text-gray-600 hover:bg-gray-100'
          }
        `}
      >
        <span>{label}</span>
        <Icon size={12} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
      </button>
    );
  };

  // Função para exportar CSV
  const exportToCSV = () => {
    const headers = [
      'Nome',
      'Marca',
      'Serial',
      'Status',
      'Problema',
      'Setor',
      'Enviado por',
      'Data Envio',
      'Última Atualização',
      'Dias na CHADA',
      'Observações',
      'Custo Conserto'
    ];

    const csvData = filteredAndSortedItems.map(item => [
      item.name || '',
      item.brand || '',
      item.serialNumber || '',
      item.statusChada || '',
      item.problem || '',
      item.sector || '',
      item.userName || '',
      new Date(item.createdAt).toLocaleDateString('pt-BR'),
      new Date(item.updatedAt).toLocaleDateString('pt-BR'),
      getDaysInChada(item.createdAt, item.updatedAt),
      item.observacoes || '',
      item.custoConserto || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

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

  // Função para exportar Excel (XLSX) - Bonito e completo
  const exportToExcel = () => {
    try {
      // Criar workbook
      const wb = XLSX.utils.book_new();

      // Informações sobre filtros aplicados
      const activeFiltersCount = getActiveFiltersCount();
      const activeFiltersResume = getActiveFiltersResume();

      // === ABA 1: DADOS PRINCIPAIS ===
      const mainData = filteredAndSortedItems.map(item => ({
        'Nome': item.name || '',
        'Marca/Modelo': item.brand || '',
        'Número de Série': item.serialNumber || '',
        'Status': item.statusChada || '',
        'OS CHADA': item.numeroChadaOS || 'Aguardando',
        'Problema': item.problem || '',
        'Setor/Escola': item.sector || '',
        'Enviado por': item.userName || '',
        'Data Envio': item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '',
        'Email Enviado': item.emailSentAt ? new Date(item.emailSentAt).toLocaleString('pt-BR') : 'Não enviado',
        'Última Atualização': item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('pt-BR') : '',
        'Dias na CHADA': getDaysInChada(item.createdAt, item.updatedAt),
        'Atualizado por': item.updateBy || ''
      }));

      const ws1 = XLSX.utils.json_to_sheet(mainData);

      // Ajustar larguras das colunas
      const colWidths = [
        { wch: 20 }, // Nome
        { wch: 25 }, // Marca/Modelo
        { wch: 20 }, // Serial
        { wch: 15 }, // Status
        { wch: 15 }, // OS CHADA
        { wch: 40 }, // Problema
        { wch: 30 }, // Setor
        { wch: 20 }, // Enviado por
        { wch: 15 }, // Data Envio
        { wch: 20 }, // Email Enviado
        { wch: 18 }, // Última Atualização
        { wch: 15 }, // Dias na CHADA
        { wch: 20 }, // Atualizado por
      ];
      ws1['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws1, 'Itens CHADA');

      // === ABA 2: ESTATÍSTICAS ===
      const statsData = [
        { 'Métrica': 'Total de Itens Enviados', 'Valor': stats.totalEnviados },
        { 'Métrica': 'Itens na CHADA', 'Valor': stats.naChada },
        { 'Métrica': 'Itens Devolvidos', 'Valor': stats.devolvidos },
        { 'Métrica': 'Tempo Médio (dias)', 'Valor': stats.tempoMedioDias },
        { 'Métrica': '', 'Valor': '' },
        { 'Métrica': 'Status PENDENTE', 'Valor': items.filter(i => i.statusChada === 'PENDENTE').length },
        { 'Métrica': 'Status RECEBIDO', 'Valor': items.filter(i => i.statusChada === 'RECEBIDO').length },
        { 'Métrica': 'Status EM_ANALISE', 'Valor': items.filter(i => i.statusChada === 'EM_ANALISE').length },
        { 'Métrica': 'Status CONSERTADO', 'Valor': items.filter(i => i.statusChada === 'CONSERTADO').length },
        { 'Métrica': 'Status SEM_CONSERTO', 'Valor': items.filter(i => i.statusChada === 'SEM_CONSERTO').length },
        { 'Métrica': 'Status DEVOLVIDO', 'Valor': items.filter(i => i.statusChada === 'DEVOLVIDO').length },
        { 'Métrica': '', 'Valor': '' },
        { 'Métrica': 'Com Número de OS', 'Valor': items.filter(i => i.numeroChadaOS).length },
        { 'Métrica': 'Aguardando OS', 'Valor': items.filter(i => !i.numeroChadaOS).length },
      ];

      const ws2 = XLSX.utils.json_to_sheet(statsData);
      ws2['!cols'] = [{ wch: 30 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Estatísticas');

      // === ABA 3: POR SETOR ===
      const setores = [...new Set(items.map(i => i.sector))];
      const setorData = setores.map(setor => {
        const itensSetor = items.filter(i => i.sector === setor);
        return {
          'Setor': setor,
          'Total Itens': itensSetor.length,
          'Na CHADA': itensSetor.filter(i => ['PENDENTE', 'RECEBIDO', 'EM_ANALISE'].includes(i.statusChada)).length,
          'Devolvidos': itensSetor.filter(i => ['CONSERTADO', 'SEM_CONSERTO', 'DEVOLVIDO'].includes(i.statusChada)).length,
          'Com OS': itensSetor.filter(i => i.numeroChadaOS).length,
        };
      });

      const ws3 = XLSX.utils.json_to_sheet(setorData);
      ws3['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Por Setor');

      // === ABA 4: FILTROS APLICADOS ===
      const filtersData = [
        { 'Informação': '📊 RELATÓRIO COM FILTROS', 'Valor': '' },
        { 'Informação': '', 'Valor': '' },
        { 'Informação': 'Total de Filtros Ativos', 'Valor': activeFiltersCount },
        { 'Informação': 'Total de Itens (sem filtros)', 'Valor': items.length },
        { 'Informação': 'Total de Itens (com filtros)', 'Valor': filteredAndSortedItems.length },
        { 'Informação': '', 'Valor': '' },
        { 'Informação': '📌 FILTROS APLICADOS:', 'Valor': '' },
      ];

      if (activeFiltersCount === 0) {
        filtersData.push({ 'Informação': 'Nenhum filtro aplicado', 'Valor': 'Todos os itens' });
      } else {
        activeFiltersResume.forEach(filter => {
          filtersData.push({ 'Informação': filter, 'Valor': '✓' });
        });
      }

      filtersData.push({ 'Informação': '', 'Valor': '' });
      filtersData.push({ 'Informação': 'Data da Exportação', 'Valor': new Date().toLocaleString('pt-BR') });
      filtersData.push({ 'Informação': 'Aba Ativa', 'Valor': activeTab === 'na_chada' ? 'Na CHADA' : activeTab === 'devolvidos' ? 'Devolvidos' : activeTab === 'diagnosticos' ? 'Diagnósticos' : 'Todos' });

      const ws4 = XLSX.utils.json_to_sheet(filtersData);
      ws4['!cols'] = [{ wch: 40 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws4, 'Filtros Aplicados');

      // Gerar e baixar o arquivo
      const filterSuffix = activeFiltersCount > 0 ? `_${activeFiltersCount}filtros` : '';
      const fileName = `Relatorio_CHADA_${new Date().toISOString().split('T')[0]}${filterSuffix}.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert('Relatório Excel gerado com sucesso! ✅');
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      alert('Erro ao gerar relatório Excel. Tente novamente.');
    }
  };

  // Função para exportar PDF
  const exportToPDF = async () => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      
      // Título
      page.drawText('Relatório CHADA - ' + new Date().toLocaleDateString('pt-BR'), {
        x: 50,
        y: height - 50,
        size: 16,
        color: rgb(0, 0, 0),
      });

      // Estatísticas
      let yPosition = height - 100;
      page.drawText(`Total de itens: ${stats.totalEnviados}`, { x: 50, y: yPosition, size: 12 });
      yPosition -= 20;
      page.drawText(`Na CHADA: ${stats.naChada}`, { x: 50, y: yPosition, size: 12 });
      yPosition -= 20;
      page.drawText(`Devolvidos: ${stats.devolvidos}`, { x: 50, y: yPosition, size: 12 });
      yPosition -= 20;
      page.drawText(`Tempo médio: ${stats.tempoMedioDias} dias`, { x: 50, y: yPosition, size: 12 });
      yPosition -= 40;

      // Lista de itens
      page.drawText('Lista de Itens:', { x: 50, y: yPosition, size: 14, color: rgb(0, 0, 0) });
      yPosition -= 30;

      filteredAndSortedItems.forEach((item, index) => {
        if (yPosition < 50) {
          // Se não há espaço, adiciona nova página
          const newPage = pdfDoc.addPage();
          yPosition = newPage.getSize().height - 50;
        }
        
        const itemText = `${index + 1}. ${item.name} - ${item.brand} (${item.serialNumber}) - ${item.statusChada}`;
        page.drawText(itemText, {
          x: 50,
          y: yPosition,
          size: 10,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
        
        if (item.problem) {
          const problemText = `   Problema: ${item.problem.substring(0, 80)}${item.problem.length > 80 ? '...' : ''}`;
          page.drawText(problemText, {
            x: 50,
            y: yPosition,
            size: 8,
            color: rgb(0.5, 0.5, 0.5),
          });
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

  // Função para refresh manual
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/chada-items");
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

  // Função para verificar emails e capturar números de OS
  const handleCheckEmails = async () => {
    setCheckingEmails(true);
    try {
      const response = await fetch("/api/chada/check-emails", {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Verificação concluída!\n\nEmails processados: ${result.processed}\nItens atualizados: ${result.updated}\n\nAtualizando lista...`);
        // Atualizar lista após verificar emails
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

  // Função para obter badge do status
  const getStatusBadge = (status: ChadaStatus) => {
    const styles = {
      'PENDENTE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'RECEBIDO': 'bg-blue-100 text-blue-800 border-blue-200',
      'EM_ANALISE': 'bg-purple-100 text-purple-800 border-purple-200',
      'CONSERTADO': 'bg-green-100 text-green-800 border-green-200',
      'SEM_CONSERTO': 'bg-red-100 text-red-800 border-red-200',
      'DEVOLVIDO': 'bg-green-100 text-green-800 border-green-200'
    };

    const labels = {
      'PENDENTE': '📦 Enviado',
      'RECEBIDO': '📥 Recebido',
      'EM_ANALISE': '🔍 Em Análise',
      'CONSERTADO': '✅ Consertado',
      'SEM_CONSERTO': '❌ Sem Conserto',
      'DEVOLVIDO': '📤 Devolvido'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Função para verificar se item precisa de alerta
  const needsAlert = (item: ChadaItem) => {
    if (item.statusChada === 'DEVOLVIDO' || item.statusChada === 'CONSERTADO' || item.statusChada === 'SEM_CONSERTO') {
      return false;
    }
    return getDaysInChada(item.createdAt, item.updatedAt) > 15;
  };

  // Função para renderizar timeline
  const renderTimeline = (item: ChadaItem) => {
    const steps = [
      { status: 'PENDENTE', label: 'Enviado', icon: Package },
      { status: 'RECEBIDO', label: 'Recebido', icon: CheckSquare },
      { status: 'EM_ANALISE', label: 'Em Análise', icon: Wrench },
      { status: 'CONSERTADO', label: 'Finalizado', icon: CheckCircle }
    ];

    const currentIndex = steps.findIndex(step => step.status === item.statusChada);

    return (
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.status} className="flex items-center">
              <div className={`
                flex items-center justify-center w-6 h-6 rounded-full border-2 
                ${isActive 
                  ? isCurrent 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'bg-green-500 border-green-500 text-white'
                  : 'bg-gray-200 border-gray-300 text-gray-400'
                }
              `}>
                <Icon size={12} weight={isActive ? 'fill' : 'regular'} />
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Controle CHADA
          </h1>
          <p className="text-gray-600">
            Gestão de equipamentos enviados para conserto
          </p>
        </div>

        {/* Alerta para itens antigos */}
        {stats.itensComAlerta > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-xl">
            <div className="flex items-center">
              <WarningCircle size={20} className="text-red-500 mr-2" />
              <div>
                <p className="text-red-800 font-medium">
                  Atenção! {stats.itensComAlerta} {stats.itensComAlerta === 1 ? 'item está' : 'itens estão'} há mais de 15 dias na CHADA
                </p>
                <p className="text-red-600 text-sm">
                  Verifique se é necessário tomar alguma ação
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerta para diagnósticos atrasados (3+ dias) */}
        {diagnostics.filter(d => d.isDelayed && d.status === 'AGUARDANDO_PECA').length > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-r-xl">
            <div className="flex items-center">
              <Printer size={20} className="text-orange-500 mr-2" />
              <div>
                <p className="text-orange-800 font-medium">
                  🚨 {diagnostics.filter(d => d.isDelayed && d.status === 'AGUARDANDO_PECA').length} impressora(s) aguardando peças há mais de 3 dias!
                </p>
                <p className="text-orange-600 text-sm">
                  Verifique o status das peças solicitadas na aba "Diagnósticos"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center">
              <ClipboardText size={20} className="text-gray-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEnviados}</p>
                <p className="text-sm text-gray-600">Total Enviados</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center">
              <Package size={20} className="text-orange-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.naChada}</p>
                <p className="text-sm text-gray-600">Na CHADA</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center">
              <CheckCircle size={20} className="text-green-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.devolvidos}</p>
                <p className="text-sm text-gray-600">Devolvidos</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center">
              <Clock size={20} className="text-blue-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.tempoMedioDias}</p>
                <p className="text-sm text-gray-600">Dias Médios</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center">
              <Printer size={20} className="text-purple-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {diagnostics.filter(d => d.status === 'AGUARDANDO_PECA').length}
                </p>
                <p className="text-sm text-gray-600">Esperando Peças</p>
              </div>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="bg-white rounded-xl border border-gray-200 dark:border-zinc-700 p-1 mb-6 shadow-sm">
          <div className="grid grid-cols-4 gap-1">
            {[
              { key: 'na_chada', label: 'Na CHADA', count: stats.naChada, icon: '📦', color: 'orange' },
              { key: 'devolvidos', label: 'Devolvidos', count: stats.devolvidos, icon: '✅', color: 'green' },
              { key: 'todos', label: 'Todos', count: stats.totalEnviados, icon: '📊', color: 'blue' },
              { key: 'diagnosticos', label: 'Diagnósticos', count: diagnostics.length, icon: '🔧', color: 'purple', alert: diagnostics.filter(d => d.isDelayed && d.status === 'AGUARDANDO_PECA').length > 0 }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`
                  relative flex flex-col items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200
                  ${activeTab === tab.key 
                    ? tab.color === 'orange' ? 'bg-orange-500 text-white shadow-md' :
                      tab.color === 'green' ? 'bg-green-500 text-white shadow-md' :
                      tab.color === 'blue' ? 'bg-blue-500 text-white shadow-md' :
                      'bg-purple-500 text-white shadow-md'
                    : `bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200`
                  }
                `}
              >
                {/* Indicador de alerta para diagnósticos */}
                {tab.alert && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                )}

                {/* Ícone */}
                <span className="text-lg">{tab.icon}</span>
                
                {/* Texto */}
                <div className="text-center">
                  <div className="text-sm font-semibold leading-tight">{tab.label}</div>
                  <div className={`text-xs mt-1 ${activeTab === tab.key ? 'text-white/90' : 'text-gray-500'}`}>
                    ({tab.count})
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Controles */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Ações Rápidas */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  setModalIsOpen(true);
                  fetchAllItems();
                }}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Enviar para CHADA</span>
                <span className="sm:hidden">Enviar</span>
              </button>

              <button
                onClick={() => setShowDiagnosticModal(true)}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm sm:text-base"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Novo Diagnóstico</span>
                <span className="sm:hidden">Diagnóstico</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                <ArrowClockwise size={16} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Atualizando...' : 'Atualizar'}
              </button>

              <div className="flex gap-2 flex-1 sm:flex-initial">
                <button
                  onClick={handleCheckEmails}
                  disabled={checkingEmails}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm flex-1 sm:flex-initial disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title="Verificar emails da CHADA e capturar números de OS"
                >
                  <span className="text-lg">{checkingEmails ? '⏳' : '📧'}</span>
                  <span className="hidden sm:inline">{checkingEmails ? 'Verificando...' : 'Verificar Emails'}</span>
                  <span className="sm:hidden">{checkingEmails ? '...' : 'Email'}</span>
                </button>

                <button
                  onClick={exportToExcel}
                  className="relative flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm flex-1 sm:flex-initial"
                  title={getActiveFiltersCount() > 0
                    ? `Exportar relatório com ${getActiveFiltersCount()} filtro(s) aplicado(s)`
                    : "Exportar relatório completo em Excel"}
                >
                  {getActiveFiltersCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                  <span className="text-lg">📊</span>
                  <span className="hidden sm:inline">Exportar Excel</span>
                  <span className="sm:hidden">Excel</span>
                </button>

                <button
                  onClick={exportToCSV}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm flex-1 sm:flex-initial"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Exportar CSV</span>
                  <span className="sm:hidden">CSV</span>
                </button>

                <button
                  onClick={exportToPDF}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex-1 sm:flex-initial"
                >
                  <FileText size={16} />
                  <span className="hidden sm:inline">Exportar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>
              </div>
            </div>

            {/* Busca */}
            <div className="w-full">
              <div className="relative">
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Indicador de Filtros Ativos */}
            {getActiveFiltersCount() > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      {getActiveFiltersCount()} {getActiveFiltersCount() === 1 ? 'filtro ativo' : 'filtros ativos'}
                    </span>
                    <span className="text-sm text-blue-700">
                      Mostrando {filteredAndSortedItems.length} de {items.length} itens
                    </span>
                  </div>
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    <X size={16} />
                    Limpar Todos
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {getActiveFiltersResume().map((filter, index) => (
                    <span key={index} className="bg-white border border-blue-300 text-blue-800 px-2 py-1 rounded text-xs">
                      {filter}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Filtros Rápidos */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">🚀 Filtros Rápidos</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <button
                  onClick={() => setQuickFilter('none')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    quickFilter === 'none'
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setQuickFilter('alert')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    quickFilter === 'alert'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ⚠️ Com Alerta
                </button>
                <button
                  onClick={() => setQuickFilter('withOS')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    quickFilter === 'withOS'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📋 Com OS
                </button>
                <button
                  onClick={() => setQuickFilter('withoutOS')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    quickFilter === 'withoutOS'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📋 Sem OS
                </button>
                <button
                  onClick={() => setQuickFilter('emailSent')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    quickFilter === 'emailSent'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📧 Email Enviado
                </button>
                <button
                  onClick={() => setQuickFilter('emailNotSent')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    quickFilter === 'emailNotSent'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📧 Sem Email
                </button>
              </div>
            </div>

            {/* Filtros Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Setor</label>
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">Todos os Setores</option>
                  {uniqueSectors.map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Status CHADA</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">Todos os Status</option>
                  {uniqueStatus.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo de Item</label>
                <select
                  value={itemTypeFilter}
                  onChange={(e) => setItemTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="impressora">🖨️ Impressora</option>
                  <option value="computador">💻 Computador</option>
                  <option value="notebook">💼 Notebook</option>
                  <option value="monitor">🖥️ Monitor</option>
                  <option value="projetor">📽️ Projetor</option>
                  <option value="outros">📦 Outros</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tempo na CHADA</label>
                <select
                  value={daysInChadaFilter}
                  onChange={(e) => setDaysInChadaFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">Qualquer tempo</option>
                  <option value="<15">⚡ Menos de 15 dias</option>
                  <option value=">15">⚠️ Mais de 15 dias</option>
                  <option value=">30">🔴 Mais de 30 dias</option>
                </select>
              </div>
            </div>

            {/* Filtro de Período */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">📅 Período de Envio</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <button
                  onClick={() => setPeriodFilter('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    periodFilter === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setPeriodFilter('7')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    periodFilter === '7'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  7 dias
                </button>
                <button
                  onClick={() => setPeriodFilter('15')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    periodFilter === '15'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  15 dias
                </button>
                <button
                  onClick={() => setPeriodFilter('30')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    periodFilter === '30'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  30 dias
                </button>
                <button
                  onClick={() => setPeriodFilter('60')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    periodFilter === '60'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  60 dias
                </button>
                <button
                  onClick={() => setPeriodFilter('custom')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    periodFilter === 'custom'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Personalizado
                </button>
              </div>

              {periodFilter === 'custom' && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Data Início</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Data Fim</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Ordenação - Mobile Friendly */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm text-gray-600">Ordenar por:</span>
              <div className="flex flex-wrap gap-1">
                {renderSortButton('createdAt', 'Envio')}
                {renderSortButton('updatedAt', 'Atualização')}
                {renderSortButton('sector', 'Setor')}
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo da aba ativa */}
        {activeTab === 'diagnosticos' ? (
          // Seção de Diagnósticos
          <div className="space-y-4">
            {loadingDiagnostics ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-500">Carregando diagnósticos...</p>
              </div>
            ) : diagnostics.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                <Printer size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Nenhum diagnóstico cadastrado</p>
                <p className="text-gray-400 text-sm mt-2">
                  Clique em "Novo Diagnóstico" para começar
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {diagnostics.map((diagnostic) => (
                  <div key={diagnostic.id} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {diagnostic.Item.name} - {diagnostic.Item.brand}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            diagnostic.status === 'AGUARDANDO_PECA' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : diagnostic.status === 'PECA_CHEGOU'
                              ? 'bg-blue-100 text-blue-800'
                              : diagnostic.status === 'INSTALADO'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {diagnostic.status === 'AGUARDANDO_PECA' && '⏳ Aguardando Peça'}
                            {diagnostic.status === 'PECA_CHEGOU' && '📦 Peça Chegou'}
                            {diagnostic.status === 'INSTALADO' && '✅ Instalado'}
                            {diagnostic.status === 'CANCELADO' && '❌ Cancelado'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Serial:</strong> {diagnostic.Item.serialNumber}</p>
                          <p><strong>Setor:</strong> {diagnostic.sectorName}</p>
                          <p><strong>Técnico CHADA:</strong> {diagnostic.technicianChada}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${
                          diagnostic.isDelayed ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {diagnostic.isDelayed && '⚠️ '}{diagnostic.timeWaiting || `${diagnostic.daysWaiting} dias`}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(diagnostic.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {/* Diagnóstico */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Diagnóstico:</h4>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-sm">
                        {diagnostic.diagnostic}
                      </p>
                    </div>

                    {/* Peça Solicitada */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Peça Solicitada:</h4>
                      <p className="text-gray-900 bg-blue-50 p-3 rounded-lg text-sm border-l-4 border-blue-400">
                        {diagnostic.requestedPart}
                      </p>
                    </div>

                    {/* Ações */}
                    {diagnostic.status !== 'INSTALADO' && diagnostic.status !== 'CANCELADO' && (
                      <div className="flex gap-2 flex-wrap">
                        {diagnostic.status === 'AGUARDANDO_PECA' && (
                          <button
                            onClick={() => handleUpdateDiagnosticStatus(diagnostic.id, 'PECA_CHEGOU')}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                          >
                            📦 Peça Chegou
                          </button>
                        )}
                        {diagnostic.status === 'PECA_CHEGOU' && (
                          <button
                            onClick={() => handleUpdateDiagnosticStatus(diagnostic.id, 'INSTALADO')}
                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                          >
                            ✅ Marcar como Instalado
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateDiagnosticStatus(diagnostic.id, 'CANCELADO')}
                          className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                        >
                          ❌ Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Lista de Itens CHADA (aba original)
          <div className="space-y-4">
            {filteredAndSortedItems.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm || sectorFilter !== 'all' || statusFilter !== 'all'
                  ? 'Nenhum item encontrado com os filtros aplicados'
                  : activeTab === 'na_chada' 
                    ? 'Nenhum item na CHADA'
                    : activeTab === 'devolvidos'
                      ? `Nenhum item devolvido ainda (Debug: ${stats.devolvidos} devolvidos nas estatísticas)`
                      : 'Nenhum item encontrado'
                }
              </p>
              {activeTab === 'devolvidos' && stats.devolvidos > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    🐛 <strong>Debug:</strong> Há {stats.devolvidos} item(ns) devolvido(s) nas estatísticas, mas não aparecem aqui.
                    <br />Verifique o console para mais detalhes.
                  </p>
                </div>
              )}
              {(searchTerm || sectorFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedItems.map((item) => (
                <div key={item.id} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                  {/* Header do Card */}
                  <div className="mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{item.name}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(item.statusChada)}
                            <span className={`text-xs sm:text-sm whitespace-nowrap ${
                              needsAlert(item) 
                                ? 'text-red-600 font-medium bg-red-100 px-2 py-1 rounded' 
                                : 'text-gray-500'
                            }`}>
                              {needsAlert(item) && '⚠️ '}{getDaysInChada(item.createdAt, item.updatedAt)} dias
                            </span>
                          </div>
                        </div>
                        <div className="hidden sm:block">{renderTimeline(item)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Informações do Item */}
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                      {/* Marca/Serial */}
                      <div className="bg-white rounded-md p-3 border-l-4 border-blue-400">
                        <div className="flex items-center mb-1">
                          <Package size={16} className="text-blue-500 mr-2" />
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Equipamento</p>
                        </div>
                        <p className="font-bold text-gray-900 text-sm sm:text-base leading-tight">{item.brand}</p>
                        <p className="text-xs text-gray-600 mt-1 font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                          {item.serialNumber}
                        </p>
                      </div>

                      {/* Setor */}
                      <div className="bg-white rounded-md p-3 border-l-4 border-green-400">
                        <div className="flex items-center mb-1">
                          <Buildings size={16} className="text-green-500 mr-2" />
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Setor/Escola</p>
                        </div>
                        <p className="font-bold text-gray-900 text-sm sm:text-base">{item.sector}</p>
                      </div>

                      {/* Usuário */}
                      <div className="bg-white rounded-md p-3 border-l-4 border-purple-400">
                        <div className="flex items-center mb-1">
                          <User size={16} className="text-purple-500 mr-2" />
                          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Enviado por</p>
                        </div>
                        <p className="font-bold text-gray-900 text-sm sm:text-base">{item.userName}</p>
                      </div>
                    </div>

                    {/* Número de OS da CHADA */}
                    {(item.numeroChadaOS || item.emailSentAt) && (
                      <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {item.numeroChadaOS && (
                          <div className="bg-white rounded-md p-3 border-l-4 border-yellow-400">
                            <div className="flex items-center mb-1">
                              <span className="text-yellow-500 mr-2">📋</span>
                              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">OS CHADA</p>
                            </div>
                            <p className="font-bold text-gray-900 text-lg">{item.numeroChadaOS}</p>
                          </div>
                        )}
                        {item.emailSentAt && (
                          <div className="bg-white rounded-md p-3 border-l-4 border-indigo-400">
                            <div className="flex items-center mb-1">
                              <span className="text-indigo-500 mr-2">📧</span>
                              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Email Enviado</p>
                            </div>
                            <p className="text-sm text-gray-700">
                              {new Date(item.emailSentAt).toLocaleString('pt-BR')}
                            </p>
                            {!item.numeroChadaOS && (
                              <p className="text-xs text-orange-600 mt-1">⏳ Aguardando resposta da CHADA</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Problema */}
                  <div className="mb-4">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Problema Relatado</p>
                    <p className="text-sm sm:text-base text-gray-900 bg-gray-50 p-2 sm:p-3 rounded-lg break-words ">{item.problem}</p>
                  </div>

                  {/* Observações da CHADA (se houver) */}
                  {item.observacoes && (
                    <div className="mb-4">
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">Observações da CHADA</p>
                      <p className="text-sm sm:text-base text-gray-900 bg-blue-50 p-2 sm:p-3 rounded-lg border-l-4 border-blue-400 break-words">{item.observacoes}</p>
                    </div>
                  )}

                  {/* Datas */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-gray-500 mb-4">
                    <span className="flex items-center">
                      <Calendar size={12} className="mr-1" />
                      Enviado: {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                    {item.statusChada !== 'PENDENTE' && (
                      <span className="flex items-center">
                        <Clock size={12} className="mr-1" />
                        Atualizado: {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {(item.statusChada === 'PENDENTE' || item.statusChada === 'RECEBIDO' || item.statusChada === 'EM_ANALISE') && (
                      <button
                        onClick={() => {
                          setBaixaItemId(item.id);
                          setShowBaixaModal(true);
                          setNovoModelo("");
                          setNovoSerial("");
                          setChadaStatus('CONSERTADO');
                          setObservacoes("");
                                                  }}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs sm:text-sm"
                      >
                        <CheckCircle size={14} />
                        <span className="hidden sm:inline">Atualizar Status</span>
                        <span className="sm:hidden">Status</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => handlePrintOS(item)}
                      className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm"
                    >
                      <Printer size={14} />
                      <span className="hidden sm:inline">Imprimir OS</span>
                      <span className="sm:hidden">OS</span>
                    </button>

                    {/* Botões de Imagem */}
                    {item.osImages && Array.isArray(item.osImages) && item.osImages.length > 0 ? (
                      item.osImages.map((history: any, index: number) => (
                        <div key={index} className="flex gap-1">
                          {history.images?.map((url: string, i: number) => (
                            <button
                              key={i}
                              onClick={() => window.open(url, "_blank")}
                              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-xs sm:text-sm"
                            >
                              <Eye size={14} />
                              <span className="hidden sm:inline">Ver Laudo</span>
                              <span className="sm:hidden">Ver</span>
                            </button>
                          ))}
                        </div>
                      ))
                    ) : (
                      item.statusChada !== 'PENDENTE' && (
                        <button
                          onClick={() => handleUploadOS(item.id)}
                          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-xs sm:text-sm"
                        >
                          <CloudArrowUp size={14} />
                          <span className="hidden sm:inline">Subir Laudo</span>
                          <span className="sm:hidden">Upload</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
      {modalIsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-zinc-700">Adicionar Item à CHADA</h2>
            <Select
              options={allItems.map((item: any) => ({
                value: item.id,
                label: `${item.name} - ${item.serialNumber || "Sem Serial"}`,
              }))}
              onChange={(selectedOption) =>
                setSelectedItem(selectedOption ? selectedOption.value : null)
              }
              placeholder="Selecione um item"
              className="mb-4 text-zinc-800"
            />
            <input
              type="text"
              className="w-full mb-4 p-2 border border-gray-300 rounded"
              placeholder="Informe o setor"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            />
            <textarea
              className="w-full mb-4 p-2 border border-gray-300 rounded"
              placeholder="Descreva o problema"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />

            {/* Checkbox para manutenção sem movimentação */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manutencaoSemMovimentacao}
                  onChange={(e) => setManutencaoSemMovimentacao(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900 block">
                    Manutenção sem movimentação física
                  </span>
                  <span className="text-sm text-gray-600 block mt-1">
                    Marque esta opção se o equipamento não será fisicamente movido para o CSDT.
                    Ideal para <strong>impressoras fixas</strong> ou equipamentos que serão consertados no local.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={() => {
                  setModalIsOpen(false);
                  setProblem("");
                  setSector("");
                  setSelectedItem(null);
                  setManutencaoSemMovimentacao(false);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors order-2 sm:order-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddToChada}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors order-1 sm:order-2"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
      {showBaixaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-zinc-700">Atualizar Status do Item</h2>
            
            {/* Status */}
            <label className="block mb-2 font-medium text-zinc-600">Novo Status</label>
            <select
              value={chadaStatus}
              onChange={(e) => setChadaStatus(e.target.value as ChadaStatus)}
              className="w-full mb-4 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="RECEBIDO">📥 Recebido</option>
              <option value="EM_ANALISE">🔍 Em Análise</option>
              <option value="CONSERTADO">✅ Consertado</option>
              <option value="SEM_CONSERTO">❌ Sem Conserto</option>
              <option value="DEVOLVIDO">📤 Devolvido</option>
            </select>

            {/* Observações */}
            <label className="block mb-2 font-medium text-zinc-600">Observações da CHADA</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full mb-4 p-2 border border-gray-300 rounded h-20 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Observações sobre o reparo, diagnóstico, etc..."
            />

            
            <label className="block mb-2 font-medium text-zinc-600">Trocou o modelo?</label>
            <input
              type="text"
              className="w-full mb-4 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Novo modelo (deixe em branco se não trocou)"
              value={novoModelo}
              onChange={(e) => setNovoModelo(e.target.value)}
            />
            
            <label className="block mb-2 font-medium text-zinc-600">Mudou o serial?</label>
            <input
              type="text"
              className="w-full mb-4 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Novo serial (deixe em branco se não mudou)"
              value={novoSerial}
              onChange={(e) => setNovoSerial(e.target.value)}
            />
            
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <button
                onClick={() => {
                  setShowBaixaModal(false);
                  setNovoModelo("");
                  setNovoSerial("");
                  setChadaStatus('CONSERTADO');
                  setObservacoes("");
                                    setBaixaItemId(null);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors order-2 sm:order-1"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
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
                      // Forçar atualização dos dados
                      const updatedItems = await fetch("/api/chada-items?" + new Date().getTime()).then((res) => res.json());
                      console.log('Dados atualizados:', updatedItems);
                      setItems(updatedItems);
                      // Garantir que o estado seja atualizado
                      setTimeout(() => {
                        setItems(prev => [...updatedItems]);
                      }, 100);
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
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors order-1 sm:order-2"
              >
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

            {/* Impressora */}
            <div className="mb-4">
              <label className="block mb-2 font-medium text-zinc-600">Impressora *</label>
              <Select
                options={printers}
                value={selectedPrinter}
                onChange={setSelectedPrinter}
                placeholder="Selecione uma impressora"
                className="text-zinc-800"
                isSearchable
              />
            </div>

            {/* Setor */}
            <div className="mb-4">
              <label className="block mb-2 font-medium text-zinc-600">Setor *</label>
              <Select
                options={sectors}
                value={selectedSector}
                onChange={setSelectedSector}
                placeholder="Selecione o setor"
                className="text-zinc-800"
                isSearchable
              />
            </div>

            {/* Técnico CHADA */}
            <div className="mb-4">
              <label className="block mb-2 font-medium text-zinc-600">Técnico da CHADA *</label>
              <input
                type="text"
                value={technicianChada}
                onChange={(e) => setTechnicianChada(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Nome do técnico que fez o diagnóstico"
              />
            </div>

            {/* Diagnóstico/Laudo */}
            <div className="mb-4">
              <label className="block mb-2 font-medium text-zinc-600">Diagnóstico/Laudo *</label>
              <textarea
                value={diagnostic}
                onChange={(e) => setDiagnostic(e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Descreva o problema encontrado e o diagnóstico..."
              />
            </div>

            {/* Peça Solicitada */}
            <div className="mb-6">
              <label className="block mb-2 font-medium text-zinc-600">Peça Solicitada *</label>
              <input
                type="text"
                value={requestedPart}
                onChange={(e) => setRequestedPart(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Qual peça foi solicitada para o reparo?"
              />
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => {
                  setShowDiagnosticModal(false);
                  setSelectedPrinter(null);
                  setSelectedSector(null);
                  setTechnicianChada("");
                  setDiagnostic("");
                  setRequestedPart("");
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors order-2 sm:order-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddDiagnostic}
                disabled={!selectedPrinter || !selectedSector || !technicianChada || !diagnostic || !requestedPart}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
              >
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
                <WarningCircle size={48} className="text-yellow-600" weight="fill" />
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

            <button
              onClick={() => {
                setShowCsdtWarningModal(false);
                setProblem("");
                setSector("");
                setSelectedItem(null);
              }}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChadaPage;