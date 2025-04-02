import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Modal from 'react-modal';
import { jwtDecode } from 'jwt-decode';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MagnifyingGlass, Trash, FileArrowDown, Clock, File } from 'phosphor-react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { SkeletonCard } from './SkeletonCard';
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
import Select from 'react-select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Item {
  id: number;
  name: string;
  brand: string;
  serialNumber: string;
  createdAt: string;
  inep: string;
  profile: {
    displayName: string;
    userId: string;
  };
  school: {
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
  const [schoolName, setSchoolName] = useState('');
  const [district, setDistrict] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Número de itens por página

  const toggleItemSelection = (itemId: number) => {
    setSelectedItems((prevSelected) =>
      prevSelected.includes(itemId)
        ? prevSelected.filter((id) => id !== itemId)
        : [...prevSelected, itemId]
    );
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setModalMessage('Usuário não autenticado. Por favor, faça login.');
      setModalIsOpen(true);
      return;
    }

    try {
      const decoded = jwtDecode<{ userId: string; name: string }>(token);
      if (!decoded) {
        setModalMessage('Usuário não autenticado. Por favor, faça login.');
        setModalIsOpen(true);
        return;
      }
      setUserName(decoded.name);
      setUserId(decoded.userId);
    } catch (error) {
      setModalMessage('Usuário não autenticado. Por favor, faça login.');
      setModalIsOpen(true);
      return;
    }

    const fetchItems = async () => {
      try {
        const response = await fetch('/api/items', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Expected JSON but got:', text);
          setModalMessage('Erro ao buscar itens. Resposta inesperada do servidor.');
          setModalIsOpen(true);
          return;
        }

        const data = await response.json();
        console.log('API response:', data);
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          console.error('Expected an array but got:', data);
        }
      } catch (error) {
        console.error('Error fetching items:', error);
        setModalMessage('Erro ao buscar itens.');
        setModalIsOpen(true);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  useEffect(() => {
    const countItemsInSchool = () => {
      const count = items.filter((item) =>
        item.school && item.school.name.toLowerCase().includes(searchTerm.toLowerCase())
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
        const response = await axios.get('/api/schools');
        setSchools(response.data);
      } catch (error) {
        console.log('Error fetching schools:', error);
      }
    }

    fetchItems()
  }, []);

  const filteredItems = Array.isArray(items)
    ? items
      .filter((item) =>
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.school && item.school.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Ordena por data de criação (mais recentes primeiro)
    : [];

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const deleteItem = async (itemId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setModalMessage('Usuário não autenticado. Por favor, faça login.');
      setModalIsOpen(true);
      return;
    }

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but got:', text);
        setModalMessage('Erro ao apagar item. Resposta inesperada do servidor.');
        setModalIsOpen(true);
        return;
      }

      if (response.ok) {
        setItems(items.filter(item => item.id !== itemId));
      } else {
        const errorData = await response.json();
        setModalMessage(`Erro ao apagar item: ${errorData.error}`);
        setModalIsOpen(true);
      }
    } catch (error) {
      console.error('Erro ao apagar item:', error);
      setModalMessage('Erro ao apagar item');
      setModalIsOpen(true);
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);

  };

  const exportToExcel = () => {
    const formattedItems = items.map(item => ({
      ID: item.id,
      Nome: item.name,
      Marca: item.brand,
      'Número de Série': item.serialNumber,
      Escola: item.school.name,
      'Data de Criação': format(new Date(item.createdAt), 'dd/MM/yyyy, HH:mm:ss', { locale: ptBR }),
      'Adicionado por': item.profile.displayName,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedItems);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Itens');
    XLSX.writeFile(workbook, 'itens.xlsx');
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
    if (selectedItems.length > 13) {
      setModalMessage('Você pode selecionar no máximo 13 itens por memorando.');
      setModalIsOpen(true);
      return;
    }

    try {
      // Encontrar a escola selecionada
      const selectedSchool = schools.find((school) => school.name === schoolName);

      if (!selectedSchool) {
        alert('Por favor, selecione uma escola válida.');
        return;
      }

      // const districtAtt = district === 'não informado' ? '0' : String(district);

      const response = await axios.post('/api/generate-memorandum', {
        itemIds: selectedItems, // IDs dos itens selecionados
        schoolName,
        district, // Define o valor do distrito com base na escola selecionada
        inep: selectedSchool.inep // Define o valor de INEP com base na escola selecionada
      });

      // Atualizar os itens no frontend após a geração do memorando
      const updatedItemsResponse = await axios.get('/api/items');
      setItems(updatedItemsResponse.data);

      // Decodificar o PDF Base64
      const pdfBase64 = response.data.pdfBase64;
      const binaryString = atob(pdfBase64);
      const binaryLen = binaryString.length;
      const bytes = new Uint8Array(binaryLen);

      for (let i = 0; i < binaryLen; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pdfBlob = new Blob([bytes], { type: 'application/pdf' });

      // Criar um link para download
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'memorando.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Erro ao gerar memorando:', error);
      alert('Falha ao gerar o memorando. Verifique os dados enviados.');
    }
  };

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
    const schoolFilteredById = schools.filter(school => school.id === id);
    return schoolFilteredById[0].name;
  }

  const openHistoryDrawer = async (item: any) => {
    setSelectedItem(item);
    try {
      const response = await axios.get(`/api/items/${item.id}/history`);
      setItemHistory(response.data);
      setIsDrawerOpen(true);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      alert('Falha ao buscar o histórico do item.');
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
        <h1 className="text-2xl font-bold mb-4 md:mb-0 dark:text-zinc-100 text-zinc-700">Lista de Dispositivos</h1>
        <div className='flex gap-4'>
          <button onClick={exportToExcel} className="bg-green-500 hover:bg-green-700 text-white p-2 rounded flex items-center">
            <FileArrowDown size={24} className="mr-2" />
            Exportar para Excel
          </button>
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
        <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
      </div>
      {searchTerm && (
        <p className="mb-4">
          Quantidade de itens na escola "{searchTerm}": {schoolItemCount}
        </p>
      )}
      <div className="space-y-4">
        {currentItems.map((item) => (
          <div key={item.id} className="bg-gray-900 p-4 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <input
                type="checkbox"
                checked={selectedItems.includes(item.id)}
                onChange={() => toggleItemSelection(item.id)}
                className="mr-2"
              />
              <div>
                <h2 className="text-lg font-semibold">{item.name}</h2>
                <p className="text-gray-400"><span className='font-extrabold'>Marca:</span> {item.brand}</p>
                <p className="text-gray-400"><span className='font-extrabold'>Serial:</span> {item.serialNumber}</p>
                <p className="text-gray-400"><span className='font-extrabold'>Escola:</span> {item.school.name}</p>
                <p className="text-gray-400">
                  <span className="font-extrabold">Data de Criação:</span>{' '}
                  {format(new Date(item.createdAt), 'dd/MM/yyyy, HH:mm:ss', { locale: ptBR })}
                </p>
                <p className="text-gray-400"><span className='font-extrabold'>Adicionado por:</span> {item.profile.displayName}</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => openHistoryDrawer(item)}
                className="text-blue-500 hover:text-blue-700"
              >
                <Clock size={24} />
              </button>
              {item.profile.userId === userId && (
                <button onClick={() => deleteItem(item.id)} className="text-red-500 hover:text-red-700">
                  <Trash size={24} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Pagination className="w-full flex flex-wrap justify-center gap-2">
          <PaginationContent>
            {/* Botão de página anterior */}
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                className="text-black dark:text-white"
              />
            </PaginationItem>

            {/* Primeira página */}
            {currentPage > 2 && (
              <>
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    isActive={currentPage === 1}
                    onClick={() => handlePageChange(1)}
                    className="text-black active:bg-blue-200 dark:text-white px-3 py-1 rounded-md"
                  >
                    1
                  </PaginationLink>
                </PaginationItem>
                {/* Reticências antes da página atual */}
                {currentPage > 3 && (
                  <PaginationEllipsis className="text-gray-500 px-2">...</PaginationEllipsis>
                )}
              </>
            )}

            {/* Página atual */}
            <PaginationItem>
              <PaginationLink
                href="#"
                isActive={true}
                onClick={() => handlePageChange(currentPage)}
                className="text-black active:bg-blue-200 dark:text-white px-3 py-1 rounded-md"
              >
                {currentPage}
              </PaginationLink>
            </PaginationItem>

            {/* Próxima página */}
            {currentPage < totalPages - 1 && (
              <PaginationItem>
                <PaginationLink
                  href="#"
                  isActive={false}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="text-black active:bg-blue-200 dark:text-white px-3 py-1 rounded-md"
                >
                  {currentPage + 1}
                </PaginationLink>
              </PaginationItem>
            )}

            {/* Reticências antes da última página */}
            {currentPage < totalPages - 2 && (
              <PaginationEllipsis className="text-gray-500 px-2">...</PaginationEllipsis>
            )}

            {/* Última página */}
            {currentPage < totalPages && (
              <PaginationItem>
                <PaginationLink
                  href="#"
                  isActive={currentPage === totalPages}
                  onClick={() => handlePageChange(totalPages)}
                  className="text-black active:bg-blue-200 dark:text-white px-3 py-1 rounded-md"
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            )}

            {/* Botão de próxima página */}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                className="text-black dark:text-white"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
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
          <button onClick={closeModal} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white p-2 rounded">
            Fechar
          </button>
        </div>
      </Modal>

      {/* AlertDialog para gerar o memorando */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className='dark:bg-zinc-900 bg-white text-black'>
          <AlertDialogHeader>
            <AlertDialogTitle className='dark:text-white'>Gerar Memorando</AlertDialogTitle>
            <AlertDialogDescription>
              Preencha as informações abaixo para gerar o memorando.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            {/* Campo para selecionar a escola */}
            <label className="block">
              <span className="dark:text-gray-300">Nome da Escola:</span>
              <Select
                options={schools.map((school) => ({
                  value: school.name,
                  label: school.name,
                }))}
                value={schoolName ? { value: schoolName, label: schoolName } : null}
                onChange={(selectedOption) => {
                  const selectedSchoolName = selectedOption?.value || '';
                  setSchoolName(selectedSchoolName);

                  // Encontrar o distrito correspondente à escola selecionada
                  const selectedSchool = schools.find(
                    (school) => school.name === selectedSchoolName
                  );
                  if (selectedSchool) {
                    setDistrict(selectedSchool.district); // Atualiza o distrito
                  }
                }}
                className="text-black"
                placeholder="Selecione uma escola"
                isClearable
              />
            </label>

            {/* Campo para o distrito (preenchido automaticamente) */}
            <label className="block">
              <span className="dark:text-gray-300">Distrito:</span>
              <input
                type="text"
                value={district}
                readOnly
                className="w-full p-2 rounded dark:bg-zinc-900  dark:text-white"
              />
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className='hover:bg-red-300 dark:text-white'>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateMemorandum} className='bg-blue-500 hover:bg-blue-700 text-white'>
              Gerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Drawer para exibir o histórico */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent
          className="fixed inset-y-0 right-0 w-full max-w-md bg-zinc-900 text-white shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col"
          style={{
            transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
          }}
        >
          <DrawerHeader className="p-4 border-b border-zinc-800">
            <DrawerTitle className="text-xl font-bold">Histórico do Item</DrawerTitle>
            <DrawerDescription className="text-sm text-gray-400">
              Histórico de movimentação para o item: <strong>{selectedItem?.name}, {selectedItem?.brand}, {selectedItem?.serialNumber}</strong>
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
                    <strong>Foi para:</strong> {history.fromSchool || 'N/A'}
                  </p>
                  <p>
                    <strong>Data:</strong> {new Date(history.movedAt).toLocaleString('pt-BR')}
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
  );
};

export default DeviceList;
