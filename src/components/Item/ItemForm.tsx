import React, { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import BarcodeScanner from "@/components/Scanner/BarcodeScanner";
import Select from "react-select";
import Modal from 'react-modal';
import { jwtDecode } from "jwt-decode";
import { CheckCircle, WarningCircle, DeviceMobile, Tag, Barcode, GraduationCap, WindowsLogo, Cpu } from "phosphor-react";
import { ButtonLoading } from "@/components/ui/ButtonLoading"; // Importando o componente ButtonLoading

interface SchoolOption {
  value: string;
  label: string;
}

const predefinedItems = ["COMPUTADOR", "MONITOR", "MOUSE", "TECLADO", "ESTABILIZADOR", "IMPRESSORA"];

const ItemForm: React.FC = () => {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [brand, setBrand] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [school, setSchool] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [user, setUser] = useState<{ uid: string; name: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [loading, setLoading] = useState(false); // Estado de carregamento

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode<{ uid: string; name: string }>(token);
      setUser(decoded);
    }
  }, []);

  useEffect(() => {
    // Função para buscar as escolas do endpoint de API
    const fetchSchools = async () => {
      try {
        const response = await fetch('/api/schools');
        const data = await response.json();
        console.log('Dados das escolas recebidos:', data); // Log para depuração
        if (Array.isArray(data)) {
          const schoolOptions = data.map((school: { id: number, name: string }) => ({
            value: school.id.toString(), // Use o ID da escola
            label: school.name,
          }));
          setSchools(schoolOptions);
        } else {
          console.error('Formato de resposta inesperado:', data);
        }
      } catch (error) {
        console.error('Erro ao buscar escolas:', error);
      }
    };

    fetchSchools();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); // Inicia o carregamento
    const token = localStorage.getItem('token');
    if (!token) {
      setModalMessage('Usuário não autenticado');
      setModalIsOpen(true);
      setLoading(false); // Termina o carregamento
      return;
    }

    // Convertendo os valores dos inputs para uppercase
    const upperCaseName = name?.toUpperCase() || "";
    const upperCaseBrand = brand.toUpperCase();
    const upperCaseSerialNumber = serialNumber.toUpperCase();
    const upperCaseSchool = school?.toUpperCase() || ""; // Mantendo school como string

    const requestData = {
      name: upperCaseName,
      brand: upperCaseBrand,
      serialNumber: upperCaseSerialNumber,
      schoolName: upperCaseSchool, // Enviando o nome da escola
    };

    console.log('Dados enviados:', requestData); // Log para depuração

    try {
      const response = await fetch('/api/createItem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Enviando o token JWT no cabeçalho
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        setModalMessage('Item cadastrado com sucesso!');
        setName(null);
        setBrand('');
        setSerialNumber('');
        setSchool(null);
      } else {
        const errorData = await response.json();
        setModalMessage(`Erro ao cadastrar item: ${errorData.error}`);
      }
      setModalIsOpen(true);
    } catch (error) {
      console.error('Erro ao cadastrar item:', error);
      setModalMessage('Erro ao cadastrar item');
      setModalIsOpen(true);
    } finally {
      setLoading(false); // Termina o carregamento
    }
  };

  const handleScan = (data: string) => {
    setSerialNumber(data);
    setShowScanner(false);
  };

  const handleError = (error: any) => {
    console.error("Erro ao escanear código:", error);
  };

  const closeModal = () => {
    if (modalMessage === 'Sessão expirada. Por favor, faça login novamente.') {
      router.push('/login');
    }
    setModalIsOpen(false);
  };

  const predefinedItemOptions = predefinedItems.map(item => ({
    value: item,
    label: item,
  }));

  return (
    <div className="flex flex-col sm:px-6 lg:px-8">
      <form onSubmit={handleSubmit} className="bg-white  p-4 rounded shadow-md flex flex-col w-full max-w-lg">
        <div className="mb-4 relative">
          <Cpu size={24} className="absolute left-3 top-2/3 transform -translate-y-1/2 text-gray-700" />
          <label className="block text-gray-700">Nome</label>
          <Select
            options={predefinedItemOptions}
            placeholder="Selecione o nome do item"
            value={predefinedItemOptions.find(option => option.value === name)}
            onChange={(selectedOption) => setName(selectedOption?.value || null)}
            className="w-full p-2 pl-10 border-2 text-gray-700 border-gray-300 rounded mt-1 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="mb-4 relative">
          <WindowsLogo size={24} className="absolute left-3 top-2/3 transform -translate-y-1/2 text-gray-700" />
          <label className="block text-gray-700">Marca</label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full p-2 pl-10 border-2 text-gray-700 border-gray-300 rounded mt-1 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="mb-4 relative">
          <Barcode size={24} className="absolute left-3 top-12 transform -translate-y-1/2 text-gray-700" />
          <label className="block text-gray-700">Número de Série</label>
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            className="w-full p-2 pl-10 border-2 text-gray-700 border-gray-300 rounded mt-1 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowScanner(!showScanner)}
            className="w-full bg-gray-500 text-white p-2 rounded mt-2"
          >
            {showScanner ? "Fechar Scanner" : "Escanear Código"}
          </button>
          {showScanner && (
            <div className="mt-4">
              <BarcodeScanner
                onScan={handleScan}
                onError={handleError}
              />
            </div>
          )}
        </div>
        <div className="mb-4 relative">
          <GraduationCap size={24} className="absolute left-3 top-2/3 transform -translate-y-1/2 text-gray-700" />
          <label className="block text-gray-700">Escola</label>
          <Select
            options={schools}
            placeholder="Selecione a escola"
            value={schools.find((s: SchoolOption) => s.value === school)}
            onChange={(selectedOption) => setSchool(selectedOption?.value || null)}
            className="w-full p-2 pl-10 border-2 text-gray-700 border-gray-300 rounded mt-1 focus:border-blue-500 focus:outline-none"
          />
        </div>
        {loading ? (
          <ButtonLoading />
        ) : (
          <button type="submit" className={`w-full bg-blue-500 hover:bg-blue-700 text-white p-2 rounded flex items-center justify-center ${!name || !brand || !serialNumber || !school ? "opacity-50 cursor-not-allowed" : ""}`} disabled={!name || !brand || !serialNumber || !school}>
            Cadastrar
          </button>
        )}
      </form>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Mensagem"
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <div>
          <h2 className="text-xl mb-4">Mensagem</h2>
          <div className="flex items-center justify-center mb-4">
            {modalMessage.includes('sucesso') ? (
              <CheckCircle className="text-green-500 text-3xl mr-2" />
            ) : (
              <WarningCircle className="text-red-500 text-3xl mr-2" />
            )}
            <p>{modalMessage}</p>
          </div>
          <button onClick={closeModal} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white p-2 rounded">
            Fechar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ItemForm;