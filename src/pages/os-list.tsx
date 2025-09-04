import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, FilePdf } from "phosphor-react";
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

interface OSAntiga {
  escola: string;
  pdfUrl: string;
}

const OSList: React.FC = () => {
  const [antigas, setAntigas] = useState<OSAntiga[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    // OS Antigas - Apenas nome da escola e link do PDF
    // Carrega do JSON ao invés de hardcode
    const loadOSAntigas = async () => {
      try {
        const response = await fetch('/os-antigas.json');
        const osAntigas: OSAntiga[] = await response.json();
        setAntigas(osAntigas);
        console.log('✅ Carregadas', osAntigas.length, 'escolas do JSON');
      } catch (error) {
        console.error('❌ Erro ao carregar JSON:', error);
      }
    };
    
    loadOSAntigas();
  }, []);

  const filteredAntigas = antigas.filter(os =>
    os.escola.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-8">
        {/* Header moderno */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Arquivo Digital
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Acesso rápido aos documentos das instituições
          </p>
        </div>

        {/* Barra de pesquisa moderna */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <GraduationCap className="h-6 w-6 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por escola..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            />
          </div>
        </div>

        {/* Grid de cards moderno */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAntigas.map((os, index) => (
            <div 
              key={index} 
              className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2"
              onClick={() => window.open(os.pdfUrl, '_blank')}
            >
              <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300">
                {/* Gradiente de fundo */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Conteúdo do card */}
                <div className="relative z-10">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                    <FilePdf size={32} className="text-white" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white text-center leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {os.escola}
                  </h3>
                  
                  <div className="mt-4 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span>Clique para abrir</span>
                  </div>
                </div>

                {/* Efeito de borda animada */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Mensagem quando não há resultados */}
        {filteredAntigas.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <GraduationCap size={40} className="text-gray-500" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Nenhuma escola encontrada
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              Tente buscar por outro termo
            </p>
          </div>
        )}

        {/* Footer informativo */}
        <div className="text-center mt-16 p-8 bg-white/50 dark:bg-slate-800/50 rounded-2xl backdrop-blur-sm">
          <p className="text-gray-600 dark:text-gray-400">
            Total de {antigas.length} instituições no arquivo digital
          </p>
        </div>
      </div>
    </div>
  );
};

export default OSList;