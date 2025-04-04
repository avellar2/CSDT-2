import React, { useEffect, useState } from "react";
import { Trash } from "phosphor-react"; // Ícone do Phosphor Icons

interface Demand {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

interface Technician {
  id: string;
  technicianId: number;
  name?: string;
}

const DailyDemands: React.FC = () => {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [baseTechnicians, setBaseTechnicians] = useState<Technician[]>([]); // Técnicos na base
  const [visitTechnicians, setVisitTechnicians] = useState<Technician[]>([]); // Técnicos em visita técnica
  const [offTechnicians, setOffTechnicians] = useState<Technician[]>([]); // Técnicos de folga
  const [signedSchools, setSignedSchools] = useState<string[]>([]); // Escolas assinadas
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obter a data atual formatada
  const today = new Date();
  const formattedDate = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const fetchTechnicianNames = async (technicians: Technician[]) => {
    const technicianIds = technicians.map((tech) => tech.technicianId);

    try {
      const response = await fetch("/api/technicians/getTechnicianNames", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ technicianIds }),
      });

      if (!response.ok) {
        throw new Error("Erro ao buscar nomes dos técnicos");
      }

      const data = await response.json();

      // Mapear os nomes dos técnicos
      return technicians.map((tech) => {
        const user = data.find(
          (user: { id: string }) =>
            String(user.id) === String(tech.technicianId),
        );
        return {
          ...tech,
          name: user?.displayName || `Técnico ${tech.technicianId}`,
        }; // Fallback com ID
      });
    } catch (error) {
      console.error("Erro ao buscar nomes dos técnicos:", error);
      // Retorna os técnicos com fallback para o ID
      return technicians.map((tech) => ({
        ...tech,
        name: `Técnico ${tech.technicianId}`,
      }));
    }
  };

  // Função para verificar escolas assinadas
  const checkSignedOrders = async (demands: Demand[]) => {
    try {
      // Extrai nomes de escolas das demandas (assumindo que o title é "Demanda - NomeDaEscola")
      const schoolNames = demands.map((d) => d.title.replace("Demanda - ", ""));

      const response = await fetch("/api/demands/check-signed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ schoolNames }),
      });

      if (!response.ok) throw new Error("Erro ao verificar assinaturas");

      const data = await response.json();
      setSignedSchools(data.signedSchools);
    } catch (error) {
      console.error("Erro ao verificar ordens assinadas:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Buscar demandas
        const demandsResponse = await fetch("/api/daily-demands");
        if (!demandsResponse.ok) {
          throw new Error("Erro ao buscar demandas do dia");
        }
        const demandsResult = await demandsResponse.json();
        setDemands(demandsResult.data || []);

        // Verificar assinaturas
        await checkSignedOrders(demandsResult.data || []);

        // Buscar técnicos alocados (código existente)
        const techniciansResponse = await fetch("/api/technicians/allocation");
        if (!techniciansResponse.ok) {
          throw new Error("Erro ao buscar técnicos");
        }
        const techniciansResult = await techniciansResponse.json();

        setBaseTechnicians(
          await fetchTechnicianNames(techniciansResult.baseTechnicians || [])
        );
        setVisitTechnicians(
          await fetchTechnicianNames(techniciansResult.visitTechnicians || [])
        );
        setOffTechnicians(
          await fetchTechnicianNames(techniciansResult.offTechnicians || [])
        );
      } catch (error) {
        console.error("Erro:", error);
        setError(error instanceof Error ? error.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar esta demanda?")) return;

    try {
      const response = await fetch(`/api/daily-demands/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao apagar a demanda");
      }

      setDemands((prev) => prev.filter((demand) => demand.id !== id));
      alert("Demanda apagada com sucesso!");
    } catch (error) {
      console.error("Erro ao apagar demanda:", error);
      alert("Erro ao apagar a demanda. Tente novamente.");
    }
  };

  const handleDeleteAllocation = async () => {
    if (!confirm("Tem certeza que deseja APAGAR TODA A ESCALA do dia atual?"))
      return;

    try {
      const response = await fetch("/api/technicians/delete-allocation", {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao apagar escala");

      // Atualiza os estados para vazio
      setBaseTechnicians([]);
      setVisitTechnicians([]);
      setOffTechnicians([]);

      alert("Escala do dia apagada com sucesso!");
    } catch (error) {
      console.error("Erro ao apagar escala:", error);
      alert("Erro ao apagar escala. Tente novamente.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-4xl text-center">
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-4xl text-center text-red-500">
          <h1 className="text-2xl font-bold mb-4">Erro</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Demandas do Dia - {formattedDate}
          </h1>
          <button
            onClick={handleDeleteAllocation}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            title="Apagar toda a escala do dia"
          >
            Apagar Escala do Dia
          </button>
        </div>

        {/* Escala de técnicos */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Técnicos na Base
          </h2>
          {baseTechnicians.length > 0 ? (
            <ul className="list-disc list-inside text-gray-800">
              {baseTechnicians.map((tech) => (
                <li key={tech.id}>{tech.name || tech.technicianId}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">
              Nenhum técnico alocado na base hoje.
            </p>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Técnicos em Visita Técnica
          </h2>
          {visitTechnicians.length > 0 ? (
            <ul className="list-disc list-inside text-gray-800">
              {visitTechnicians.map((tech) => (
                <li key={tech.id}>{tech.name || tech.technicianId}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">
              Nenhum técnico em visita técnica hoje.
            </p>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Técnicos de Folga
          </h2>
          {offTechnicians.length > 0 ? (
            <ul className="list-disc list-inside text-gray-800">
              {offTechnicians.map((tech) => (
                <li key={tech.id}>{tech.name || tech.technicianId}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Nenhum técnico de folga hoje.</p>
          )}
        </div>

        {demands.length > 0 ? (
          <ul className="space-y-4">
            {demands.map((demand) => (
              <li
                key={demand.id}
                className="p-4 bg-gray-100 rounded-lg shadow-sm text-gray-800 flex justify-between items-center"
              >
                <div>
                  <h2 className="font-bold">{demand.title}</h2>
                  <p className="mt-2 whitespace-pre-line">
                    {demand.description}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(demand.createdAt).toLocaleTimeString("pt-BR")}
                  </p>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleDelete(demand.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Apagar"
                  >
                    <Trash size={24} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center">
            Nenhuma demanda registrada hoje.
          </p>
        )}
      </div>
    </div>
  );
};

export default DailyDemands;
