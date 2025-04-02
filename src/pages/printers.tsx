import React, { useEffect, useState } from 'react';
import { MagnifyingGlass } from 'phosphor-react';

interface Printer {
  id: number;
  sigla: string;
  setor: string;
  modelo: string;
  fabricante: string;
  serial: string;
  ip: string;
}

const Printers: React.FC = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        const response = await fetch('/api/printers');
        const data = await response.json();
        if (Array.isArray(data)) {
          setPrinters(data);
        } else {
          console.error('A resposta da API não é um array:', data);
        }
      } catch (error) {
        console.error('Erro ao buscar impressoras:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrinters();
  }, []);

  const filteredPrinters = printers.filter((printer) =>
    printer.sigla.toLowerCase().includes(searchTerm.toLowerCase()) ||
    printer.setor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    printer.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    printer.fabricante.toLowerCase().includes(searchTerm.toLowerCase()) ||
    printer.serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    printer.ip.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-center">Lista de Impressoras</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-lg shadow-md animate-pulse"
            >
              <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-5/6 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Lista de Impressoras</h1>
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Pesquisar"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 pl-10 rounded-lg dark:bg-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrinters.map((printer) => (
          <a
            key={printer.id}
            href={`http://${printer.ip}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-transform duration-300 transform hover:scale-105 hover:bg-blue-100"
          >
            <h2 className="text-xl font-semibold mb-2 text-blue-500">{printer.sigla}</h2>
            <p className="text-gray-600"><strong>Setor:</strong> {printer.setor}</p>
            <p className="text-gray-600"><strong>Modelo:</strong> {printer.modelo}</p>
            <p className="text-gray-600"><strong>Fabricante:</strong> {printer.fabricante}</p>
            <p className="text-gray-600"><strong>Serial:</strong> {printer.serial}</p>
            <p className="text-gray-600"><strong>IP:</strong> {printer.ip}</p>
          </a>
        ))}
      </div>
    </div>
  );
};

export default Printers;