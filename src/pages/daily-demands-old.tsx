import React, { useEffect, useState } from "react";
import { Trash, Pencil, ClipboardText, CheckCircle, ArrowClockwise } from "phosphor-react"; // Ícones do Phosphor Icons
import DemandModal from "../components/DemandModal";
import { supabase } from "@/lib/supabaseClient"; // Importa o cliente Supabase
import { jwtDecode } from "jwt-decode"; // Para decodificar o token
import { useRouter } from "next/router";

interface Demand {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  osStatus?: 'pending' | 'created' | 'signed';
  numeroOs?: string;
}

interface Technician {
  id: string;
  technicianId: number;
  name?: string;
}

const DailyDemands: React.FC = () => {
  const router = useRouter();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [baseTechnicians, setBaseTechnicians] = useState<Technician[]>([]); // Técnicos na base
  const [visitTechnicians, setVisitTechnicians] = useState<Technician[]>([]); // Técnicos em visita técnica
  const [offTechnicians, setOffTechnicians] = useState<Technician[]>([]); // Técnicos de folga
  const [signedSchools, setSignedSchools] = useState<string[]>([]); // Escolas assinadas
  const [schools, setSchools] = useState<{ id: number; name: string; address: string; district: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // Estado para armazenar a role do usuário

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

  // Função para verificar status das OS
  const checkOSStatus = async (demands: Demand[]) => {
    try {
      const demandIds = demands.map(d => d.id);
      
      const response = await fetch("/api/demands/check-os-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ demandIds }),
      });

      if (!response.ok) throw new Error("Erro ao verificar status das OS");

      const data = await response.json();
      
      // Atualizar demandas com status das OS
      const updatedDemands = demands.map(demand => {
        const osInfo = data.demandStatus.find((status: any) => status.demandId === Number(demand.id));
        return {
          ...demand,
          osStatus: osInfo?.status || 'pending',
          numeroOs: osInfo?.numeroOs
        };
      });
      
      setDemands(updatedDemands);
    } catch (error) {
      console.error("Erro ao verificar status das OS:", error);
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

        // Verificar status das OS
        await checkOSStatus(demandsResult.data || []);

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

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await fetch("/api/schools");
        if (!response.ok) throw new Error("Erro ao buscar escolas");
        const data = await response.json();
        setSchools(data);
      } catch (error) {
        console.error("Erro ao buscar escolas:", error);
      }
    };

    fetchSchools();
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
        const { data: { user }, error } = await supabase.auth.getUser();

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

  const handleAddDemand = () => {
    setEditingDemand(null); // Limpa os dados para adicionar uma nova demanda
    setIsModalOpen(true);
  };

  const handleEditDemand = (demand: Demand) => {
    setEditingDemand(demand); // Define os dados da demanda para edição
    setIsModalOpen(true);
  };

  const handleSaveDemand = async (demand: { id?: number; schoolId: number; demand: string }) => {
    try {
      if (demand.id) {
        const response = await fetch(`/api/school-demands`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(demand),
        });

        if (!response.ok) throw new Error("Erro ao editar a demanda");

        setDemands((prev) =>
          prev.map((d) =>
            d.id === String(demand.id) ? { ...d, ...demand, id: String(demand.id) } : d
          )
        );
      } else {
        const response = await fetch("/api/school-demands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(demand),
        });

        if (!response.ok) throw new Error("Erro ao adicionar a demanda");

        const newDemand = await response.json();
        setDemands((prev) => [...prev, newDemand]);
      }
    } catch (error) {
      console.error("Erro ao salvar demanda:", error);
      alert("Erro ao salvar a demanda. Tente novamente.");
    }
  };

  const handleCreateOS = (demand: Demand) => {
    const schoolName = demand.title.replace("Demanda - ", "");
    const school = schools.find(s => s.name === schoolName);
    
    // Redirecionar para a página de criar OS externa com os dados da escola
    if (school) {
      router.push(`/fill-pdf-form-2?schoolName=${encodeURIComponent(school.name)}&demand=${encodeURIComponent(demand.description)}`);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'signed': return 'bg-green-50 border-green-500';
      case 'created': return 'bg-yellow-50 border-yellow-500';
      default: return 'bg-gray-50 border-gray-400';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'signed': return <CheckCircle size={20} className="text-green-600" />;
      case 'created': return <ClipboardText size={20} className="text-yellow-600" />;
      default: return <ClipboardText size={20} className="text-gray-400" />;
    }
  };

  const refreshOSStatus = async () => {
    if (demands.length > 0) {
      await checkOSStatus(demands);
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
      <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8 w-full max-w-md sm:max-w-4xl">
        <div className="flex flex-col justify-between items-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 text-center">
            Demandas do Dia - {formattedDate}
          </h1>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-4">
            {/* Botão "Adicionar Demanda" visível apenas para ADMTOTAL e ADMIN */}
            {(userRole === "ADMTOTAL" || userRole === "ADMIN") && (
              <button
                onClick={handleAddDemand}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 w-full sm:w-auto"
              >
                Adicionar Demanda
              </button>
            )}

            {/* Botão "Apagar Escala do Dia" visível apenas para ADMTOTAL e ADMIN */}
            {(userRole === "ADMTOTAL" || userRole === "ADMIN") && (
              <button
                onClick={handleDeleteAllocation}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors w-full sm:w-auto"
                title="Apagar toda a escala do dia"
              >
                Apagar Escala do Dia
              </button>
            )}

            {/* Botão para atualizar status das OS */}
            <button
              onClick={refreshOSStatus}
              className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors w-full sm:w-auto flex items-center gap-2"
              title="Atualizar status das OS"
            >
              <ArrowClockwise size={16} />
              Atualizar Status
            </button>
          </div>
        </div>

        {/* Escala de técnicos */}
        <div className="mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4">
            Técnicos na Base
          </h2>
          {baseTechnicians.length > 0 ? (
            <ul className="list-disc list-inside text-gray-800 space-y-2">
              {baseTechnicians.map((tech) => (
                <li key={tech.id}>{tech.name || tech.technicianId}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Nenhum técnico alocado na base hoje.</p>
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
          <>
            <div className="mb-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-50 border-l-4 border-gray-400 rounded-sm"></div>
                <span>Sem OS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-sm"></div>
                <span>OS Criada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-50 border-l-4 border-green-500 rounded-sm"></div>
                <span>OS Assinada</span>
              </div>
            </div>
            
            <ul className="space-y-4">
              {demands.map((demand) => {
                const schoolName = demand.title.replace("Demanda - ", "");
                const school = schools.find((s) => s.name === schoolName);

                return (
                  <li key={demand.id} className={`p-4 rounded-lg shadow-sm text-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center border-l-4 transition-all ${getStatusColor(demand.osStatus)}`}>
                    <div className="w-full sm:w-auto">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="font-bold text-sm sm:text-base">
                          {school ? `${school.district} Distrito - ${school.name}` : demand.title}
                        </h2>
                        {getStatusIcon(demand.osStatus)}
                        {demand.osStatus === 'signed' && (
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-semibold">
                            ✓ OS Assinada
                          </span>
                        )}
                        {demand.osStatus === 'created' && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                            📝 OS Criada
                          </span>
                        )}
                        {demand.osStatus === 'pending' && (
                          <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full font-semibold">
                            ⏳ Pendente
                          </span>
                        )}
                      </div>
                      {school && (
                        <span className="block text-xs text-gray-500 mb-1">
                          {school.address}
                        </span>
                      )}
                      <p className="mt-2 text-sm sm:text-base whitespace-pre-line">
                        {demand.description}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-2">
                        {new Date(demand.createdAt).toLocaleTimeString("pt-BR")}
                      </p>
                      {demand.numeroOs && (
                        <p className="text-xs text-blue-600 mt-1 font-semibold">
                          📄 OS: {demand.numeroOs}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2 mt-4 sm:mt-0">
                      {demand.osStatus === 'pending' && (
                        <button
                          onClick={() => handleCreateOS(demand)}
                          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs flex items-center gap-1 transition-colors"
                          title="Preencher OS"
                        >
                          <ClipboardText size={16} />
                          Preencher OS
                        </button>
                      )}
                      <button
                        onClick={() => handleEditDemand(demand)}
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(demand.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Apagar"
                      >
                        <Trash size={20} />
                      </button>
                    </div>
                  </li>
                );
            })}
            </ul>
          </>
        ) : (
          <p className="text-gray-500 text-center">
            Nenhuma demanda registrada hoje.
          </p>
        )}
      </div>

      {/* Modal de Adicionar/Editar Demanda */}
      <DemandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDemand}
        initialData={
          editingDemand
            ? {
              id: Number(editingDemand.id),
              schoolId: schools.find((school) =>
                editingDemand.title.includes(school.name)
              )?.id || 0,
              demand: editingDemand.description,
            }
            : undefined
        }
        schools={schools}
      />
    </div>
  );
};

export default DailyDemands;
