import React, { useEffect, useState } from "react";
import axios from "axios";
import { MagnifyingGlass } from "phosphor-react";

const MemorandumsPage: React.FC = () => {
  const [memorandums, setMemorandums] = useState<any[]>([]);
  const [filteredMemorandums, setFilteredMemorandums] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemorandums = async () => {
      try {
        const response = await axios.get("/api/get-memorandums");
        console.log("Memorandos recebidos:", response.data); // Verifique os dados aqui
        setMemorandums(response.data);
        setFilteredMemorandums(response.data);
      } catch (error) {
        console.error("Error fetching memorandums:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMemorandums();
  }, []);

  // Atualiza os memorandos filtrados com base no termo de pesquisa
  useEffect(() => {
    const filtered = memorandums.filter((memorandum) => {
      const search = searchTerm.toLowerCase();

      // Verifica se o termo de pesquisa está presente em qualquer campo relevante
      return (
        memorandum.schoolName.toLowerCase().includes(search) || // Nome da escola
        memorandum.number.toString().includes(search) || // Número do memorando
        memorandum.district?.toLowerCase().includes(search) || // Distrito
        new Date(memorandum.createdAt).toLocaleDateString('pt-BR').includes(search) || // Data formatada
        memorandum.items.some((item: any) =>
          item.Item?.name.toLowerCase().includes(search) || // Nome do item
          item.Item?.brand.toLowerCase().includes(search) || // Marca do item
          item.Item?.serialNumber.toLowerCase().includes(search) // Número de série
        )
      );
    });

    setFilteredMemorandums(filtered);
  }, [searchTerm, memorandums]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8 dark:text-gray-200 text-zinc-700">
        Lista de Memorandos
      </h1>

      {/* Barra de Pesquisa com Lupa */}
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Buscar por escola, número, data, item, marca ou número de série..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <MagnifyingGlass size={20} className="text-gray-400" />
        </div>
      </div>

      {filteredMemorandums.length === 0 ? (
        <p className="text-center text-gray-600">
          Nenhum memorando encontrado.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMemorandums.map((memorandum) => (
            <div
              key={memorandum.id}
              className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transform transition-transform hover:scale-105 hover:bg-blue-300"
            >
              <h2 className="text-xl font-semibold text-gray-800">
                Memorando #{memorandum.number}
              </h2>
              <p className="text-gray-600 mt-2">
                <strong>Escola:</strong> {memorandum.schoolName}
              </p>
              <p className="text-gray-600">
                <strong>Distrito:</strong> {memorandum.district}
              </p>
              <p className="text-gray-600">
                <strong>Data:</strong>{" "}
                {new Date(memorandum.createdAt).toLocaleDateString("pt-BR")}
              </p>
              <h3 className="mt-4 font-semibold text-gray-800">Itens:</h3>
              <ul className="list-disc pl-6 text-gray-600">
                {memorandum.items.map((memorandumItem: any) => (
                  <li key={memorandumItem.Item?.id}>
                    {memorandumItem.Item?.name || "Nome não disponível"} (
                    {memorandumItem.Item?.brand || "Marca não disponível"}) -
                    Serial: {memorandumItem.Item?.serialNumber || "N/A"}
                  </li>
                ))}
              </ul>

              <p className="text-zinc-800 mt-5">
                <strong>Gerado por:</strong> {memorandum.generatedBy}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemorandumsPage;
