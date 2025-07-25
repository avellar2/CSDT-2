import React, { useEffect, useState } from "react";
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
} from "phosphor-react";
import * as XLSX from "xlsx";
import axios from "axios";
import { SkeletonCard } from "./SkeletonCard";
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
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // Estado para controlar o modal
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Estado para controlar o AlertDialog
  const [schoolName, setSchoolName] = useState("");
  const [district, setDistrict] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [memorandumNumber, setMemorandumNumber] = useState(""); // Estado para o número do memorando
  const [userRole, setUserRole] = useState<string | null>(null); // Estado para armazenar a role do usuário
  const itemsPerPage = 10; // Número de itens por página

  // NOVOS ESTADOS para troca de equipamentos
  const [memorandumType, setMemorandumType] = useState<'entrega' | 'troca'>('entrega');
  const [exchangeFromSchool, setExchangeFromSchool] = useState("");
  const [exchangeToSchool, setExchangeToSchool] = useState("");

  // Para troca: selecionar equipamentos que vão do CSDT para a escola destino
  const [selectedFromCSDT, setSelectedFromCSDT] = useState<number[]>([]);
  // Para troca: selecionar equipamentos que vão da escola destino para o CSDT
  const [selectedFromDestino, setSelectedFromDestino] = useState<number[]>([]);

  const toggleItemSelection = (itemId: number) => {
    setSelectedItems((prevSelected) =>
      prevSelected.includes(itemId)
        ? prevSelected.filter((id) => id !== itemId)
        : [...prevSelected, itemId],
    );
  };

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
    }
  }, [searchTerm, items]);

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

  const filteredItems = Array.isArray(items)
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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const deleteItem = async (itemId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Usuário não autenticado. Por favor, faça login.");
      return;
    }

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Expected JSON but got:", text);
        setModalMessage(
          "Erro ao apagar item. Resposta inesperada do servidor.",
        );
        setModalIsOpen(true);
        return;
      }

      if (response.ok) {
        setItems(items.filter((item) => item.id !== itemId));
      } else {
        const errorData = await response.json();
        setModalMessage(`Erro ao apagar item: ${errorData.error}`);
        setModalIsOpen(true);
      }
    } catch (error) {
      console.error("Erro ao apagar item:", error);
      setModalMessage("Erro ao apagar item");
      setModalIsOpen(true);
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);
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

  const openModal = () => {
    if (selectedItems.length === 0) {
      alert("Selecione pelo menos um item para gerar o memorando.");
      return;
    }
    setIsModalOpen(true);
  };

  const closeGenerateMemorandumModal = () => {
    setIsModalOpen(false);
  };

  const handleGenerateMemorandum = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Usuário não autenticado. Por favor, faça login.");
      return;
    }

    if (selectedItems.length === 0) {
      alert("Selecione pelo menos um item para gerar o memorando.");
      return;
    }

    // VALIDAÇÕES baseadas no tipo de memorando
    if (memorandumType === 'entrega') {
      if (!schoolName) {
        alert("Por favor, selecione uma escola.");
        return;
      }

      if (!district) {
        alert("O distrito não foi definido. Verifique a escola selecionada.");
        return;
      }
    } else if (memorandumType === 'troca') {
      if (!exchangeFromSchool) {
        alert("Por favor, selecione a escola de origem (De onde sai).");
        return;
      }

      if (!exchangeToSchool) {
        alert("Por favor, selecione a escola de destino (Para onde vai).");
        return;
      }

      if (exchangeFromSchool === exchangeToSchool) {
        alert("A escola de origem e destino não podem ser iguais.");
        return;
      }
    }

    if (!memorandumNumber) {
      alert("Por favor, insira o número do memorando.");
      return;
    }

    if (selectedItems.length > 13) {
      setModalMessage("Você pode selecionar no máximo 13 itens por memorando.");
      setModalIsOpen(true);
      return;
    }

    try {
      // Para TROCA: Verificar se os itens estão na escola de origem
      if (memorandumType === 'troca') {
        const itemsNotInFromSchool = items.filter(
          (item) => selectedItems.includes(item.id) && item.School?.name !== exchangeFromSchool
        );

        if (itemsNotInFromSchool.length > 0) {
          const itemNames = itemsNotInFromSchool.map((item) => item.name).join(", ");
          setModalMessage(
            `O(s) item(s) ${itemNames} não está(ão) na escola de origem "${exchangeFromSchool}". Verifique a localização dos equipamentos.`
          );
          setModalIsOpen(true);
          return;
        }
      }

      // Para ENTREGA: Verificar se algum item está na escola CHADA
      if (memorandumType === 'entrega') {
        const itemsInChada = items.filter(
          (item) => selectedItems.includes(item.id) && item.School?.name === "CHADA"
        );

        if (itemsInChada.length > 0) {
          const itemNames = itemsInChada.map((item) => item.name).join(", ");
          setModalMessage(
            `O(s) item(s) ${itemNames} está(ão) na CHADA. Por favor, dar baixa no(s) item(s) para o CSDT antes de fazer o memorando.`
          );
          setModalIsOpen(true);
          return;
        }
      }

      // Verificar se o número do memorando já existe
      const checkResponse = await axios.get(
        `/api/check-memorandum-number?number=${memorandumNumber}`
      );

      if (checkResponse.data.exists) {
        setModalMessage(
          `O número do memorando ${memorandumNumber} já existe. Por favor, escolha outro número.`
        );
        setModalIsOpen(true);
        return;
      }

      // PREPARAR DADOS baseados no tipo de memorando
      let requestData: any = {
        itemIds: selectedItems,
        memorandumNumber,
        type: memorandumType
      };

      if (memorandumType === 'entrega') {
        const selectedSchool = schools.find(
          (school) => school.name === schoolName
        );

        if (!selectedSchool) {
          alert("Por favor, selecione uma escola válida.");
          return;
        }

        requestData = {
          ...requestData,
          schoolName,
          district,
          inep: selectedSchool.inep,
        };
      } else if (memorandumType === 'troca') {
        const fromSchool = schools.find(
          (school) => school.name === exchangeFromSchool
        );
        const toSchool = schools.find(
          (school) => school.name === exchangeToSchool
        );

        if (!fromSchool || !toSchool) {
          alert("Por favor, selecione escolas válidas para origem e destino.");
          return;
        }

        requestData = {
          ...requestData,
          fromCSDT: selectedFromCSDT,
          fromDestino: selectedFromDestino,
          toSchool: exchangeToSchool,
        };
      }

      console.log("Dados enviados:", requestData);

      const response = await axios.post(
        "/api/generate-memorandum",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
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
      const fileName = memorandumType === 'entrega'
        ? `memorando-entrega-${memorandumNumber}.pdf`
        : `memorando-troca-${memorandumNumber}.pdf`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      // Atualizar os itens no frontend após a geração do memorando
      const updatedItemsResponse = await axios.get("/api/items");
      setItems(updatedItemsResponse.data);

      // Limpar os campos
      setSelectedItems([]);
      setMemorandumType('entrega');
      setSchoolName("");
      setDistrict("");
      setExchangeFromSchool("");
      setExchangeToSchool("");
      setMemorandumNumber("");
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
      NOTEBOOK: 0
    };

    items.forEach((item) => {
      const title = item.name.toUpperCase().trim() as keyof typeof totals;
      if (totals.hasOwnProperty(title)) {
        totals[title]++;
      }
    });

    return totals;
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
    <div className=" dark:bg-zinc-950 bg-zinc-200 rounded-lg text-white p-6 container mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h1 className="text-2xl font-bold mb-4 md:mb-0 dark:text-zinc-100 text-zinc-700">
          Lista de Dispositivos
        </h1>
        <div className="flex gap-4">
          <button
            onClick={exportToExcel}
            className="bg-green-500 hover:bg-green-700 text-white p-2 rounded flex items-center"
          >
            <FileArrowDown size={24} className="mr-2" />
            Exportar para Excel
          </button>
          {(userRole === "ADMTOTAL" || userRole === "ADMIN") && (
            <button
              onClick={() => {
                if (selectedItems.length === 0) {
                  alert("Selecione pelo menos um item para gerar o memorando.");
                  return;
                }
                setIsDialogOpen(true); // Abre o AlertDialog
              }}
              className="bg-blue-500 hover:bg-blue-700 text-white p-2 rounded flex items-center"
            >
              <File size={24} className="mr-2" />
              Gerar Memorando
            </button>
          )}
        </div>
      </div>
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Pesquisar"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 pl-10 rounded dark:bg-zinc-900 dark:text-white"
        />
        <MagnifyingGlass
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={20}
        />
      </div>

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

      <div className="space-y-4">
        {currentItems.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center ${item.School?.name === "CHADA" ? "bg-rose-900 opacity-70" : "bg-gray-900"
              }`}
          >
            <div className="flex items-center mb-4 md:mb-0">
              <input
                type="checkbox"
                checked={selectedItems.includes(item.id)}
                onChange={() => toggleItemSelection(item.id)}
                className="mr-2"
              />
              <div>
                <h2 className="text-lg font-semibold">{item.name}</h2>
                <p className="text-gray-400">
                  <span className="font-extrabold">Marca:</span> {item?.brand}
                </p>
                <p className="text-gray-400">
                  <span className="font-extrabold">Serial:</span>{" "}
                  {item?.serialNumber}
                </p>
                <p className="text-gray-400">
                  <span className="font-extrabold">Escola:</span>{" "}
                  {item.School?.name}
                </p>
                <p className="text-gray-400">
                  <span className="font-extrabold">Data de Criação:</span>{" "}
                  {format(new Date(item.createdAt), "dd/MM/yyyy, HH:mm:ss", {
                    locale: ptBR,
                  })}
                </p>
                <p className="text-gray-400">
                  <span className="font-extrabold">Adicionado por:</span>{" "}
                  {item.Profile?.displayName}
                </p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => openHistoryDrawer(item)}
                className="text-blue-500 hover:text-blue-700"
              >
                <Clock size={24} />
              </button>
              {item.Profile?.userId === userId && (
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash size={24} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <div className="w-full flex flex-wrap justify-center gap-2">
          <Pagination
            total={filteredItems.length}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        </div>

        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          contentLabel="Mensagem"
          className="modal-content"
          overlayClassName="modal-overlay"
        >
          <div>
            <h2 className="text-xl mb-4">Mensagem</h2>
            <p>{modalMessage}</p>
            <button
              onClick={closeModal}
              className="mt-4 bg-blue-500 hover:bg-blue-700 text-white p-2 rounded"
            >
              Fechar
            </button>
          </div>
        </Modal>

        {/* AlertDialog para gerar o memorando */}
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent className="dark:bg-zinc-900 bg-white text-black max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="dark:text-white">
                Gerar Memorando
              </AlertDialogTitle>
              <AlertDialogDescription>
                Escolha o tipo de memorando e preencha as informações necessárias.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-6">
              {/* SELETOR DE TIPO DE MEMORANDO */}
              <div className="space-y-3">
                <label className="block">
                  <span className="dark:text-gray-300 font-semibold">Tipo de Memorando:</span>
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="entrega"
                      checked={memorandumType === 'entrega'}
                      onChange={(e) => setMemorandumType(e.target.value as 'entrega')}
                      className="form-radio text-blue-500"
                    />
                    <span className="dark:text-gray-300">📦 Entrega de Equipamentos</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="troca"
                      checked={memorandumType === 'troca'}
                      onChange={(e) => setMemorandumType(e.target.value as 'troca')}
                      className="form-radio text-blue-500"
                    />
                    <span className="dark:text-gray-300">🔄 Troca de Equipamentos</span>
                  </label>
                </div>
              </div>

              {/* CAMPOS PARA ENTREGA */}
              {memorandumType === 'entrega' && (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300">
                    📦 Configurações de Entrega
                  </h4>

                  <label className="block">
                    <span className="dark:text-gray-300">Escola de Destino:</span>
                    <Select
                      options={schools.map((school) => ({
                        value: school.name,
                        label: school.name,
                      }))}
                      value={schoolName ? { value: schoolName, label: schoolName } : null}
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
                </div>
              )}

              {/* CAMPOS PARA TROCA */}
              {memorandumType === 'troca' && (
                <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <h4 className="font-semibold text-orange-800 dark:text-orange-300">
                    🔄 Configurações de Troca
                  </h4>

                  {/* Escolher escola destino */}
                  <label className="block">
                    <span className="dark:text-gray-300">Escola de Destino:</span>
                    <Select
                      options={schools.map((school) => ({
                        value: school.name,
                        label: school.name,
                      }))}
                      value={exchangeToSchool ? { value: exchangeToSchool, label: exchangeToSchool } : null}
                      onChange={(selectedOption) => {
                        setExchangeToSchool(selectedOption?.value || "");
                      }}
                      className="text-black"
                      placeholder="Selecione a escola de destino"
                      isClearable
                    />
                  </label>

                  {/* Selecionar equipamentos que vão do CSDT para a escola destino */}
                  <div>
                    <span className="dark:text-gray-300 font-semibold">Equipamentos que vão do CSDT para {exchangeToSchool || "..."}</span>
                    <div className="max-h-32 overflow-y-auto bg-white dark:bg-zinc-800 rounded p-2 border">
                      {items
                        .filter(item => item.School?.name === "CSDT")
                        .map(item => (
                          <label key={item.id} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={selectedFromCSDT.includes(item.id)}
                              onChange={() => {
                                setSelectedFromCSDT(prev =>
                                  prev.includes(item.id)
                                    ? prev.filter(id => id !== item.id)
                                    : [...prev, item.id]
                                );
                              }}
                            />
                            {item.name} - {item.brand} ({item.serialNumber})
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Selecionar equipamentos que vão da escola destino para o CSDT */}
                  {exchangeToSchool && (
                    <div>
                      <span className="dark:text-gray-300 font-semibold">Equipamentos que vão de {exchangeToSchool} para o CSDT</span>
                      <div className="max-h-32 overflow-y-auto bg-white dark:bg-zinc-800 rounded p-2 border">
                        {items
                          .filter(item => item.School?.name === exchangeToSchool)
                          .map(item => (
                            <label key={item.id} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={selectedFromDestino.includes(item.id)}
                                onChange={() => {
                                  setSelectedFromDestino(prev =>
                                    prev.includes(item.id)
                                      ? prev.filter(id => id !== item.id)
                                      : [...prev, item.id]
                                  );
                                }}
                              />
                              {item.name} - {item.brand} ({item.serialNumber})
                            </label>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* NÚMERO DO MEMORANDO */}
              <label className="block">
                <span className="dark:text-gray-300">Número do Memorando:</span>
                <input
                  type="text"
                  value={memorandumNumber}
                  onChange={(e) => setMemorandumNumber(e.target.value)}
                  className="w-full p-2 rounded dark:bg-zinc-800 dark:text-white"
                  placeholder="Digite o número do memorando (ex: 001/2025)"
                />
              </label>

              {/* PREVIEW DOS ITENS SELECIONADOS */}
              <div className="mt-4 p-3 bg-gray-50 dark:bg-zinc-800 rounded border">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  📋 Itens Selecionados: {selectedItems.length}
                </p>
                <div className="max-h-32 overflow-y-auto">
                  {items
                    .filter(item => selectedItems.includes(item.id))
                    .map(item => (
                      <p key={item.id} className="text-xs text-gray-600 dark:text-gray-400">
                        • {item.name} - {item.brand} ({item.serialNumber})
                      </p>
                    ))}
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setMemorandumType('entrega');
                  setSchoolName("");
                  setDistrict("");
                  setExchangeFromSchool("");
                  setExchangeToSchool("");
                  setMemorandumNumber("");
                }}
                className="hover:bg-red-300 dark:text-white"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleGenerateMemorandum}
                className="bg-blue-500 hover:bg-blue-700 text-white"
              >
                {memorandumType === 'entrega' ? '📦 Gerar Entrega' : '🔄 Gerar Troca'}
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
                      <strong>Foi para:</strong> {history.fromSchool || "N/A"}
                    </p>
                    <p>
                      <strong>Data:</strong>{" "}
                      {new Date(history.movedAt).toLocaleString("pt-BR")}
                    </p>
                    <p>
                      <strong>Gerado por:</strong> {history.generatedBy || "N/A"}
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
      </div>
    </div>
  );
};

export default DeviceList;
