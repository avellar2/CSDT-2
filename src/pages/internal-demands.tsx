import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle } from "phosphor-react"; // Ícone para aceitar OS

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface InternalOS {
  id: string;
  setor: string;
  tecnico: string;
  problema: string;
  status: string;
  updatedAt: string;
}

interface Profile {
  id: number;
  displayName: string;
}

const InternalDemands: React.FC = () => {
  const [internalOSList, setInternalOSList] = useState<InternalOS[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOSId, setSelectedOSId] = useState<string | null>(null);
  const [problemDescription, setProblemDescription] = useState("");
  const [selectedOS, setSelectedOS] = useState<InternalOS | null>(null);

  useEffect(() => {
    const fetchProfileAndOS = async () => {
      try {
        // 1. Obtém o usuário logado do Supabase Auth
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          console.error("Erro ao obter usuário logado:", error);
          return;
        }

        const userId = user.id; // ID do usuário logado no Supabase

        // 2. Busca o perfil do técnico na tabela Profile
        const profileResponse = await fetch(
          `/api/get-profile?userId=${userId}`,
        );
        const profileData = await profileResponse.json();

        if (!profileResponse.ok) {
          throw new Error(`Erro ao buscar perfil: ${profileResponse.status}`);
        }

        setProfile(profileData);

        // 3. Busca as OS do técnico
        const osResponse = await fetch(
          `/api/get-internal-os-by-technician?userId=${userId}`,
        );

        if (!osResponse.ok) {
          throw new Error(`Erro ao buscar OS: ${osResponse.status}`);
        }

        const osData = await osResponse.json();
        setInternalOSList(Array.isArray(osData) ? osData : []);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setInternalOSList([]);
      }
    };

    fetchProfileAndOS();
  }, []);

  const acceptOS = async (osId: string) => {
    try {
      const response = await fetch("/api/update-os-status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ osId, status: "Aceita" }),
      });

      if (!response.ok) {
        throw new Error("Erro ao aceitar a OS");
      }

      const updatedOS = await response.json();

      // Atualiza o estado local para refletir a mudança
      setInternalOSList((prev) =>
        prev.map((os) => (os.id === updatedOS.id ? { ...os, status: updatedOS.status } : os))
      );
    } catch (error) {
      console.error("Erro ao aceitar a OS:", error);
      alert("Erro ao aceitar a OS. Tente novamente.");
    }
  };

  const finalizeOS = async () => {
    if (!selectedOSId || !problemDescription.trim()) {
      alert("A descrição do problema é obrigatória.");
      return;
    }

    console.log({
      osId: selectedOSId,
      status: "Concluído",
      descricao: problemDescription.trim(),
    });

    try {
      const response = await fetch("/api/finalize-os", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          osId: selectedOSId, // Certifique-se de que este valor está definido
          status: "Concluído", // Status correto
          descricao: problemDescription.trim(), // Enviar a descrição corretamente
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao finalizar a OS");
      }

      const updatedOS = await response.json();

      // Atualiza o estado local para refletir a mudança
      setInternalOSList((prev) =>
        prev.map((os) => (os.id === updatedOS.id ? { ...os, status: updatedOS.status } : os))
      );

      setIsModalOpen(false);
      setProblemDescription("");
      setSelectedOSId(null);
      alert("OS finalizada com sucesso!");
    } catch (error) {
      console.error("Erro ao finalizar a OS:", error);
      alert("Erro ao finalizar a OS. Tente novamente.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Demandas Internas - {profile?.displayName || "Carregando..."}
        </h1>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border border-gray-300 text-left text-sm font-black text-gray-700">
                  Setor
                </th>
                <th className="px-4 py-2 border border-gray-300 text-left text-sm font-black text-gray-700">
                  Problema
                </th>
                <th className="px-4 py-2 border border-gray-300 text-left text-sm font-black text-gray-700">
                  Status
                </th>
                <th className="px-4 py-2 border border-gray-300 text-left text-sm font-black text-gray-700">
                  Atualizado em
                </th>
                <th className="px-4 py-2 border border-gray-300 text-left text-sm font-black text-gray-700">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {internalOSList.filter((os) => os.status !== "Concluído").length > 0 ? (
                internalOSList
                  .filter((os) => os.status !== "Concluído") // Filtrar OS com status diferente de "Concluído"
                  .map((os) => (
                    <tr key={os.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 border border-gray-300 text-sm text-gray-700">
                        {os.setor}
                      </td>
                      <td className="px-4 py-2 border border-gray-300 text-sm text-gray-700">
                        {os.problema}
                      </td>
                      <td
                        className={`px-4 py-2 border border-gray-300 text-sm font-medium text-white text-center ${os.status === "Pendente"
                          ? "bg-yellow-200 text-yellow-800"
                          : os.status === "Aceita"
                            ? "bg-blue-200 text-blue-800"
                            : "bg-gray-200 text-gray-800"
                          }`}
                      >
                        {os.status}
                      </td>
                      <td className="px-4 py-2 border border-gray-300 text-sm text-gray-700">
                        {new Date(os.updatedAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-2 border border-gray-300 text-center">
                        {os.status === "Pendente" && (
                          <button
                            onClick={() => acceptOS(os.id)}
                            title="Aceitar OS"
                            className="text-green-500 hover:text-green-700 transition-colors"
                          >
                            <CheckCircle size={24} />
                          </button>
                        )}
                        {os.status === "Aceita" && (
                          <button
                            onClick={() => {
                              setSelectedOS(os); // Armazena os dados da OS selecionada
                              setSelectedOSId(os.id); // Armazena o ID da OS
                              setIsModalOpen(true); // Abre o modal
                            }}
                            title="Finalizar OS"
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            <CheckCircle size={24} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-2 text-center text-sm text-gray-500"
                  >
                    Nenhuma OS pendente ou aceita encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {isModalOpen && selectedOS && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Finalizar OS</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-700">
                <strong>Setor:</strong> {selectedOS.setor}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Problema:</strong> {selectedOS.problema}
              </p>
            </div>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-lg mb-4"
              rows={4}
              placeholder="Descreva o problema resolvido..."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedOS(null); // Limpa a OS selecionada
                  setProblemDescription("");
                  setSelectedOSId(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={finalizeOS}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalDemands;
