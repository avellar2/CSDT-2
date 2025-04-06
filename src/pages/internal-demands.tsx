import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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
                <th className="px-4 py-2 border border-gray-300 text-left text-sm font-medium text-gray-700">
                  Setor
                </th>
                <th className="px-4 py-2 border border-gray-300 text-left text-sm font-medium text-gray-700">
                  Problema
                </th>
                <th className="px-4 py-2 border border-gray-300 text-left text-sm font-medium text-gray-700">
                  Status
                </th>
                <th className="px-4 py-2 border border-gray-300 text-left text-sm font-medium text-gray-700">
                  Atualizado em
                </th>
              </tr>
            </thead>
            <tbody>
              {internalOSList.length > 0 ? (
                internalOSList.map((os) => (
                  <tr key={os.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 border border-gray-300 text-sm text-gray-700">
                      {os.setor}
                    </td>
                    <td className="px-4 py-2 border border-gray-300 text-sm text-gray-700">
                      {os.problema}
                    </td>
                    <td
                      className={`px-4 py-2 border border-gray-300 text-sm font-medium ${
                        os.status === "Pendente"
                          ? "text-yellow-500"
                          : os.status === "Em Andamento"
                            ? "text-blue-500"
                            : os.status === "Concluído"
                              ? "text-green-500"
                              : "text-gray-700"
                      }`}
                    >
                      {os.status}
                    </td>
                    <td className="px-4 py-2 border border-gray-300 text-sm text-gray-700">
                      {new Date(os.updatedAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-2 text-center text-sm text-gray-500"
                  >
                    {profile
                      ? `Nenhuma demanda interna encontrada para ${profile.displayName}`
                      : "Carregando..."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InternalDemands;
