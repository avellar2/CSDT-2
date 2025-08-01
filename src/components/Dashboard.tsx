import { useRouter } from "next/router";
import {
  PlusCircle,
  List,
  FileText,
  ChartBar,
  GraduationCap,
  ClipboardText,
  Printer,
} from "phosphor-react";
import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Header } from "./Header";
import { useHeaderContext } from "../context/HeaderContext";
import { supabase } from "@/lib/supabaseClient";

interface DecodedToken {
  userId: string;
  name: string;
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { setUserName } = useHeaderContext();
  const [userName, setUserNameState] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // Estado para armazenar a role do usuário
  const [isLoading, setIsLoading] = useState(true); // Estado para controlar o carregamento
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null); // Estado para armazenar o ID do Supabase

  // Lógica para buscar o usuário do Supabase e consultar a role no Prisma
  useEffect(() => {
    const fetchSupabaseUser = async () => {
      try {
        // 1. Pega o usuário logado no Supabase
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          console.error("Erro ao buscar usuário no Supabase:", error);
          setIsLoading(false);
          return;
        }

        console.log("ID do usuário no Supabase:", user.id);
        setSupabaseUserId(user.id); // Guarda o ID do usuário

        // 2. Consulta a role no Prisma usando o ID do Supabase
        const response = await fetch(`/api/get-role?userId=${user.id}`);
        const data = await response.json();

        if (response.ok && data.role) {
          setUserRole(data.role); // Atualiza a role do usuário
          console.log("Role do usuário:", data.role);
        } else {
          console.error("Erro ao buscar role:", data.error);
        }
      } catch (err) {
        console.error("Erro na conexão com Supabase/Prisma:", err);
      } finally {
        setIsLoading(false); // Define que o carregamento foi concluído
      }
    };

    fetchSupabaseUser();
  }, []);

  // Lógica existente para buscar o token e decodificar
  useEffect(() => {
    const fetchRole = async (userId: string) => {
      try {
        const response = await fetch(`/api/get-role?userId=${userId}`);
        const data = await response.json();
        console.log("Resposta do fetchRole:", data);
        if (response.ok) {
          setUserRole(data.role); // Define a role do usuário
        } else {
          console.error("Erro ao buscar a role:", data.error);
        }
      } catch (error) {
        console.error("Erro ao buscar a role:", error);
      } finally {
        setIsLoading(false); // Define que o carregamento foi concluído
      }
    };

    const token = localStorage.getItem("token");
    if (token) {
      const decoded: DecodedToken = jwtDecode<DecodedToken>(token);
      console.log("Decoded Token:", decoded); // Verifica o token decodificado
      setUserName(decoded.name);
      setUserNameState(decoded.name);
      fetchRole(decoded.userId); // Busca a role do usuário
    } else {
      console.log("Token não encontrado no localStorage.");
      setIsLoading(false);
    }
  }, [setUserName]);

  const handleLogout = () => {
    supabase.auth.signOut(); // Faz logout no Supabase
    localStorage.removeItem("token");
    router.push("/login");
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  if (isLoading) {
    return <div>Carregando...</div>; // Exibe um estado de carregamento enquanto os dados não são carregados
  }

  console.log("User Role:", userRole); // Verifica o valor de userRole

  return (
    <>
      <div className="flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center w-full mb-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl mb-8">Dashboard</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl">
            {/* Card "Cadastrar Itens" - ADMTOTAL, ADMIN, TECH */}
            {(userRole === "ADMTOTAL" ||
              userRole === "ADMIN" ||
              userRole === "TECH") && (
                <div
                  onClick={() => handleNavigate("/items")}
                  className="cursor-pointer bg-blue-400 hover:bg-blue-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <PlusCircle size={48} />
                  <p className="mt-2 text-lg">Cadastrar Itens</p>
                </div>
              )}

            {/* Card "Ver Itens Cadastrados" - ADMTOTAL, ADMIN, TECH, ONLYREAD */}
            {(userRole === "ADMTOTAL" ||
              userRole === "ADMIN" ||
              userRole === "TECH" ||
              userRole === "ONLYREAD") && (
                <div
                  onClick={() => handleNavigate("/device-list")}
                  className="cursor-pointer bg-green-400 hover:bg-green-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <List size={48} />
                  <p className="mt-2 text-lg">Ver Itens Cadastrados</p>
                </div>
              )}

            {/* Card "Preencher OS" - ADMTOTAL, TECH */}
            {/* {(userRole === "ADMTOTAL" || userRole === "TECH") && (
              <div
                onClick={() => handleNavigate("/fill-pdf-form")}
                className="cursor-pointer bg-red-400 hover:bg-red-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
              >
                <FileText size={48} />
                <p className="mt-2 text-lg">Preencher OS</p>
              </div>
            )} */}

            {/* Card "Preencher OS 2" - ADMTOTAL, TECH */}
            {(userRole === "ADMTOTAL" || userRole === "TECH") && (
              <div
                onClick={() => handleNavigate("/fill-pdf-form-2")}
                className="cursor-pointer bg-red-500 hover:bg-red-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
              >
                <FileText size={48} />
                <p className="mt-2 text-lg">Preencher OS</p>
              </div>
            )}

            {/* Card "Estatísticas de OS" - ADMTOTAL, ADMIN */}
            {(userRole === "ADMTOTAL" || userRole === "ADMIN") && (
              <div
                onClick={() => handleNavigate("/statistics")}
                className="cursor-pointer bg-purple-400 hover:bg-purple-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
              >
                <ChartBar size={48} />
                <p className="mt-2 text-lg">Estatísticas de OS</p>
              </div>
            )}

            {/* Card "Todas as Escolas" - ADMTOTAL, ADMIN, TECH, ONLYREAD */}
            {(userRole === "ADMTOTAL" ||
              userRole === "ADMIN" ||
              userRole === "TECH" ||
              userRole === "ONLYREAD") && (
                <div
                  onClick={() => handleNavigate("/schools")}
                  className="cursor-pointer bg-orange-400 hover:bg-pink-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <GraduationCap size={48} />
                  <p className="mt-2 text-lg">Todas as Escolas</p>
                </div>
              )}

            {/* Card "OS assinadas ou pendentes" - ADMTOTAL, ADMIN, TECH */}
            {(userRole === "ADMTOTAL" ||
              userRole === "ADMIN" ||
              userRole === "TECH") && (
                <div
                  onClick={() => handleNavigate("/os-list")}
                  className="cursor-pointer bg-indigo-400 hover:bg-indigo-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <ClipboardText size={45} />
                  <p className="mt-2 text-lg">OS Externas (Antigo)</p>
                </div>
              )}

            {/* Card "OS Externas (Novo)" - ADMTOTAL, ADMIN, TECH */}
            {(userRole === "ADMTOTAL" || userRole === "ADMIN" || userRole === "TECH") && (
              <div
                onClick={() => handleNavigate("/os-externas-list")}
                className="cursor-pointer bg-emerald-500 hover:bg-emerald-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
              >
                <ClipboardText size={48} />
                <p className="mt-2 text-lg">OS Externas (Novo)</p>
              </div>
            )}

            {/* Card "Todas as Impressoras" - ADMTOTAL, ADMIN, TECH */}
            {(userRole === "ADMTOTAL" ||
              userRole === "ADMIN" ||
              userRole === "TECH") && (
                <div
                  onClick={() => handleNavigate("/printers")}
                  className="cursor-pointer bg-teal-400 hover:bg-teal-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <Printer size={48} />
                  <p className="mt-2 text-lg">Todas as Impressoras</p>
                </div>
              )}

            {/* Card "Todos os Memorandos" - ADMTOTAL, ADMIN */}
            {(userRole === "ADMTOTAL" || userRole === "ADMIN") && (
              <div
                onClick={() => handleNavigate("/memorandums")}
                className="cursor-pointer bg-yellow-400 hover:bg-yellow-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
              >
                <FileText size={48} />
                <p className="mt-2 text-lg">Todos os Memorandos</p>
              </div>
            )}

            {/* Card "Todos os Memorandos (Novo)" - ADMTOTAL, ADMIN */}
            {(userRole === "ADMTOTAL" || userRole === "ADMIN") && (
              <div
                onClick={() => handleNavigate("/new-memorandums")}
                className="cursor-pointer bg-orange-500 hover:bg-orange-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
              >
                <FileText size={48} />
                <p className="mt-2 text-lg">Todos os Memorandos (Novo)</p>
              </div>
            )}

            {/* Card "Escalas" - ADMTOTAL, ADMIN */}
            {(userRole === "ADMTOTAL" || userRole === "ADMIN") && (
              <div
                onClick={() => handleNavigate("/scales")}
                className="cursor-pointer bg-gray-400 hover:bg-gray-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
              >
                <ChartBar size={48} />
                <p className="mt-2 text-lg">Escalas</p>
              </div>
            )}

            {/* Card "Demanda do Dia" - ADMTOTAL, ADMIN, TECH */}
            {(userRole === "ADMTOTAL" ||
              userRole === "ADMIN" ||
              userRole === "TECH") && (
                <div
                  onClick={() => handleNavigate("/daily-demands")}
                  className="cursor-pointer bg-cyan-400 hover:bg-cyan-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <ClipboardText size={48} />
                  <p className="mt-2 text-lg">Demanda do Dia</p>
                </div>
              )}

            {/* Card "Criar OS interna" - ADMTOTAL, ADMIN */}
            {(userRole === "ADMTOTAL" || userRole === "ADMIN") && (
              <div
                onClick={() => handleNavigate("/create-internal-os")}
                className="cursor-pointer bg-pink-400 hover:bg-pink-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
              >
                <FileText size={48} />
                <p className="mt-2 text-lg">Criar OS interna</p>
              </div>
            )}

            {/* Card "Demandas Internas" - apenas TECH */}
            {userRole === "TECH" && (
              <div
                onClick={() => handleNavigate("/internal-demands")}
                className="cursor-pointer bg-yellow-500 hover:bg-yellow-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
              >
                <ClipboardText size={48} />
                <p className="mt-2 text-lg">Demandas Internas</p>
              </div>
            )}



            {/* Card "CHADA" - ADMTOTAL, ADMIN, TECH */}
            {(userRole === "ADMTOTAL" || userRole === "ADMIN" || userRole === "TECH") && (
              <div
                onClick={() => handleNavigate("/chada")}
                className="cursor-pointer bg-gray-500 hover:bg-gray-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
              >
                <ClipboardText size={48} />
                <p className="mt-2 text-lg">CHADA</p>
              </div>
            )}

            {/* Card "Locados" - ADMTOTAL, ADMIN, TECH, ONLYREAD */}
            {(userRole === "ADMTOTAL" ||
              userRole === "ADMIN" ||
              userRole === "TECH" ||
              userRole === "ONLYREAD") && (
                <div
                  onClick={() => handleNavigate("/locados")}
                  className="cursor-pointer bg-lime-500 hover:bg-lime-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <List size={48} />
                  <p className="mt-2 text-lg">Locados</p>
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
