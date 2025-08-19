import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { jwtDecode } from "jwt-decode";
import { 
  Trash, 
  ArrowClockwise, 
  Plus,
  Users, 
  User, 
  Coffee,
  CalendarCheck,
  Funnel
} from "phosphor-react";

// Components
import DemandModal from "../components/DemandModal";
import DemandCalendar from "../components/DemandCalendar";
import DemandCard from "../components/DemandCard";
import DemandSkeleton from "../components/DemandSkeleton";

// Types
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

interface School {
  id: number;
  name: string;
  address: string;
  district: string;
}

const DailyDemands: React.FC = () => {
  const router = useRouter();
  
  // Core state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [demands, setDemands] = useState<Demand[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Technician state
  const [baseTechnicians, setBaseTechnicians] = useState<Technician[]>([]);
  const [visitTechnicians, setVisitTechnicians] = useState<Technician[]>([]);
  const [offTechnicians, setOffTechnicians] = useState<Technician[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);

  // Format date for API
  const formatDateForAPI = (date: Date) => date.toISOString().split('T')[0];
  
  // Format date for display
  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric", 
      month: "long",
      year: "numeric",
    });
  };

  // Fetch technician names
  const fetchTechnicianNames = useCallback(async (technicians: Technician[]) => {
    if (!technicians.length) return [];
    
    const technicianIds = technicians.map(tech => tech.technicianId);

    try {
      const response = await fetch("/api/technicians/getTechnicianNames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianIds }),
      });

      if (!response.ok) throw new Error("Erro ao buscar nomes dos técnicos");

      const data = await response.json();
      return technicians.map(tech => ({
        ...tech,
        name: data.find((user: any) => String(user.id) === String(tech.technicianId))?.displayName 
              || `Técnico ${tech.technicianId}`,
      }));
    } catch (error) {
      console.error("Erro ao buscar nomes dos técnicos:", error);
      return technicians.map(tech => ({ ...tech, name: `Técnico ${tech.technicianId}` }));
    }
  }, []);

  // Check OS status
  const checkOSStatus = useCallback(async (demandsToCheck: Demand[], targetDate?: Date) => {
    if (!demandsToCheck.length) return;
    
    try {
      const demandIds = demandsToCheck.map(d => d.id);
      
      const response = await fetch("/api/demands/check-os-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          demandIds,
          targetDate: targetDate ? formatDateForAPI(targetDate) : undefined
        }),
      });

      if (!response.ok) throw new Error("Erro ao verificar status das OS");

      const data = await response.json();
      
      const updatedDemands = demandsToCheck.map(demand => {
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
  }, []);

  // Fetch user role
  const fetchUserRole = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = jwtDecode<{ userId: string }>(token);
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) return;

      const response = await fetch(`/api/get-role?userId=${user.id}`);
      const data = await response.json();

      if (response.ok && data.role) {
        setUserRole(data.role);
      }
    } catch (error) {
      console.error("Erro ao buscar role do usuário:", error);
    }
  }, []);

  // Fetch data for selected date
  const fetchData = useCallback(async (date?: Date) => {
    const targetDate = date || selectedDate;
    setLoading(true);
    setError(null);

    try {
      // Fetch demands for date
      const demandsResponse = await fetch(
        `/api/daily-demands?date=${formatDateForAPI(targetDate)}`
      );
      
      if (!demandsResponse.ok) throw new Error("Erro ao buscar demandas");
      
      const demandsResult = await demandsResponse.json();
      const fetchedDemands = demandsResult.data || [];
      setDemands(fetchedDemands);

      // Check OS status
      if (fetchedDemands.length > 0) {
        await checkOSStatus(fetchedDemands, targetDate);
      }

      // Fetch technicians for any date
      const techniciansResponse = await fetch(
        `/api/technicians/allocation?date=${formatDateForAPI(targetDate)}`
      );
      
      if (techniciansResponse.ok) {
        const techniciansResult = await techniciansResponse.json();
        
        const [baseWithNames, visitWithNames, offWithNames] = await Promise.all([
          fetchTechnicianNames(techniciansResult.baseTechnicians || []),
          fetchTechnicianNames(techniciansResult.visitTechnicians || []),
          fetchTechnicianNames(techniciansResult.offTechnicians || [])
        ]);
        
        setBaseTechnicians(baseWithNames);
        setVisitTechnicians(visitWithNames);
        setOffTechnicians(offWithNames);
      } else {
        // Clear technician data if API fails
        setBaseTechnicians([]);
        setVisitTechnicians([]);
        setOffTechnicians([]);
      }

    } catch (error) {
      console.error("Erro:", error);
      setError(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, fetchTechnicianNames, checkOSStatus]);

  // Fetch schools
  const fetchSchools = useCallback(async () => {
    try {
      const response = await fetch("/api/schools");
      if (!response.ok) throw new Error("Erro ao buscar escolas");
      const data = await response.json();
      setSchools(data);
    } catch (error) {
      console.error("Erro ao buscar escolas:", error);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        fetchData(),
        fetchSchools(),
        fetchUserRole(),
      ]);
    };
    
    initializeData();
  }, []);

  // Refresh data when date changes
  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  // Event handlers
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCreateOS = (demand: Demand) => {
    const schoolName = demand.title.replace("Demanda - ", "");
    const school = schools.find(s => s.name === schoolName);
    
    if (school) {
      router.push(`/fill-pdf-form-2?schoolName=${encodeURIComponent(school.name)}&demand=${encodeURIComponent(demand.description)}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar esta demanda?")) return;

    try {
      const response = await fetch(`/api/daily-demands/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao apagar a demanda");

      setDemands(prev => prev.filter(demand => demand.id !== id));
    } catch (error) {
      console.error("Erro ao apagar demanda:", error);
      alert("Erro ao apagar a demanda. Tente novamente.");
    }
  };

  const handleDeleteAllocation = async () => {
    if (!confirm("Tem certeza que deseja APAGAR TODA A ESCALA do dia atual?")) return;

    try {
      const response = await fetch("/api/technicians/delete-allocation", {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao apagar escala");

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
    setEditingDemand(null);
    setIsModalOpen(true);
  };

  const handleEditDemand = (demand: Demand) => {
    setEditingDemand(demand);
    setIsModalOpen(true);
  };

  const handleSaveDemand = async (demand: { id?: number; schoolId: number; demand: string }) => {
    try {
      if (demand.id) {
        const response = await fetch("/api/school-demands", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(demand),
        });

        if (!response.ok) throw new Error("Erro ao editar a demanda");

        await fetchData(); // Refresh data
      } else {
        const response = await fetch("/api/school-demands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(demand),
        });

        if (!response.ok) throw new Error("Erro ao adicionar a demanda");

        await fetchData(); // Refresh data
      }
      
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar demanda:", error);
      alert("Erro ao salvar a demanda. Tente novamente.");
    }
  };

  // Computed values
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const hasTechnicians = baseTechnicians.length > 0 || visitTechnicians.length > 0 || offTechnicians.length > 0;

  const demandStats = useMemo(() => {
    const total = demands.length;
    const pending = demands.filter(d => d.osStatus === 'pending').length;
    const created = demands.filter(d => d.osStatus === 'created').length;
    const signed = demands.filter(d => d.osStatus === 'signed').length;
    
    return { total, pending, created, signed };
  }, [demands]);

  // Render
  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <DemandSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-4">Erro</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-3">
                <CalendarCheck size={28} className="text-blue-500" />
                Demandas Diárias
              </h1>
              <p className="text-gray-600 mt-1">
                {formatDateForDisplay(selectedDate)}
                {!isToday && " (Arquivo)"}
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {(userRole === "ADMTOTAL" || userRole === "ADMIN") && (
                <button
                  onClick={handleAddDemand}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus size={16} />
                  Adicionar Demanda
                </button>
              )}
              
              {isToday && (userRole === "ADMTOTAL" || userRole === "ADMIN") && (
                <button
                  onClick={handleDeleteAllocation}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash size={16} />
                  Apagar Escala
                </button>
              )}
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <ArrowClockwise size={16} className={refreshing ? "animate-spin" : ""} />
                Atualizar
              </button>
              
              {/* Debug button - temporary */}
              <button
                onClick={() => {
                  fetch('/api/debug-demands')
                    .then(r => r.json())
                    .then(data => {
                      console.log('🐛 Debug Info:', data);
                      const info = data.debug;
                      alert(`🐛 DEBUG INFO:
Total demandas: ${info.totalDemands}
Demandas hoje: ${info.todayDemands}
Servidor: ${info.serverTime}
Timezone: ${info.timezone}

Veja o console para mais detalhes!`);
                    })
                    .catch(err => {
                      console.error('Debug error:', err);
                      alert('Erro no debug: ' + err.message);
                    });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs"
              >
                🐛 Debug
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-800">{demandStats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-red-600">{demandStats.pending}</div>
            <div className="text-sm text-gray-600">Pendentes</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">{demandStats.created}</div>
            <div className="text-sm text-gray-600">OS Criadas</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{demandStats.signed}</div>
            <div className="text-sm text-gray-600">Assinadas</div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="xl:col-span-1">
            <DemandCalendar
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              demandDates={[]} // TODO: fetch dates with demands
            />
          </div>

          {/* Main content */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* Technician sections */}
            {hasTechnicians && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <TechnicianCard
                  title="Técnicos na Base"
                  icon={<Users size={20} className="text-blue-500" />}
                  technicians={baseTechnicians}
                />
                <TechnicianCard
                  title="Técnicos em Visita"
                  icon={<User size={20} className="text-green-500" />}
                  technicians={visitTechnicians}
                />
                <TechnicianCard
                  title="Técnicos de Folga"
                  icon={<Coffee size={20} className="text-orange-500" />}
                  technicians={offTechnicians}
                />
              </div>
            )}

            {/* Demands section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  Demandas {isToday ? "de Hoje" : "do Dia"}
                </h2>
                
                {/* Legend */}
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white border-l-4 border-gray-200 rounded-sm"></div>
                    <span className="text-gray-600">Sem OS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-sm"></div>
                    <span className="text-gray-600">OS Criada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-50 border-l-4 border-green-500 rounded-sm"></div>
                    <span className="text-gray-600">OS Assinada</span>
                  </div>
                </div>
              </div>

              {demands.length > 0 ? (
                <div className="space-y-4">
                  {demands.map((demand) => {
                    const schoolName = demand.title.replace("Demanda - ", "");
                    const school = schools.find(s => s.name === schoolName);

                    return (
                      <DemandCard
                        key={demand.id}
                        demand={demand}
                        school={school}
                        userRole={userRole}
                        onEdit={handleEditDemand}
                        onDelete={handleDelete}
                        onCreateOS={handleCreateOS}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Nenhuma demanda encontrada
                  </h3>
                  <p className="text-gray-500">
                    {isToday 
                      ? "Não há demandas registradas para hoje."
                      : "Não há demandas registradas para esta data."
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <DemandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDemand}
        initialData={
          editingDemand
            ? {
                id: Number(editingDemand.id),
                schoolId: schools.find(school =>
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

// Technician Card Component
interface TechnicianCardProps {
  title: string;
  icon: React.ReactNode;
  technicians: Technician[];
}

const TechnicianCard: React.FC<TechnicianCardProps> = ({ title, icon, technicians }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm">
    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
      {icon}
      {title}
    </h3>
    {technicians.length > 0 ? (
      <ul className="space-y-2">
        {technicians.map((tech) => (
          <li key={tech.id} className="text-gray-600 text-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            {tech.name || tech.technicianId}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-gray-500 text-sm">Nenhum técnico alocado</p>
    )}
  </div>
);

export default DailyDemands;