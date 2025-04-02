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

interface DecodedToken {
  userId: string;
  name: string;
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { setUserName } = useHeaderContext();
  const [userName, setUserNameState] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded: DecodedToken = jwtDecode<DecodedToken>(token);
      setUserName(decoded.name);
      setUserNameState(decoded.name);
    }
  }, [setUserName]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center w-full mb-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl mb-8">Dashboard</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl">
            <div
              onClick={() => handleNavigate("/items")}
              className="cursor-pointer bg-blue-400 hover:bg-blue-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
            >
              <PlusCircle size={48} />
              <p className="mt-2 text-lg">Cadastrar Itens</p>
            </div>
            <div
              onClick={() => handleNavigate("/device-list")}
              className="cursor-pointer bg-green-400 hover:bg-green-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
            >
              <List size={48} />
              <p className="mt-2 text-lg">Ver Itens Cadastrados</p>
            </div>
            <div
              onClick={() => handleNavigate("/fill-pdf-form")}
              className="cursor-pointer bg-red-400 hover:bg-red-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
            >
              <FileText size={48} />
              <p className="mt-2 text-lg">Preencher OS</p>
            </div>
            <div
              onClick={() => handleNavigate("/statistics")}
              className="cursor-pointer bg-purple-400 hover:bg-purple-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
            >
              <ChartBar size={48} />
              <p className="mt-2 text-lg">Estatísticas de OS</p>
            </div>
            <div
              onClick={() => handleNavigate("/schools")}
              className="cursor-pointer bg-orange-400 hover:bg-pink-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
            >
              <GraduationCap size={48} />
              <p className="mt-2 text-lg">Todas as Escolas</p>
            </div>
            <div
              onClick={() => handleNavigate("/os-list")}
              className="cursor-pointer bg-indigo-400 hover:bg-indigo-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
            >
              <ClipboardText size={45} />
              <p className="mt-2 text-lg">OS assinadas ou pendentes</p>
            </div>
            <div
              onClick={() => handleNavigate("/printers")}
              className="cursor-pointer bg-teal-400 hover:bg-teal-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
            >
              <Printer size={48} />
              <p className="mt-2 text-lg">Todas as Impressoras</p>
            </div>
            {/* Novo card para Memorandos */}
            <div
              onClick={() => handleNavigate("/memorandums")}
              className="cursor-pointer bg-yellow-400 hover:bg-yellow-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
            >
              <FileText size={48} />
              <p className="mt-2 text-lg">Todos os Memorandos</p>
            </div>
            {/* Novo card para Escalas */}
            <div
              onClick={() => handleNavigate("/scales")}
              className="cursor-pointer bg-gray-400 hover:bg-gray-700 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
            >
              <ChartBar size={48} />
              <p className="mt-2 text-lg">Escalas</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
