import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users } from "phosphor-react";
import React, { useEffect, useState } from "react";
import Link from 'next/link';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface OS {
  id: number;
  unidadeEscolar: string;
  tecnicoResponsavel: string;
  numeroOs: string;
  data: string;
  hora: string;
  status?: string;
}

const OSList: React.FC = () => {
  const [pendentes, setPendentes] = useState<OS[]>([]);
  const [confirmadas, setConfirmadas] = useState<OS[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPagePendentes, setCurrentPagePendentes] = useState(1);
  const [currentPageConfirmadas, setCurrentPageConfirmadas] = useState(1);
  const itemsPerPage = 5; // Número de itens por página

  useEffect(() => {
    const fetchOS = async () => {
      try {
        const response = await fetch("/api/get-os");
        if (!response.ok) {
          throw new Error("Erro ao buscar OS");
        }
        const data = await response.json();

        // Ordenar as OS pendentes e confirmadas pelas mais recentes
        const sortedPendentes = data.pendentes.sort((a: OS, b: OS) => new Date(b.data).getTime() - new Date(a.data).getTime());
        const sortedConfirmadas = data.confirmadas.sort((a: OS, b: OS) => new Date(b.data).getTime() - new Date(a.data).getTime());

        setPendentes(sortedPendentes);
        setConfirmadas(sortedConfirmadas);
      } catch (error) {
        console.error("Erro ao buscar OS:", error);
      }
    };

    fetchOS();
  }, []);

  const filteredPendentes = pendentes.filter(os =>
    os.unidadeEscolar.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.tecnicoResponsavel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.numeroOs.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.data.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.hora.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredConfirmadas = confirmadas.filter(os =>
    os.unidadeEscolar.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.tecnicoResponsavel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.numeroOs.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.data.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.hora.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">Lista de OS</h1>
      <div className="mb-8 text-center">
        <input
          type="text"
          placeholder="Pesquisar OS"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border border-gray-400 dark:bg-zinc-200 rounded w-full"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col text-center border bg-white dark:bg-gray-900 border-gray-600 rounded-xl p-6">
          <h2 className="text-3xl font-thin mb-4">OS Pendentes</h2>
          <ul className="space-y-4">
            {filteredPendentes.map((os) => (
              <li key={os.id} className="transform transition-transform hover:scale-105">
                <Link href={`/os/${os.id}?status=pendente`}>
                  <Card className="bg-yellow-500 hover:bg-yellow-700 text-white rounded-lg shadow-lg cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-center flex justify-center items-center gap-3 p-4 bg-zinc-800 rounded-t-lg">
                        <GraduationCap size={30} />{os.unidadeEscolar}
                      </CardTitle>
                      <CardDescription>
                        <strong className="text-gray-300 flex justify-center items-center gap-2 text-base">
                          <Users />{os.tecnicoResponsavel}
                        </strong>
                      </CardDescription>
                      <CardContent className="flex gap-6 items-center justify-center">
                        <p><strong>Número OS:</strong> {os.numeroOs}</p>
                        <p><strong>Data:</strong> {os.data}</p>
                        <p><strong>Hora:</strong> {os.hora}</p>
                      </CardContent>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col text-center border bg-white dark:bg-gray-900 border-gray-600 rounded-xl p-6">
          <h2 className="text-3xl font-thin mb-4">OS Confirmadas</h2>
          <ul className="space-y-4">
            {filteredConfirmadas.map((os) => (
              <li key={os.id} className="transform transition-transform hover:scale-105">
                <Link href={`/os/${os.id}?status=confirmada`}>
                  <Card className="bg-green-500 hover:bg-green-700 text-white rounded-lg shadow-lg cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-center flex justify-center items-center gap-3 p-4 bg-zinc-800 rounded-t-lg">
                        <GraduationCap size={30} />{os.unidadeEscolar}
                      </CardTitle>
                      <CardDescription>
                        <strong className="text-gray-300 flex justify-center items-center gap-2 text-base">
                          <Users />{os.tecnicoResponsavel}
                        </strong>
                      </CardDescription>
                      <CardContent className="flex gap-6 items-center justify-center">
                        <p><strong>Número OS:</strong> {os.numeroOs}</p>
                        <p><strong>Data:</strong> {os.data}</p>
                        <p><strong>Hora:</strong> {os.hora}</p>
                      </CardContent>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OSList;