import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import axios from "axios";
import { supabase } from "@/lib/supabaseClient";

export interface Item {
  id: number;
  name: string;
  brand: string;
  serialNumber: string;
  createdAt: string;
  inep: string;
  Profile: { displayName: string; userId: string; };
  School: { name: string; };
}

export const ITEMS_PER_PAGE = 13; // Itens por página no PDF de entrega
const itemsPerPage = 10; // Número de itens por página na listagem

export function useDeviceList() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolItemCount, setSchoolItemCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemHistory, setItemHistory] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [district, setDistrict] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<"step1" | "step2">("step1");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editSerial, setEditSerial] = useState("");
  const [editSchoolId, setEditSchoolId] = useState<number | null>(null);
  const [editSchools, setEditSchools] = useState<any[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [relatedData, setRelatedData] = useState<any>(null);
  const [loadingRelatedData, setLoadingRelatedData] = useState(false);

  // Novos estados para funcionalidades avançadas
  const [showDashboard, setShowDashboard] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'table'>('list');
  const [groupBy, setGroupBy] = useState<'school' | 'type' | 'status' | 'date' | 'district'>('school');
  const [showGrouping, setShowGrouping] = useState(false);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [activeFilters, setActiveFilters] = useState<any>(null);
  const [showReports, setShowReports] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  // NOVOS ESTADOS para troca de equipamentos
  const [memorandumType, setMemorandumType] = useState<"entrega" | "troca" | "devolucao">("entrega");
  const [exchangeFromSchool, setExchangeFromSchool] = useState("");
  const [exchangeToSchool, setExchangeToSchool] = useState("");
  const [selectedFromCSDT, setSelectedFromCSDT] = useState<number[]>([]);
  const [selectedFromDestino, setSelectedFromDestino] = useState<number[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setModalMessage("Usuário não autenticado. Por favor, faça login.");
      setModalIsOpen(true);
      return;
    }

    try {
      const decoded = jwtDecode<{ userId: string; name: string }>(token);
      if (!decoded) {
        setModalMessage("Usuário não autenticado. Por favor, faça login.");
        setModalIsOpen(true);
        return;
      }
      setUserName(decoded.name);
      setUserId(decoded.userId);
    } catch (error) {
      setModalMessage("Usuário não autenticado. Por favor, faça login.");
      setModalIsOpen(true);
      return;
    }

    const fetchItems = async () => {
      try {
        // Busca paginada: carrega a primeira página rapidamente
        const response = await fetch(`/api/items?page=1&size=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Expected JSON but got:", text);
          setModalMessage("Erro ao buscar itens. Resposta inesperada do servidor.");
          setModalIsOpen(true);
          return;
        }

        const data = await response.json();
        if (data.items && Array.isArray(data.items)) {
          setItems(data.items);
          setTotalItems(data.total);
        } else if (Array.isArray(data)) {
          setItems(data);
          setTotalItems(data.length);
        } else {
          console.error("Expected an array but got:", data);
        }

        // Em seguida, carrega TODOS os itens para funcionalidades que precisam
        fetchAllItems(token);
      } catch (error) {
        console.error("Error fetching items:", error);
        setModalMessage("Erro ao buscar itens.");
        setModalIsOpen(true);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  // Busca todos os itens (para dashboard, exportar, relatórios, etc.)
  const fetchAllItems = async (token?: string) => {
    const authToken = token || localStorage.getItem("token");
    if (!authToken) return;
    try {
      const response = await fetch("/api/items", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data)) {
        setItems(data);
        setTotalItems(data.length);
      }
    } catch (error) {
      console.error("Error fetching all items:", error);
    }
  };

  useEffect(() => {
    const countItemsInSchool = () => {
      const count = items.filter(
        (item) => item.School && item.School.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ).length;
      setSchoolItemCount(count);
    };

    if (Array.isArray(items)) {
      countItemsInSchool();
      if (!activeFilters) {
        setFilteredItems(items);
      }
    }
  }, [searchTerm, items, activeFilters]);

  useEffect(() => {
    async function fetchItems() {
      try {
        const response = await axios.get("/api/all-schools");
        setSchools(response.data);
      } catch (error) {}
    }
    fetchItems();
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      const token = localStorage.getItem("token");
      if (!token) { console.error("Token não encontrado no localStorage."); return; }

      try {
        const decoded = jwtDecode<{ userId: string }>(token);
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) { console.error("Erro ao buscar usuário no Supabase:", error); return; }

        const response = await fetch(`/api/get-role?userId=${user.id}`);
        const data = await response.json();

        if (response.ok && data.role) {
          setUserRole(data.role);
        } else {
          console.error("Erro ao buscar a role:", data.error);
        }
      } catch (error) {
        console.error("Erro ao buscar a role do usuário:", error);
      }
    };

    fetchUserRole();
  }, []);

  // Filtros básicos
  const basicFilteredItems = Array.isArray(items)
    ? items
        .filter((item) =>
          (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.School && item.School.name.toLowerCase().includes(searchTerm.toLowerCase())),
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const displayItems = activeFilters ? filteredItems : basicFilteredItems;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = displayItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(displayItems.length / itemsPerPage);

  const handlePageChange = (page: number) => { setCurrentPage(page); };

  const fetchRelatedData = async (itemId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setModalMessage("Usuário não autenticado. Por favor, faça login.");
      setModalIsOpen(true);
      return null;
    }
    setLoadingRelatedData(true);
    try {
      const response = await fetch(`/api/items/${itemId}/related-data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        const errorData = await response.json();
        setModalMessage(`Erro ao buscar dados relacionados: ${errorData.error}`);
        setModalIsOpen(true);
        return null;
      }
    } catch (error) {
      console.error("Erro ao buscar dados relacionados:", error);
      setModalMessage("Erro ao buscar dados relacionados");
      setModalIsOpen(true);
      return null;
    } finally {
      setLoadingRelatedData(false);
    }
  };

  const openEditModal = async (item: any) => {
    setItemToEdit(item);
    setEditName(item.name || "");
    setEditBrand(item.brand || "");
    setEditSerial(item.serialNumber || "");
    setEditSchoolId(null);
    if (editSchools.length === 0) {
      const res = await fetch("/api/all-locations");
      const data = await res.json();
      setEditSchools(data);
    }
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!itemToEdit) return;
    setEditLoading(true);
    try {
      const res = await fetch("/api/update-item", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemToEdit.id, name: editName, brand: editBrand,
          serialNumber: editSerial, schoolId: editSchoolId || undefined,
        }),
      });
      if (!res.ok) { const err = await res.json(); alert(err.error || "Erro ao atualizar item."); return; }
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
      setEditModalOpen(false);
    } catch {
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setEditLoading(false);
    }
  };

  const openDeleteModal = async (item: any) => {
    setItemToDelete(item);
    const data = await fetchRelatedData(item.id);
    if (data) { setRelatedData(data); setDeleteModalOpen(true); }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const token = localStorage.getItem("token");
    if (!token) { setModalMessage("Usuário não autenticado. Por favor, faça login."); setModalIsOpen(true); return; }

    try {
      const response = await fetch(`/api/items/${itemToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        setModalMessage(
          `✅ Item deletado com sucesso!\n\n` +
          `📦 Item: ${result.deletedData.item.name} (${result.deletedData.item.serialNumber})\n\n` +
          `🗑️ Dados relacionados removidos:\n` +
          `• ${result.deletedData.relatedRecords.itemHistory} registros de histórico\n` +
          `• ${result.deletedData.relatedRecords.memorandumItems} itens de memorando\n` +
          `• ${result.deletedData.relatedRecords.chadaRecords} registros CHADA\n\n` +
          `Todos os dados foram removidos permanentemente.`
        );
        setModalIsOpen(true);
        setItems(items.filter((item) => item.id !== itemToDelete.id));
      } else {
        const errorData = await response.json();
        setModalMessage(`❌ Erro ao apagar item: ${errorData.error}`);
        setModalIsOpen(true);
      }
    } catch (error) {
      console.error("Erro ao apagar item:", error);
      setModalMessage("❌ Erro ao apagar item");
      setModalIsOpen(true);
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
      setRelatedData(null);
    }
  };

  const exportToExcel = () => {
    const formattedItems = items.map((item) => ({
      ID: item.id,
      Nome: item.name,
      Marca: item.brand,
      "Número de Série": item.serialNumber,
      Escola: item.School.name,
      "Data de Criação": format(new Date(item.createdAt), "dd/MM/yyyy, HH:mm:ss", { locale: ptBR }),
      "Adicionado por": item.Profile.displayName,
    }));
    const worksheet = XLSX.utils.json_to_sheet(formattedItems);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Itens");
    XLSX.writeFile(workbook, "itens.xlsx");
  };

  const calculateTotals = () => {
    const totals: Record<string, number> = {
      COMPUTADOR: 0, MONITOR: 0, MOUSE: 0, TECLADO: 0, ESTABILIZADOR: 0, IMPRESSORA: 0, NOTEBOOK: 0,
    };
    items.forEach((item) => {
      const title = item.name.toUpperCase().trim();
      if (totals.hasOwnProperty(title)) { totals[title]++; }
    });
    return totals;
  };

  const generateCompleteBackup = async () => {
    const token = localStorage.getItem("token");
    if (!token) { setModalMessage("Usuário não autenticado. Por favor, faça login."); setModalIsOpen(true); return; }

    setLoading(true);
    try {
      const [itemsRes, schoolsRes, historiesRes] = await Promise.all([
        fetch("/api/items", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/all-schools", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/backup/histories", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const backupData = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        items: await itemsRes.json(),
        schools: await schoolsRes.json(),
        histories: await historiesRes.json(),
        summary: {
          totalItems: items.length,
          totalSchools: schools.length,
          exportedBy: userName,
          categories: calculateTotals()
        }
      };

      const jsonBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const workbook = XLSX.utils.book_new();

      const formattedItems = backupData.items.map((item: any) => ({
        ID: item.id, Nome: item.name, Marca: item.brand, "Número de Série": item.serialNumber,
        Escola: item.School?.name || "N/A", INEP: item.inep || "N/A",
        "Data de Criação": format(new Date(item.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
        "Adicionado por": item.Profile?.displayName || "N/A",
        "Status": item.School?.name === "CHADA" ? "Manutenção" : "Ativo"
      }));

      const formattedSchools = backupData.schools.map((school: any) => ({
        ID: school.id, Nome: school.name, Distrito: school.district, INEP: school.inep,
        "Qtd Equipamentos": backupData.items.filter((item: any) => item.School?.name === school.name).length
      }));

      const summaryData = [
        { "Categoria": "Total de Equipamentos", "Quantidade": backupData.summary.totalItems },
        { "Categoria": "Total de Escolas", "Quantidade": backupData.summary.totalSchools },
        { "Categoria": "COMPUTADORES", "Quantidade": backupData.summary.categories.COMPUTADOR },
        { "Categoria": "NOTEBOOKS", "Quantidade": backupData.summary.categories.NOTEBOOK },
        { "Categoria": "MONITORES", "Quantidade": backupData.summary.categories.MONITOR },
        { "Categoria": "MOUSES", "Quantidade": backupData.summary.categories.MOUSE },
        { "Categoria": "TECLADOS", "Quantidade": backupData.summary.categories.TECLADO },
        { "Categoria": "ESTABILIZADORES", "Quantidade": backupData.summary.categories.ESTABILIZADOR },
        { "Categoria": "IMPRESSORAS", "Quantidade": backupData.summary.categories.IMPRESSORA },
        { "Categoria": "Data do Backup", "Quantidade": format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) },
        { "Categoria": "Gerado por", "Quantidade": userName || "N/A" }
      ];

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(formattedItems), "Equipamentos");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(formattedSchools), "Escolas");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), "Resumo");

      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");

      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement("a");
      jsonLink.href = jsonUrl;
      jsonLink.download = `backup-csdt-${timestamp}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click(); jsonLink.remove();
      URL.revokeObjectURL(jsonUrl);

      XLSX.writeFile(workbook, `backup-csdt-${timestamp}.xlsx`);

      setModalMessage(
        `✅ Backup gerado com sucesso!\n\n` +
        `📁 Arquivos baixados:\n` +
        `• backup-csdt-${timestamp}.json (dados completos)\n` +
        `• backup-csdt-${timestamp}.xlsx (planilha com 3 abas)\n\n` +
        `📊 Resumo do backup:\n` +
        `• ${backupData.summary.totalItems} equipamentos\n` +
        `• ${backupData.summary.totalSchools} escolas\n` +
        `• Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}`
      );
      setModalIsOpen(true);
    } catch (error) {
      console.error("Erro ao gerar backup:", error);
      setModalMessage("❌ Erro ao gerar backup. Tente novamente.");
      setModalIsOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMemorandum = async () => {
    const token = localStorage.getItem("token");
    if (!token) { alert("Usuário não autenticado. Por favor, faça login."); return; }

    if (memorandumType === "entrega") {
      if (selectedFromCSDT.length === 0) { alert("Selecione pelo menos um item para entrega."); return; }
      if (!schoolName) { alert("Por favor, selecione uma escola."); return; }
      if (!district) { alert("O distrito não foi definido. Verifique a escola selecionada."); return; }
    } else if (memorandumType === "devolucao") {
      if (selectedFromDestino.length === 0) { alert("Selecione pelo menos um item para devolucao."); return; }
      if (!schoolName) { alert("Por favor, selecione a escola de origem."); return; }
      if (!district) { alert("O distrito nao foi definido. Verifique a escola selecionada."); return; }
    } else if (memorandumType === "troca") {
      if (!exchangeToSchool) { alert("Por favor, selecione a escola de destino."); return; }
      if (selectedFromCSDT.length === 0 && selectedFromDestino.length === 0) {
        alert("Selecione pelo menos um item para troca (que sai do CSDT ou que volta da escola)."); return;
      }
    }

    if (memorandumType === "troca") {
      if (selectedFromCSDT.length > 10) {
        setModalMessage(`🚫 Limite excedido!\n\nVocê selecionou ${selectedFromCSDT.length} itens do CSDT, mas o máximo são 10 itens por categoria.\n\nPor favor, desmarque alguns itens antes de continuar.`);
        setModalIsOpen(true); return;
      }
      if (selectedFromDestino.length > 10) {
        setModalMessage(`🚫 Limite excedido!\n\nVocê selecionou ${selectedFromDestino.length} itens da escola, mas o máximo são 10 itens por categoria.\n\nPor favor, desmarque alguns itens antes de continuar.`);
        setModalIsOpen(true); return;
      }
    }

    try {
      if (memorandumType === "troca") {
        const itemsNotInCSDT = items.filter((item) => selectedFromCSDT.includes(item.id) && item.School?.name !== "CSDT");
        if (itemsNotInCSDT.length > 0) {
          const itemNames = itemsNotInCSDT.map((item) => item.name).join(", ");
          setModalMessage(`O(s) item(s) ${itemNames} não está(ão) no CSDT. Verifique a localização dos equipamentos.`);
          setModalIsOpen(true); return;
        }
        if (selectedFromDestino.length > 0) {
          const itemsNotInDestination = items.filter((item) => selectedFromDestino.includes(item.id) && item.School?.name !== exchangeToSchool);
          if (itemsNotInDestination.length > 0) {
            const itemNames = itemsNotInDestination.map((item) => item.name).join(", ");
            setModalMessage(`O(s) item(s) ${itemNames} não está(ão) na escola "${exchangeToSchool}". Verifique a localização dos equipamentos.`);
            setModalIsOpen(true); return;
          }
        }
      }

      if (memorandumType === "entrega") {
        const itemsInChada = items.filter((item) => selectedFromCSDT.includes(item.id) && item.School?.name === "CHADA");
        if (itemsInChada.length > 0) {
          const itemNames = itemsInChada.map((item) => item.name).join(", ");
          setModalMessage(`O(s) item(s) ${itemNames} está(ão) na CHADA. Por favor, dar baixa no(s) item(s) para o CSDT antes de fazer o memorando.`);
          setModalIsOpen(true); return;
        }
      }

      if (memorandumType === "devolucao") {
        const itemsNotInSourceSchool = items.filter((item) => selectedFromDestino.includes(item.id) && item.School?.name !== schoolName);
        if (itemsNotInSourceSchool.length > 0) {
          const itemNames = itemsNotInSourceSchool.map((item) => item.name).join(", ");
          setModalMessage(`O(s) item(s) ${itemNames} nao estao na escola "${schoolName}". Verifique a localizacao dos equipamentos.`);
          setModalIsOpen(true); return;
        }
      }

      let requestData: any = { type: memorandumType };

      if (memorandumType === "entrega") {
        const selectedSchool = schools.find((school) => school.name === schoolName);
        if (!selectedSchool) { alert("Por favor, selecione uma escola válida."); return; }
        requestData = { ...requestData, itemIds: selectedFromCSDT, schoolName, district, inep: selectedSchool.inep };
      } else if (memorandumType === "devolucao") {
        const selectedSchool = schools.find((school) => school.name === schoolName);
        if (!selectedSchool) { alert("Por favor, selecione uma escola v??lida."); return; }
        requestData = { ...requestData, itemIds: selectedFromDestino, schoolName, district, inep: selectedSchool.inep };
      } else if (memorandumType === "troca") {
        const allSelectedItemIds = [...selectedFromCSDT, ...selectedFromDestino];
        const toSchoolData = schools.find((school) => school.name === exchangeToSchool);
        if (!toSchoolData) { alert("Escola de destino não encontrada. Por favor, selecione uma escola válida."); return; }
        const fromSchoolData = schools.find((school) => school.name === "CSDT") || { name: "CSDT", district: "SEDE", inep: 0 };
        requestData = { ...requestData, itemIds: allSelectedItemIds, fromSchool: fromSchoolData, toSchool: toSchoolData, selectedFromCSDT, selectedFromDestino };
      }

      const response = await axios.post("/api/generate-memorandum", requestData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const pdfBase64 = response.data.pdfBase64;
      const binaryString = atob(pdfBase64);
      const binaryLen = binaryString.length;
      const bytes = new Uint8Array(binaryLen);
      for (let i = 0; i < binaryLen; i++) { bytes[i] = binaryString.charCodeAt(i); }

      const pdfBlob = new Blob([bytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      const dateStr = format(new Date(response.data.memorandumCreatedAt), 'yyyy-MM-dd', { locale: ptBR });
      const fileName = memorandumType === "entrega"
        ? `memorando-entrega-${response.data.memorandumNumber}-${dateStr}.pdf`
        : memorandumType === "devolucao"
          ? `memorando-devolucao-${response.data.memorandumNumber}-${dateStr}.pdf`
          : `memorando-troca-${response.data.memorandumNumber}-${dateStr}.pdf`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      const updatedItemsResponse = await axios.get("/api/items");
      if (Array.isArray(updatedItemsResponse.data)) {
        setItems(updatedItemsResponse.data);
        setTotalItems(updatedItemsResponse.data.length);
      } else if (updatedItemsResponse.data?.items) {
        setItems(updatedItemsResponse.data.items);
        setTotalItems(updatedItemsResponse.data.total);
      }

      setSelectedFromCSDT([]);
      setSelectedFromDestino([]);
      setMemorandumType("entrega");
      setSchoolName("");
      setDistrict("");
      setExchangeFromSchool("");
      setExchangeToSchool("");
      setCurrentStep("step1");
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Erro ao gerar memorando:", error);
      alert("Falha ao gerar o memorando. Verifique os dados enviados.");
    }
  };

  const handleFiltersChange = useCallback((newFilteredItems: Item[], newActiveFilters: any) => {
    setFilteredItems(newFilteredItems);
    setActiveFilters(newActiveFilters);
    setCurrentPage(1);
  }, []);

  const handleViewModeChange = (mode: 'list' | 'grid' | 'table') => { setViewMode(mode); };
  const handleGroupByChange = (newGroupBy: 'school' | 'type' | 'status' | 'date' | 'district') => { setGroupBy(newGroupBy); };

  const handleGenerateFilteredReport = async (filteredItems: Item[], filters: any) => {
    const ExcelJS = (await import('exceljs')).default;

    const filterDescription: string[] = [];
    if (filters.searchTerm) filterDescription.push(`Busca: "${filters.searchTerm}"`);
    if (filters.selectedSchools?.length > 0) filterDescription.push(`Escolas: ${filters.selectedSchools.join(', ')}`);
    if (filters.selectedTypes?.length > 0) filterDescription.push(`Tipos: ${filters.selectedTypes.join(', ')}`);
    if (filters.dateRange?.start && filters.dateRange?.end) {
      filterDescription.push(`Período: ${format(new Date(filters.dateRange.start), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(filters.dateRange.end), 'dd/MM/yyyy', { locale: ptBR })}`);
    }
    if (filters.createdBy?.length > 0) filterDescription.push(`Criado por: ${filters.createdBy.join(', ')}`);
    if (filters.status && filters.status !== 'all') {
      filterDescription.push(`Status: ${{ csdt: 'No CSDT', chada: 'Na CHADA', schools: 'Em Escolas', sme: 'Na SME' }[filters.status as string]}`);
    }

    const COR_TITULO = '1F3864';
    const COR_HEADER = '2E75B6';
    const COR_ZEBRA = 'F2F2F2';
    const COR_BRANCO = 'FFFFFF';

    const wb = new ExcelJS.Workbook();
    wb.creator = 'CSDT';
    wb.created = new Date();

    // ABA 1 — EQUIPAMENTOS
    const ws = wb.addWorksheet('Equipamentos');
    ws.mergeCells('A1:H1');
    const titulo = ws.getCell('A1');
    titulo.value = `CSDT — Relatório de Equipamentos  |  ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`;
    titulo.font = { bold: true, size: 13, color: { argb: COR_BRANCO } };
    titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_TITULO } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 30;

    ws.mergeCells('A2:H2');
    const filtroCell = ws.getCell('A2');
    filtroCell.value = filterDescription.length > 0 ? `Filtros: ${filterDescription.join('  |  ')}` : 'Sem filtros aplicados';
    filtroCell.font = { italic: true, size: 10, color: { argb: '444444' } };
    filtroCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DDEEFF' } };
    filtroCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(2).height = 20;

    const headers = ['#', 'Tipo', 'Marca', 'Número de Série', 'Escola / Localização', 'Status', 'Data de Cadastro', 'Adicionado por'];
    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: COR_BRANCO }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_HEADER } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: COR_TITULO } },
        bottom: { style: 'thin', color: { argb: COR_TITULO } },
        left: { style: 'thin', color: { argb: COR_TITULO } },
        right: { style: 'thin', color: { argb: COR_TITULO } },
      };
    });
    headerRow.height = 24;

    ws.columns = [
      { key: 'seq', width: 5 }, { key: 'tipo', width: 16 }, { key: 'marca', width: 18 },
      { key: 'serial', width: 22 }, { key: 'escola', width: 36 }, { key: 'status', width: 14 },
      { key: 'data', width: 20 }, { key: 'autor', width: 22 },
    ];

    filteredItems.forEach((item, idx) => {
      const escola = item.School?.name || 'N/A';
      const status = escola === 'CHADA' ? 'Manutenção' : escola === 'CSDT' ? 'Depósito' : 'Em Operação';
      const row = ws.addRow([
        idx + 1, item.name || '', item.brand || '', item.serialNumber || '', escola, status,
        format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        item.Profile?.displayName || '',
      ]);
      const bg = idx % 2 === 0 ? COR_BRANCO : COR_ZEBRA;
      row.eachCell({ includeEmpty: true }, (cell: any, col: number) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'center' : 'left' };
        cell.border = {
          top: { style: 'hair', color: { argb: 'CCCCCC' } },
          bottom: { style: 'hair', color: { argb: 'CCCCCC' } },
          left: { style: 'hair', color: { argb: 'CCCCCC' } },
          right: { style: 'hair', color: { argb: 'CCCCCC' } },
        };
      });
      row.height = 25;
    });
    ws.autoFilter = { from: 'A3', to: 'H3' };

    // ABA 2 — RESUMO
    const ws2 = wb.addWorksheet('Resumo');
    ws2.mergeCells('A1:B1');
    const tituloResumo = ws2.getCell('A1');
    tituloResumo.value = 'Resumo do Relatório';
    tituloResumo.font = { bold: true, size: 13, color: { argb: COR_BRANCO } };
    tituloResumo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_TITULO } };
    tituloResumo.alignment = { horizontal: 'center', vertical: 'middle' };
    ws2.getRow(1).height = 28;

    const resumoHeaders = ws2.addRow(['Critério', 'Valor']);
    resumoHeaders.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: COR_BRANCO }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_HEADER } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    resumoHeaders.height = 22;

    const statsRows = [
      ['Total de Equipamentos', filteredItems.length],
      ['Em Operação', filteredItems.filter(i => i.School?.name !== 'CSDT' && i.School?.name !== 'CHADA').length],
      ['No Depósito (CSDT)', filteredItems.filter(i => i.School?.name === 'CSDT').length],
      ['Em Manutenção (CHADA)', filteredItems.filter(i => i.School?.name === 'CHADA').length],
      ['', ''],
      ['Gerado por', userName || 'N/A'],
      ['Data do Relatório', format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })],
      ['Filtros Aplicados', filterDescription.join(' | ') || 'Nenhum'],
    ];

    statsRows.forEach((r, idx) => {
      const row = ws2.addRow(r);
      const bg = idx % 2 === 0 ? COR_BRANCO : COR_ZEBRA;
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { size: 10 };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          top: { style: 'hair', color: { argb: 'CCCCCC' } },
          bottom: { style: 'hair', color: { argb: 'CCCCCC' } },
          left: { style: 'hair', color: { argb: 'CCCCCC' } },
          right: { style: 'hair', color: { argb: 'CCCCCC' } },
        };
      });
      row.height = 25;
    });
    ws2.columns = [{ width: 28 }, { width: 50 }];

    // ABA 3 — ITENS POR ESCOLA
    const ws3 = wb.addWorksheet('Por Escola');
    ws3.mergeCells('A1:C1');
    const tituloPorEscola = ws3.getCell('A1');
    tituloPorEscola.value = `Quantidade de Itens por Escola  |  ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`;
    tituloPorEscola.font = { bold: true, size: 13, color: { argb: COR_BRANCO } };
    tituloPorEscola.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_TITULO } };
    tituloPorEscola.alignment = { horizontal: 'center', vertical: 'middle' };
    ws3.getRow(1).height = 30;

    ws3.mergeCells('A2:C2');
    const filtroPorEscola = ws3.getCell('A2');
    filtroPorEscola.value = filterDescription.length > 0 ? `Filtros: ${filterDescription.join('  |  ')}` : 'Sem filtros aplicados';
    filtroPorEscola.font = { italic: true, size: 10, color: { argb: '444444' } };
    filtroPorEscola.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DDEEFF' } };
    filtroPorEscola.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws3.getRow(2).height = 20;

    const headerPorEscola = ws3.addRow(['#', 'Escola', 'Quantidade']);
    headerPorEscola.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: COR_BRANCO }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_HEADER } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: COR_TITULO } },
        bottom: { style: 'thin', color: { argb: COR_TITULO } },
        left: { style: 'thin', color: { argb: COR_TITULO } },
        right: { style: 'thin', color: { argb: COR_TITULO } },
      };
    });
    headerPorEscola.height = 24;

    const contagemPorEscola = filteredItems.reduce((acc: Record<string, number>, item) => {
      const nome = item.School?.name || 'Sem escola';
      acc[nome] = (acc[nome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const escolasOrdenadas = Object.entries(contagemPorEscola).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));

    escolasOrdenadas.forEach(([nome, qtd], idx) => {
      const row = ws3.addRow([idx + 1, nome, qtd]);
      const bg = idx % 2 === 0 ? COR_BRANCO : COR_ZEBRA;
      row.eachCell({ includeEmpty: true }, (cell: any, col: number) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: col === 3 ? 'center' : col === 1 ? 'center' : 'left' };
        cell.border = {
          top: { style: 'hair', color: { argb: 'CCCCCC' } },
          bottom: { style: 'hair', color: { argb: 'CCCCCC' } },
          left: { style: 'hair', color: { argb: 'CCCCCC' } },
          right: { style: 'hair', color: { argb: 'CCCCCC' } },
        };
      });
      row.height = 25;
    });

    const totalRow = ws3.addRow(['', 'TOTAL', filteredItems.length]);
    totalRow.eachCell({ includeEmpty: true }, (cell: any) => {
      cell.font = { bold: true, size: 10, color: { argb: COR_BRANCO } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_TITULO } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    totalRow.height = 22;
    ws3.columns = [{ width: 5 }, { width: 42 }, { width: 14 }];
    ws3.autoFilter = { from: 'A3', to: 'C3' };

    const rodape = '&CPágina &P de &N';
    const configPagina = { fitToPage: true, fitToWidth: 1, orientation: 'landscape' as const };
    ws.pageSetup = { ...configPagina, printTitlesRow: '1:3' };
    ws.headerFooter.oddFooter = rodape;
    ws2.pageSetup = { ...configPagina, printTitlesRow: '1:2' };
    ws2.headerFooter.oddFooter = rodape;
    ws3.pageSetup = { ...configPagina, printTitlesRow: '1:3' };
    ws3.headerFooter.oddFooter = rodape;

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: ptBR });
    const filename = `Relatorio_Equipamentos_${timestamp}.xlsx`;
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    setModalMessage(
      `✅ Relatório gerado com sucesso!\n\n` +
      `📁 ${filename}\n` +
      `📊 ${filteredItems.length} equipamentos incluídos\n\n` +
      `🔍 ${filterDescription.length > 0 ? filterDescription.join('\n') : 'Sem filtros aplicados'}`
    );
    setModalIsOpen(true);
  };

  const totals = calculateTotals();

  const openHistoryDrawer = async (item: any) => {
    setSelectedItem(item);
    try {
      const response = await axios.get(`/api/items/${item.id}/history`);
      setItemHistory(response.data);
      setIsDrawerOpen(true);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      alert("Falha ao buscar o histórico do item.");
    }
  };

  const closeHistoryDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedItem(null);
    setItemHistory([]);
  };

  const handleOpenMemorandumDialog = () => { setIsDialogOpen(true); };

  const resetMemorandum = () => {
    setMemorandumType("entrega");
    setSchoolName("");
    setDistrict("");
    setExchangeFromSchool("");
    setExchangeToSchool("");
    setSelectedFromCSDT([]);
    setSelectedFromDestino([]);
    setCurrentStep("step1");
  };

  return {
    // State
    items, setItems, totalItems, searchTerm, setSearchTerm, schoolItemCount, loading, setLoading,
    modalIsOpen, setModalIsOpen, modalMessage, setModalMessage,
    userName, userId, schools, selectedItem, itemHistory,
    isDrawerOpen, setIsDrawerOpen, isDialogOpen, setIsDialogOpen,
    schoolName, setSchoolName, district, setDistrict,
    currentPage, userRole, currentStep, setCurrentStep,
    deleteModalOpen, setDeleteModalOpen, itemToDelete, setItemToDelete,
    editModalOpen, setEditModalOpen, itemToEdit,
    editName, setEditName, editBrand, setEditBrand, editSerial, setEditSerial,
    editSchoolId, setEditSchoolId, editSchools, editLoading,
    relatedData, setRelatedData, loadingRelatedData,
    showDashboard, setShowDashboard, viewMode, setViewMode,
    groupBy, showGrouping, setShowGrouping,
    filteredItems, activeFilters,
    showReports, setShowReports, showAlerts, setShowAlerts,
    memorandumType, setMemorandumType, exchangeFromSchool, setExchangeFromSchool,
    exchangeToSchool, setExchangeToSchool,
    selectedFromCSDT, setSelectedFromCSDT, selectedFromDestino, setSelectedFromDestino,
    // Computed
    basicFilteredItems, displayItems, currentItems, totalPages,
    indexOfFirstItem, indexOfLastItem, totals,
    // Handlers
    handlePageChange, fetchRelatedData, openEditModal, handleEditSave,
    openDeleteModal, confirmDelete, exportToExcel, generateCompleteBackup, fetchAllItems,
    handleGenerateMemorandum, handleFiltersChange, handleViewModeChange,
    handleGroupByChange, handleGenerateFilteredReport,
    openHistoryDrawer, closeHistoryDrawer, handleOpenMemorandumDialog, resetMemorandum,
  };
}
