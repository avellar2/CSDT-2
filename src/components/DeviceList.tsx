import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Modal from "react-modal";
import { jwtDecode } from "jwt-decode";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MagnifyingGlass,
  Trash,
  FileArrowDown,
  Clock,
  File,
  Database,
  CloudArrowDown,
  ChartLine,
  Eye,
  FileText,
  Bell
} from "phosphor-react";
import * as XLSX from "xlsx";
import axios from "axios";
import { SkeletonCard } from "./SkeletonCard";
import Dashboard from "./Analytics/Dashboard";
import DeviceViews from "./Views/DeviceViews";
import AdvancedFilters from "./Filters/AdvancedFilters";
import SmartGrouping from "./Grouping/SmartGrouping";
import AdvancedReports from "./Reports/AdvancedReports";
import AlertSystem from "./Alerts/AlertSystem";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Select from "react-select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { supabase } from "@/lib/supabaseClient";

interface Item {
  id: number;
  name: string;
  brand: string;
  serialNumber: string;
  createdAt: string;
  inep: string;
  Profile: {
    displayName: string;
    userId: string;
  };
  School: {
    name: string;
  };
}

const DeviceList: React.FC = () => {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
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
  const [isModalOpen, setIsModalOpen] = useState(false); // Estado para controlar o modal
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Estado para controlar o AlertDialog
  const [schoolName, setSchoolName] = useState("");
  const [district, setDistrict] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null); // Estado para armazenar a role do usuário
  const [currentStep, setCurrentStep] = useState<"step1" | "step2">("step1");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [relatedData, setRelatedData] = useState<any>(null);
  const [loadingRelatedData, setLoadingRelatedData] = useState(false);
  const itemsPerPage = 10; // Número de itens por página
  
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
  const [memorandumType, setMemorandumType] = useState<"entrega" | "troca">(
    "entrega",
  );
  const [exchangeFromSchool, setExchangeFromSchool] = useState("");
  const [exchangeToSchool, setExchangeToSchool] = useState("");

  // Para troca: selecionar equipamentos que vão do CSDT para a escola destino
  const [selectedFromCSDT, setSelectedFromCSDT] = useState<number[]>([]);
  // Para troca: selecionar equipamentos que vão da escola destino para o CSDT
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
        const response = await fetch("/api/items", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Expected JSON but got:", text);
          setModalMessage(
            "Erro ao buscar itens. Resposta inesperada do servidor.",
          );
          setModalIsOpen(true);
          return;
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          console.error("Expected an array but got:", data);
        }
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

  useEffect(() => {
    const countItemsInSchool = () => {
      const count = items.filter(
        (item) =>
          item.School &&
          item.School.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ).length;
      setSchoolItemCount(count);
    };

    if (Array.isArray(items)) {
      countItemsInSchool();
      // Inicializar filteredItems se não há filtros ativos
      if (!activeFilters) {
        setFilteredItems(items);
      }
    }
  }, [searchTerm, items, activeFilters]);

  useEffect(() => {
    async function fetchItems() {
      try {
        const response = await axios.get("/api/schools");
        setSchools(response.data);
      } catch (error) {
        console.log("Error fetching schools:", error);
      }
    }

    fetchItems();
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("Token não encontrado no localStorage.");
        return;
      }

      try {
        // Decodifica o token para obter o userId
        const decoded = jwtDecode<{ userId: string }>(token);
        console.log("Decoded Token:", decoded);

        // Faz a chamada para o Supabase para garantir que o usuário está autenticado
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          console.error("Erro ao buscar usuário no Supabase:", error);
          return;
        }

        console.log("Usuário do Supabase:", user);

        // Faz a chamada para o endpoint /api/get-role
        const response = await fetch(`/api/get-role?userId=${user.id}`);
        const data = await response.json();

        if (response.ok && data.role) {
          setUserRole(data.role); // Define a role do usuário
          console.log("Role do usuário:", data.role);
        } else {
          console.error("Erro ao buscar a role:", data.error);
        }
      } catch (error) {
        console.error("Erro ao buscar a role do usuário:", error);
      }
    };

    fetchUserRole();
  }, []);

  // Filtros básicos (mantidos para compatibilidade)
  const basicFilteredItems = Array.isArray(items)
    ? items
        .filter(
          (item) =>
            (item.name &&
              item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.brand &&
              item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.serialNumber &&
              item.serialNumber
                .toLowerCase()
                .includes(searchTerm.toLowerCase())) ||
            (item.School &&
              item.School.name
                .toLowerCase()
                .includes(searchTerm.toLowerCase())),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ) // Ordena por data de criação (mais recentes primeiro)
    : [];

  // Use filteredItems se há filtros avançados, senão use básicos
  const displayItems = activeFilters ? filteredItems : basicFilteredItems;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = displayItems.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(displayItems.length / itemsPerPage);

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  const openDeleteModal = async (item: any) => {
    setItemToDelete(item);
    const data = await fetchRelatedData(item.id);
    if (data) {
      setRelatedData(data);
      setDeleteModalOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setModalMessage("Usuário não autenticado. Por favor, faça login.");
      setModalIsOpen(true);
      return;
    }

    try {
      const response = await fetch(`/api/items/${itemToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        
        // Mostrar resumo do que foi deletado
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
        
        // Atualizar lista de itens
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
      "Data de Criação": format(
        new Date(item.createdAt),
        "dd/MM/yyyy, HH:mm:ss",
        { locale: ptBR },
      ),
      "Adicionado por": item.Profile.displayName,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedItems);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Itens");
    XLSX.writeFile(workbook, "itens.xlsx");
  };

  const generateCompleteBackup = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setModalMessage("Usuário não autenticado. Por favor, faça login.");
      setModalIsOpen(true);
      return;
    }

    setLoading(true);
    try {
      // Buscar todos os dados para backup
      const [itemsRes, schoolsRes, historiesRes] = await Promise.all([
        fetch("/api/items", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/schools", { headers: { Authorization: `Bearer ${token}` } }),
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

      // Gerar arquivo JSON
      const jsonBlob = new Blob([JSON.stringify(backupData, null, 2)], { 
        type: "application/json" 
      });
      
      // Gerar Excel com múltiplas abas
      const workbook = XLSX.utils.book_new();
      
      // Aba de Itens
      const formattedItems = backupData.items.map((item: any) => ({
        ID: item.id,
        Nome: item.name,
        Marca: item.brand,
        "Número de Série": item.serialNumber,
        Escola: item.School?.name || "N/A",
        INEP: item.inep || "N/A",
        "Data de Criação": format(new Date(item.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
        "Adicionado por": item.Profile?.displayName || "N/A",
        "Status": item.School?.name === "CHADA" ? "Manutenção" : "Ativo"
      }));
      
      // Aba de Escolas
      const formattedSchools = backupData.schools.map((school: any) => ({
        ID: school.id,
        Nome: school.name,
        Distrito: school.district,
        INEP: school.inep,
        "Qtd Equipamentos": backupData.items.filter((item: any) => item.School?.name === school.name).length
      }));
      
      // Aba de Resumo
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
      
      // Downloads
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      
      // Download JSON
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement("a");
      jsonLink.href = jsonUrl;
      jsonLink.download = `backup-csdt-${timestamp}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      jsonLink.remove();
      URL.revokeObjectURL(jsonUrl);
      
      // Download Excel
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

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeGenerateMemorandumModal = () => {
    setIsModalOpen(false);
  };

  const handleGenerateMemorandum = async () => {
    console.log('=== INÍCIO DA GERAÇÃO DO MEMORANDO ===');
    console.log('Tipo:', memorandumType);
    console.log('Escola destino:', exchangeToSchool);
    
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Usuário não autenticado. Por favor, faça login.");
      return;
    }

    // VALIDAÇÕES ESPECÍFICAS POR TIPO DE MEMORANDO
    if (memorandumType === "entrega") {
      if (selectedFromCSDT.length === 0) {
        alert("Selecione pelo menos um item para entrega.");
        return;
      }
      
      if (selectedFromCSDT.length > 13) {
        setModalMessage(
          `📦 Limite de itens excedido!\n\nVocê selecionou ${selectedFromCSDT.length} itens, mas o limite máximo para memorandos de entrega é de 13 itens.\n\nPor favor, reduza a seleção para até 13 itens ou crie múltiplos memorandos.`
        );
        setModalIsOpen(true);
        return;
      }
      
      if (!schoolName) {
        alert("Por favor, selecione uma escola.");
        return;
      }

      if (!district) {
        alert("O distrito não foi definido. Verifique a escola selecionada.");
        return;
      }
      
    } else if (memorandumType === "troca") {
      console.log('=== VALIDAÇÃO TROCA ===');
      console.log('exchangeToSchool:', exchangeToSchool);
      console.log('selectedFromCSDT:', selectedFromCSDT);
      console.log('selectedFromDestino:', selectedFromDestino);
      
      // Validar escola de destino
      if (!exchangeToSchool) {
        console.error('ERRO: exchangeToSchool está vazio!');
        alert("Por favor, selecione a escola de destino.");
        return;
      }
      
      // Validar se há pelo menos um item selecionado
      if (selectedFromCSDT.length === 0 && selectedFromDestino.length === 0) {
        alert("Selecione pelo menos um item para troca (que sai do CSDT ou que volta da escola).");
        return;
      }
    }


    // Para troca, verificar limite individual de 10 itens por categoria
    if (memorandumType === "troca") {
      if (selectedFromCSDT.length > 10) {
        setModalMessage(
          `🚫 Limite excedido!\n\nVocê selecionou ${selectedFromCSDT.length} itens do CSDT, mas o máximo são 10 itens por categoria.\n\nPor favor, desmarque alguns itens antes de continuar.`
        );
        setModalIsOpen(true);
        return;
      }
      
      if (selectedFromDestino.length > 10) {
        setModalMessage(
          `🚫 Limite excedido!\n\nVocê selecionou ${selectedFromDestino.length} itens da escola, mas o máximo são 10 itens por categoria.\n\nPor favor, desmarque alguns itens antes de continuar.`
        );
        setModalIsOpen(true);
        return;
      }
    } else {
      // Para entrega, manter limite de 13 itens total
      if (selectedFromCSDT.length > 13) {
        setModalMessage("Você pode selecionar no máximo 13 itens por memorando.");
        setModalIsOpen(true);
        return;
      }
    }

    try {
      // Para TROCA: Verificar se os itens estão nas escolas corretas
      if (memorandumType === "troca") {
        // Verificar itens que saem do CSDT
        const itemsNotInCSDT = items.filter(
          (item) =>
            selectedFromCSDT.includes(item.id) &&
            item.School?.name !== "CSDT",
        );

        if (itemsNotInCSDT.length > 0) {
          const itemNames = itemsNotInCSDT
            .map((item) => item.name)
            .join(", ");
          setModalMessage(
            `O(s) item(s) ${itemNames} não está(ão) no CSDT. Verifique a localização dos equipamentos.`,
          );
          setModalIsOpen(true);
          return;
        }

        // Verificar itens que saem da escola destino
        if (selectedFromDestino.length > 0) {
          const itemsNotInDestination = items.filter(
            (item) =>
              selectedFromDestino.includes(item.id) &&
              item.School?.name !== exchangeToSchool,
          );

          if (itemsNotInDestination.length > 0) {
            const itemNames = itemsNotInDestination
              .map((item) => item.name)
              .join(", ");
            setModalMessage(
              `O(s) item(s) ${itemNames} não está(ão) na escola "${exchangeToSchool}". Verifique a localização dos equipamentos.`,
            );
            setModalIsOpen(true);
            return;
          }
        }
      }

      // Para ENTREGA: Verificar se algum item está na escola CHADA
      if (memorandumType === "entrega") {
        const itemsInChada = items.filter(
          (item) =>
            selectedFromCSDT.includes(item.id) && item.School?.name === "CHADA",
        );

        if (itemsInChada.length > 0) {
          const itemNames = itemsInChada.map((item) => item.name).join(", ");
          setModalMessage(
            `O(s) item(s) ${itemNames} está(ão) na CHADA. Por favor, dar baixa no(s) item(s) para o CSDT antes de fazer o memorando.`,
          );
          setModalIsOpen(true);
          return;
        }
      }


      // PREPARAR DADOS baseados no tipo de memorando
      let requestData: any = {
        type: memorandumType,
      };

      if (memorandumType === "entrega") {
        const selectedSchool = schools.find(
          (school) => school.name === schoolName,
        );

        if (!selectedSchool) {
          alert("Por favor, selecione uma escola válida.");
          return;
        }

        requestData = {
          ...requestData,
          itemIds: selectedFromCSDT,
          schoolName,
          district,
          inep: selectedSchool.inep,
        };
        
      } else if (memorandumType === "troca") {
        console.log('=== PREPARANDO DADOS PARA TROCA ===');
        
        // Para troca, enviar todos os itens selecionados (CSDT + escola)
        const allSelectedItemIds = [...selectedFromCSDT, ...selectedFromDestino];
        console.log('Itens do CSDT:', selectedFromCSDT);
        console.log('Itens da escola:', selectedFromDestino);
        console.log('Todos itens:', allSelectedItemIds);
        
        const toSchoolData = schools.find(
          (school) => school.name === exchangeToSchool,
        );

        if (!toSchoolData) {
          alert("Escola de destino não encontrada. Por favor, selecione uma escola válida.");
          return;
        }

        // Escola de origem sempre será CSDT para simplificar
        const fromSchoolData = schools.find(
          (school) => school.name === "CSDT",
        ) || { name: "CSDT", district: "SEDE", inep: 0 };

        requestData = {
          ...requestData,
          itemIds: allSelectedItemIds,
          fromSchool: fromSchoolData,
          toSchool: toSchoolData,
          // Dados específicos para separação no PDF
          selectedFromCSDT,      // Itens que saem do CSDT → campo "novo"
          selectedFromDestino    // Itens que voltam da escola → campo "antigo"
        };
        
        console.log('Dados de troca preparados:', requestData);
      }

      console.log("Dados enviados:", requestData);

      const response = await axios.post(
        "/api/generate-memorandum",
        requestData,
        {
          headers: {
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
      const fileName =
        memorandumType === "entrega"
          ? `memorando-entrega-${response.data.memorandumNumber}.pdf`
          : `memorando-troca-${response.data.memorandumNumber}.pdf`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      // Atualizar os itens no frontend após a geração do memorando
      const updatedItemsResponse = await axios.get("/api/items");
      setItems(updatedItemsResponse.data);

      // Limpar os campos
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

  // Função para calcular os totais por título
  const calculateTotals = () => {
    const totals = {
      COMPUTADOR: 0,
      MONITOR: 0,
      MOUSE: 0,
      TECLADO: 0,
      ESTABILIZADOR: 0,
      IMPRESSORA: 0,
      NOTEBOOK: 0,
    };

    items.forEach((item) => {
      const title = item.name.toUpperCase().trim() as keyof typeof totals;
      if (totals.hasOwnProperty(title)) {
        totals[title]++;
      }
    });

    return totals;
  };

  // Handlers para filtros avançados - DEVE vir antes do return early
  const handleFiltersChange = useCallback((newFilteredItems: Item[], newActiveFilters: any) => {
    setFilteredItems(newFilteredItems);
    setActiveFilters(newActiveFilters);
    setCurrentPage(1); // Reset página ao filtrar
  }, []);

  // Handler para mudança de modo de visualização
  const handleViewModeChange = (mode: 'list' | 'grid' | 'table') => {
    setViewMode(mode);
  };

  // Handler para agrupamento
  const handleGroupByChange = (newGroupBy: 'school' | 'type' | 'status' | 'date' | 'district') => {
    setGroupBy(newGroupBy);
  };

  // Handler para gerar relatório baseado nos filtros
  const handleGenerateFilteredReport = (filteredItems: Item[], filters: any) => {
    console.log('Generating filtered report with', filteredItems.length, 'items');
    
    // Criar descrição dos filtros aplicados
    let filterDescription = [];
    
    if (filters.searchTerm) {
      filterDescription.push(`Busca: "${filters.searchTerm}"`);
    }
    
    if (filters.selectedSchools.length > 0) {
      filterDescription.push(`Escolas: ${filters.selectedSchools.join(', ')}`);
    }
    
    if (filters.selectedTypes.length > 0) {
      filterDescription.push(`Tipos: ${filters.selectedTypes.join(', ')}`);
    }
    
    if (filters.dateRange.start && filters.dateRange.end) {
      const startFormatted = format(new Date(filters.dateRange.start), 'dd/MM/yyyy', { locale: ptBR });
      const endFormatted = format(new Date(filters.dateRange.end), 'dd/MM/yyyy', { locale: ptBR });
      filterDescription.push(`Período: ${startFormatted} a ${endFormatted}`);
    }
    
    if (filters.createdBy.length > 0) {
      filterDescription.push(`Criado por: ${filters.createdBy.join(', ')}`);
    }
    
    if (filters.status !== 'all') {
      const statusMap = {
        'csdt': 'No CSDT',
        'chada': 'Na CHADA',
        'schools': 'Em Escolas'
      };
      filterDescription.push(`Status: ${statusMap[filters.status as keyof typeof statusMap]}`);
    }
    
    // Gerar dados do relatório
    const reportData = filteredItems.map(item => ({
      ID: item.id,
      Nome: item.name,
      Marca: item.brand,
      'Número de Série': item.serialNumber,
      Escola: item.School?.name || 'N/A',
      'Data de Criação': format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      'Criado por': item.Profile?.displayName || 'N/A',
      Status: item.School?.name === 'CHADA' ? 'Manutenção' : 
              item.School?.name === 'CSDT' ? 'Depósito' : 'Em Operação'
    }));

    // Gerar estatísticas do relatório
    const stats = {
      'Total de Equipamentos': filteredItems.length,
      'Em Operação': filteredItems.filter(i => i.School?.name !== 'CSDT' && i.School?.name !== 'CHADA').length,
      'No Depósito (CSDT)': filteredItems.filter(i => i.School?.name === 'CSDT').length,
      'Em Manutenção (CHADA)': filteredItems.filter(i => i.School?.name === 'CHADA').length,
      'Data do Relatório': format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      'Gerado por': userName || 'N/A',
      'Filtros Aplicados': filterDescription.length > 0 ? filterDescription.join('; ') : 'Nenhum filtro aplicado'
    };

    const statsData = Object.entries(stats).map(([key, value]) => ({
      'Critério': key,
      'Valor': value
    }));

    // Criar workbook
    const workbook = XLSX.utils.book_new();
    
    // Aba de estatísticas
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(statsData), 'Resumo');
    
    // Aba de dados
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(reportData), 'Equipamentos');

    // Download
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `relatorio-filtrado-${timestamp}.xlsx`;
    XLSX.writeFile(workbook, filename);

    // Mostrar mensagem de sucesso
    setModalMessage(
      `✅ Relatório filtrado gerado com sucesso!\n\n` +
      `📁 Arquivo: ${filename}\n` +
      `📊 ${filteredItems.length} equipamentos incluídos\n\n` +
      `🔍 Filtros aplicados:\n${filterDescription.length > 0 ? filterDescription.join('\n') : 'Nenhum filtro aplicado'}`
    );
    setModalIsOpen(true);
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="space-y-4 mt-24">
        {[...Array(5)].map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  function escolaFiltradaPeloId(id: number) {
    const schoolFilteredById = schools.filter((school) => school.id === id);
    return schoolFilteredById[0].name;
  }

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


  return (
    <div className="dark:bg-zinc-950 bg-zinc-200 rounded-lg text-white p-6 container mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h1 className="text-2xl font-bold mb-4 md:mb-0 dark:text-zinc-100 text-zinc-700">
          Gestão de Dispositivos
        </h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className={`p-2 rounded flex items-center gap-1 transition-colors ${
              showDashboard 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            <ChartLine size={20} />
            <span className="hidden sm:inline">{showDashboard ? 'Ocultar' : 'Dashboard'}</span>
          </button>
          
          <button
            onClick={() => setShowGrouping(!showGrouping)}
            className={`p-2 rounded flex items-center gap-1 transition-colors ${
              showGrouping 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            <Eye size={20} />
            <span className="hidden sm:inline">{showGrouping ? 'Lista' : 'Agrupar'}</span>
          </button>

          <button
            onClick={() => setShowReports(!showReports)}
            className={`p-2 rounded flex items-center gap-1 transition-colors ${
              showReports 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            <FileText size={20} />
            <span className="hidden sm:inline">{showReports ? 'Ocultar' : 'Relatórios'}</span>
          </button>

          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={`p-2 rounded flex items-center gap-1 transition-colors ${
              showAlerts 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            <Bell size={20} />
            <span className="hidden sm:inline">{showAlerts ? 'Ocultar' : 'Alertas'}</span>
          </button>
          <button
            onClick={exportToExcel}
            className="bg-green-500 hover:bg-green-700 text-white p-2 rounded flex items-center"
          >
            <FileArrowDown size={24} className="mr-2" />
            Exportar Excel
          </button>
          <button
            onClick={generateCompleteBackup}
            className="bg-purple-500 hover:bg-purple-700 text-white p-2 rounded flex items-center"
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
            ) : (
              <Database size={24} className="mr-2" />
            )}
            {loading ? "Gerando..." : "Backup Completo"}
          </button>
          {(userRole === "ADMTOTAL" || userRole === "ADMIN") && (
            <button
              onClick={() => setIsDialogOpen(true)} // Abre direto sem validação
              className="bg-blue-500 hover:bg-blue-700 text-white p-2 rounded flex items-center"
            >
              <File size={24} className="mr-2" />
              Gerar Memorando
            </button>
          )}
        </div>
      </div>
      {/* Sistema de Alertas */}
      {showAlerts && (
        <div className="mb-6">
          <AlertSystem items={items} schools={schools} />
        </div>
      )}

      {/* Relatórios Avançados */}
      {showReports && (
        <div className="mb-6">
          <AdvancedReports items={items} schools={schools} />
        </div>
      )}

      {/* Dashboard Analytics */}
      {showDashboard && (
        <div className="mb-6">
          <Dashboard items={items} schools={schools} />
        </div>
      )}

      {/* Filtros Avançados */}
      <AdvancedFilters
        items={items}
        schools={schools}
        onFiltersChange={handleFiltersChange}
        onGenerateReport={handleGenerateFilteredReport}
      />
      
      {/* Busca rápida (mantida para compatibilidade) */}
      {!activeFilters && (
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Pesquisar (use filtros avançados para mais opções)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 rounded dark:bg-zinc-900 dark:text-white"
          />
          <MagnifyingGlass
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
        </div>
      )}

      {/* Totalizadores por categoria */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4 mb-4">
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-bold">Total.</h3>
          <p className="text-2xl font-semibold">{items.length}</p>
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

      {/* Conteúdo principal - Agrupamento ou Visualizações */}
      {showGrouping ? (
        <SmartGrouping
          items={displayItems}
          schools={schools}
          onHistoryClick={openHistoryDrawer}
          onDeleteClick={openDeleteModal}
          userId={userId}
          groupBy={groupBy}
          onGroupByChange={handleGroupByChange}
        />
      ) : (
        <DeviceViews
          items={currentItems}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onHistoryClick={openHistoryDrawer}
          onDeleteClick={openDeleteModal}
          userId={userId}
        />
      )}

      <div className="mt-6 flex justify-center">
        {/* Paginação - só mostrar se não estiver no modo agrupamento */}
        {!showGrouping && (
          <div className="w-full flex flex-wrap justify-center gap-2">
            <Pagination
              total={displayItems.length}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
        
        {/* Informações dos resultados */}
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {showGrouping ? (
            `Mostrando ${displayItems.length} equipamentos agrupados por ${{
              school: 'escola',
              type: 'tipo',
              status: 'status',
              date: 'data',
              district: 'distrito'
            }[groupBy]}`
          ) : (
            `Mostrando ${Math.min(indexOfFirstItem + 1, displayItems.length)}-${Math.min(indexOfLastItem, displayItems.length)} de ${displayItems.length} equipamentos`
          )}
          {activeFilters && ' (filtrados)'}
        </div>

        {/* Modal moderno para avisos */}
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
                    Informação
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

        {/* AlertDialog para gerar o memorando */}
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent className="dark:bg-zinc-900 bg-white text-black max-w-2xl max-h-[90vh] flex flex-col">
            <AlertDialogHeader className="flex-shrink-0">
              <AlertDialogTitle className="dark:text-white">
                Gerar Memorando
              </AlertDialogTitle>
              <AlertDialogDescription>
                Escolha o tipo de memorando e preencha as informações
                necessárias.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Container com scroll para o conteúdo principal */}
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
                      onChange={(e) =>
                        setMemorandumType(e.target.value as "entrega")
                      }
                      className="form-radio text-blue-500"
                    />
                    <span className="dark:text-gray-300">
                      📦 Entrega de Equipamentos
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="troca"
                      checked={memorandumType === "troca"}
                      onChange={(e) =>
                        setMemorandumType(e.target.value as "troca")
                      }
                      className="form-radio text-blue-500"
                    />
                    <span className="dark:text-gray-300">
                      🔄 Troca de Equipamentos
                    </span>
                  </label>
                </div>
              </div>

              {/* CAMPOS PARA ENTREGA */}
              {memorandumType === "entrega" && (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300">
                    📦 Configurações de Entrega
                  </h4>

                  <label className="block">
                    <span className="dark:text-gray-300">
                      Escola de Destino:
                    </span>
                    <Select
                      options={schools.map((school) => ({
                        value: school.name,
                        label: school.name,
                      }))}
                      value={
                        schoolName
                          ? { value: schoolName, label: schoolName }
                          : null
                      }
                      onChange={(selectedOption) => {
                        const selectedSchoolName = selectedOption?.value || "";
                        setSchoolName(selectedSchoolName);

                        const selectedSchool = schools.find(
                          (school) => school.name === selectedSchoolName,
                        );
                        if (selectedSchool) {
                          setDistrict(selectedSchool.district);
                        }
                      }}
                      className="text-black"
                      placeholder="Selecione a escola que receberá os equipamentos"
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
                      placeholder="Distrito será preenchido automaticamente"
                    />
                  </label>

                  {/* Lista de itens para seleção na entrega */}
                  <div>
                    <span className="dark:text-gray-300 font-semibold">
                      Selecionar itens para entrega:
                    </span>

                    {/* Barra de pesquisa para entrega */}
                    <div className="my-2">
                      <input
                        type="text"
                        placeholder="Pesquisar equipamento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 rounded dark:bg-zinc-800 dark:text-white bg-gray-100 border dark:border-zinc-700"
                      />
                    </div>

                    {/* Lista com altura limitada e scroll */}
                    <div className="max-h-32 overflow-y-auto bg-white dark:bg-zinc-800 rounded border divide-y divide-gray-200 dark:divide-zinc-700">
                      {items
                        .filter(
                          (item) =>
                            item.School?.name === "CSDT" &&
                            (item.name
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                              item.brand
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase()) ||
                              item.serialNumber
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase())),
                        )
                        .map((item, idx) => (
                          <label
                            key={item.id}
                            className={`
                              flex items-center gap-2 text-xs px-2 py-2 cursor-pointer transition
                              ${idx % 2 === 0 ? "bg-gray-50 dark:bg-zinc-900" : "bg-white dark:bg-zinc-800"}
                              hover:bg-blue-100 dark:hover:bg-blue-900
                              rounded
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={selectedFromCSDT.includes(item.id)}
                              onChange={() => {
                                setSelectedFromCSDT((prev) =>
                                  prev.includes(item.id)
                                    ? prev.filter((id) => id !== item.id)
                                    : [...prev, item.id],
                                );
                              }}
                              className="accent-blue-500"
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{item.name}</span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {item.brand} • {item.serialNumber}
                              </span>
                              <span className="text-gray-400 text-[10px]">
                                Criado em:{" "}
                                {format(new Date(item.createdAt), "dd/MM/yyyy")}
                              </span>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CAMPOS PARA TROCA - com altura limitada */}
              {memorandumType === "troca" && (
                <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <h4 className="font-semibold text-orange-800 dark:text-orange-300">
                    🔄 Configurações de Troca
                  </h4>

                  {/* Escolher escola destino */}
                  <label className="block">
                    <span className="dark:text-gray-300">
                      Escola de Destino:
                    </span>
                    <Select
                      options={schools.map((school) => ({
                        value: school.name,
                        label: school.name,
                      }))}
                      value={
                        exchangeToSchool
                          ? { value: exchangeToSchool, label: exchangeToSchool }
                          : null
                      }
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

                  {/* Exibir etapas apenas se escola de destino foi selecionada */}
                  {exchangeToSchool && (
                    <div>
                      {/* Indicador de etapas */}
                      <div className="flex items-center justify-between mb-4 p-2 bg-gray-100 dark:bg-zinc-700 rounded">
                        <div
                          className={`px-3 py-1 rounded ${
                            currentStep === "step1"
                              ? "bg-blue-500 text-white"
                              : "bg-gray-300 text-gray-700"
                          }`}
                        >
                          Etapa 1: CSDT → {exchangeToSchool}
                        </div>
                        <div className="text-gray-400">→</div>
                        <div
                          className={`px-3 py-1 rounded ${
                            currentStep === "step2"
                              ? "bg-blue-500 text-white"
                              : "bg-gray-300 text-gray-700"
                          }`}
                        >
                          Etapa 2: {exchangeToSchool} → CSDT
                        </div>
                      </div>

                      {/* ETAPA 1: Selecionar equipamentos que vão do CSDT para a escola destino */}
                      {currentStep === "step1" && (
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="dark:text-gray-300 font-semibold">
                              Equipamentos que vão do CSDT para{" "}
                              {exchangeToSchool}
                            </span>
                            <span className="text-sm text-gray-500">
                              {selectedFromCSDT.length} selecionados
                            </span>
                          </div>

                          {/* Barra de pesquisa */}
                          <div className="my-2">
                            <input
                              type="text"
                              placeholder="Pesquisar equipamento..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full p-2 rounded dark:bg-zinc-800 dark:text-white bg-gray-100 border dark:border-zinc-700"
                            />
                          </div>

                          {/* Lista com altura limitada */}
                          <div className="max-h-32 overflow-y-auto bg-white dark:bg-zinc-800 rounded border divide-y divide-gray-200 dark:divide-zinc-700">
                            {items
                              .filter(
                                (item) =>
                                  item.School?.name === "CSDT" &&
                                  (item.name
                                    .toLowerCase()
                                    .includes(searchTerm.toLowerCase()) ||
                                    item.brand
                                      .toLowerCase()
                                      .includes(searchTerm.toLowerCase()) ||
                                    item.serialNumber
                                      .toLowerCase()
                                      .includes(searchTerm.toLowerCase())),
                              )
                              .map((item, idx) => (
                                <label
                                  key={item.id}
                                  className={`
                                    flex items-center gap-2 text-xs px-2 py-2 cursor-pointer transition
                                    ${idx % 2 === 0 ? "bg-gray-50 dark:bg-zinc-900" : "bg-white dark:bg-zinc-800"}
                                    hover:bg-blue-100 dark:hover:bg-blue-900
                                    rounded
                                  `}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedFromCSDT.includes(item.id)}
                                    onChange={() => {
                                      setSelectedFromCSDT((prev) => {
                                        if (prev.includes(item.id)) {
                                          // Remover item
                                          return prev.filter((id) => id !== item.id);
                                        } else {
                                          // Adicionar item - verificar limite
                                          if (prev.length >= 10) {
                                            setModalMessage(
                                              `🚫 Limite excedido!\n\nVocê tentou selecionar ${prev.length + 1} itens do CSDT, mas o máximo permitido são 10 itens por categoria.\n\nPor favor, desmarque alguns itens antes de continuar.`
                                            );
                                            setModalIsOpen(true);
                                            return prev; // Não adicionar
                                          }
                                          return [...prev, item.id];
                                        }
                                      });
                                    }}
                                    className="accent-blue-500"
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {item.name}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      {item.brand} • {item.serialNumber}
                                    </span>
                                    <span className="text-gray-400 text-[10px]">
                                      Criado em:{" "}
                                      {format(
                                        new Date(item.createdAt),
                                        "dd/MM/yyyy",
                                      )}
                                    </span>
                                  </div>
                                </label>
                              ))}
                          </div>

                          {/* Botão para próxima etapa */}
                          <div className="flex justify-end mt-4">
                            <button
                              onClick={() => {
                                if (selectedFromCSDT.length === 0) {
                                  alert(
                                    "Selecione pelo menos um item para continuar.",
                                  );
                                  return;
                                }
                                setCurrentStep("step2");
                              }}
                              disabled={selectedFromCSDT.length === 0}
                              className={`px-4 py-2 rounded ${
                                selectedFromCSDT.length === 0
                                  ? "bg-gray-400 cursor-not-allowed"
                                  : "bg-blue-500 hover:bg-blue-700"
                              } text-white`}
                            >
                              Confirmar e Próximo ({selectedFromCSDT.length}{" "}
                              itens)
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ETAPA 2: Selecionar equipamentos que vão da escola destino para o CSDT */}
                      {currentStep === "step2" && (
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="dark:text-gray-300 font-semibold">
                              Equipamentos que vão de {exchangeToSchool} para o
                              CSDT
                            </span>
                            <span className="text-sm text-gray-500">
                              {selectedFromDestino.length} selecionados
                            </span>
                          </div>

                          {/* Barra de pesquisa para etapa 2 */}
                          <div className="my-2">
                            <input
                              type="text"
                              placeholder="Pesquisar equipamento..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full p-2 rounded dark:bg-zinc-800 dark:text-white bg-gray-100 border dark:border-zinc-700"
                            />
                          </div>

                          {/* Lista com altura limitada */}
                          <div className="max-h-32 overflow-y-auto bg-white dark:bg-zinc-800 rounded border divide-y divide-gray-200 dark:divide-zinc-700">
                            {items
                              .filter(
                                (item) =>
                                  item.School?.name === exchangeToSchool &&
                                  (item.name
                                    .toLowerCase()
                                    .includes(searchTerm.toLowerCase()) ||
                                    item.brand
                                      .toLowerCase()
                                      .includes(searchTerm.toLowerCase()) ||
                                    item.serialNumber
                                      .toLowerCase()
                                      .includes(searchTerm.toLowerCase())),
                              )
                              .map((item, idx) => (
                                <label
                                  key={item.id}
                                  className={`
                                    flex items-center gap-2 text-xs px-2 py-2 cursor-pointer transition
                                    ${idx % 2 === 0 ? "bg-gray-50 dark:bg-zinc-900" : "bg-white dark:bg-zinc-800"}
                                    hover:bg-blue-100 dark:hover:bg-blue-900
                                    rounded
                                  `}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedFromDestino.includes(
                                      item.id,
                                    )}
                                    onChange={() => {
                                      setSelectedFromDestino((prev) => {
                                        if (prev.includes(item.id)) {
                                          // Remover item
                                          return prev.filter((id) => id !== item.id);
                                        } else {
                                          // Adicionar item - verificar limite
                                          if (prev.length >= 10) {
                                            setModalMessage(
                                              `🚫 Limite excedido!\n\nVocê tentou selecionar ${prev.length + 1} itens da escola ${exchangeToSchool}, mas o máximo permitido são 10 itens por categoria.\n\nPor favor, desmarque alguns itens antes de continuar.`
                                            );
                                            setModalIsOpen(true);
                                            return prev; // Não adicionar
                                          }
                                          return [...prev, item.id];
                                        }
                                      });
                                    }}
                                    className="accent-blue-500"
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {item.name}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      {item.brand} • {item.serialNumber}
                                    </span>
                                    <span className="text-gray-400 text-[10px]">
                                      Criado em:{" "}
                                      {format(
                                        new Date(item.createdAt),
                                        "dd/MM/yyyy",
                                      )}
                                    </span>
                                  </div>
                                </label>
                              ))}
                          </div>

                          {/* Botões para voltar */}
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

              {/* NÚMERO AUTOMÁTICO */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                  📋 Número do memorando será gerado automaticamente
                </span>
                <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">
                  Formato: [Sequencial]/[Ano] (ex: 1/2025, 2/2025...)
                </p>
              </div>

              {/* PREVIEW DOS ITENS SELECIONADOS com altura limitada */}
              <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded border">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  📋 Itens Selecionados:{" "}
                  {memorandumType === "entrega" ? (
                    <span className={selectedFromCSDT.length > 13 ? "text-red-500 font-bold" : ""}>
                      {selectedFromCSDT.length}/13 {selectedFromCSDT.length > 13 && "⚠️"}
                    </span>
                  ) : memorandumType === "troca" ? (
                    selectedFromCSDT.length + selectedFromDestino.length
                  ) : (
                    0
                  )}
                </p>
                
                {/* Aviso de limite excedido */}
                {memorandumType === "entrega" && selectedFromCSDT.length > 13 && (
                  <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-sm">
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      ⚠️ Limite excedido! Máximo: 13 itens por memorando de entrega.
                    </span>
                  </div>
                )}

                {/* Container com scroll para muitos itens */}
                <div className="max-h-24 overflow-y-auto">
                  {memorandumType === "entrega" && (
                    <>
                      {items
                        .filter((item) => selectedFromCSDT.includes(item.id))
                        .map((item) => (
                          <p
                            key={item.id}
                            className="text-xs text-gray-600 dark:text-gray-400"
                          >
                            • {item.name} - {item.brand} ({item.serialNumber})
                          </p>
                        ))}
                    </>
                  )}

                  {memorandumType === "troca" && (
                    <>
                      {/* Itens que saem do CSDT */}
                      {selectedFromCSDT.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            🔄 CSDT → {exchangeToSchool}:
                          </p>
                          {items
                            .filter((item) =>
                              selectedFromCSDT.includes(item.id),
                            )
                            .map((item) => (
                              <p
                                key={item.id}
                                className="text-xs text-gray-600 dark:text-gray-400 ml-2"
                              >
                                • {item.name} - {item.brand} (
                                {item.serialNumber})
                              </p>
                            ))}
                        </div>
                      )}

                      {/* Itens que voltam para o CSDT */}
                      {selectedFromDestino.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                            🔄 {exchangeToSchool} → CSDT:
                          </p>
                          {items
                            .filter((item) =>
                              selectedFromDestino.includes(item.id),
                            )
                            .map((item) => (
                              <p
                                key={item.id}
                                className="text-xs text-gray-600 dark:text-gray-400 ml-2"
                              >
                                • {item.name} - {item.brand} (
                                {item.serialNumber})
                              </p>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer fixo na parte inferior */}
            <AlertDialogFooter className="flex-shrink-0 border-t pt-4">
              <AlertDialogCancel
                onClick={() => {
                  setMemorandumType("entrega");
                  setSchoolName("");
                  setDistrict("");
                  setExchangeFromSchool("");
                  setExchangeToSchool("");
                  setSelectedFromCSDT([]);
                  setSelectedFromDestino([]);
                  setCurrentStep("step1");
                }}
                className="hover:bg-red-300 dark:text-white"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleGenerateMemorandum}
                className="bg-blue-500 hover:bg-blue-700 text-white"
              >
                {memorandumType === "entrega"
                  ? "📦 Gerar Entrega"
                  : "🔄 Gerar Troca"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Drawer para exibir o histórico */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent
            className="fixed inset-y-0 right-0 w-full max-w-md bg-zinc-900 text-white shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col"
            style={{
              transform: isDrawerOpen ? "translateX(0)" : "translateX(100%)",
            }}
          >
            <DrawerHeader className="p-4 border-b border-zinc-800">
              <DrawerTitle className="text-xl font-bold">
                Histórico do Item
              </DrawerTitle>
              <DrawerDescription className="text-sm text-gray-400">
                Histórico de movimentação para o item:{" "}
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
                    <p>
                      <strong>Foi para:</strong> {history.toSchool || "N/A"}
                    </p>
                    <p>
                      <strong>Data:</strong>{" "}
                      {new Date(history.movedAt).toLocaleString("pt-BR")}
                    </p>
                    <p>
                      <strong>Gerado por:</strong>{" "}
                      {history.generatedBy || "N/A"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">Nenhum histórico encontrado.</p>
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

        {/* Modal de Confirmação de Deleção */}
        <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <AlertDialogContent className="dark:bg-zinc-900 bg-white max-w-2xl max-h-[90vh] flex flex-col">
            <AlertDialogHeader className="flex-shrink-0">
              <AlertDialogTitle className="dark:text-white text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">🗑️</span>
                Confirmar Deleção
              </AlertDialogTitle>
              <AlertDialogDescription className="dark:text-gray-300 text-gray-600">
                Você está prestes a deletar este item e TODOS os dados relacionados. Esta ação é irreversível.
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
                  {/* Informações do Item */}
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">📦 Item a ser deletado:</h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Nome:</strong> {relatedData.item.name}</p>
                      <p><strong>Marca:</strong> {relatedData.item.brand}</p>
                      <p><strong>Série:</strong> {relatedData.item.serialNumber}</p>
                      <p><strong>Escola:</strong> {relatedData.item.school}</p>
                      <p><strong>Criado por:</strong> {relatedData.item.createdBy}</p>
                    </div>
                  </div>

                  {/* Resumo dos Dados Relacionados */}
                  {relatedData.totalRelatedRecords > 0 ? (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                      <h3 className="font-semibold text-orange-800 dark:text-orange-300 mb-2">
                        ⚠️ Dados relacionados que serão deletados:
                      </h3>
                      <div className="space-y-2 text-sm">
                        {relatedData.relationships.history.count > 0 && (
                          <div>
                            <p><strong>📋 Histórico de movimentações:</strong> {relatedData.relationships.history.count} registros</p>
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
                        ✅ Este item não possui dados relacionados. Apenas o item principal será deletado.
                      </p>
                    </div>
                  )}

                  {!relatedData.canDelete && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="text-red-800 dark:text-red-300">
                        ❌ Você não tem permissão para deletar este item. Apenas quem criou o item pode deletá-lo.
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
                className={`${
                  relatedData?.canDelete && !loadingRelatedData
                    ? "bg-red-500 hover:bg-red-700"
                    : "bg-gray-400 cursor-not-allowed"
                } text-white font-semibold`}
              >
                {loadingRelatedData ? "Carregando..." : "🗑️ Deletar Tudo"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default DeviceList;
