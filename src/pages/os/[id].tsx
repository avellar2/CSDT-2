import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Image from 'next/image';
import axios from 'axios';

interface OS {
  id: number;
  unidadeEscolar: string;
  tecnicoResponsavel: string;
  numeroOs: string;
  data: string;
  hora: string;
  status?: string;
  relatorio?: string;
  notebooksOutroLocal?: string;
  tabletsOutroLocal?: string;
  solicitacaoDaVisita?: string;
  pcsSieduca?: string;
  notebooksSieduca?: string;
  tabletsSieduca?: string;
  estabilizadoresSieduca?: string;
  naoHaSieduca?: string;
  dellSecretaria?: string;
  locadosSecretaria?: string;
  outrosSecretaria?: string;
  notebooksSecretaria?: string;
  tabletsSecretaria?: string;
  estabilizadoresSecretaria?: string;
  dellOutroLocal?: string;
  locadosOutroLocal?: string;
  outrosOutroLocal?: string;
  estabilizadoresOutroLocal?: string;
  naoHaOutroLocal?: string;
  redeBr?: string;
  internetNasEscolas?: string;
  educacaoConectada?: string;
  naoHaProvedor?: string;
  rack?: string;
  switchDevice?: string;
  roteador?: string;
  oki?: string;
  kyocera?: string;
  hp?: string;
  ricoh?: string;
  outrasImpressoras?: string;
  solucionado?: string;
  emailResponsavel?: string;
  fotosAntes?: string[];
  fotosDepois?: string[];
  nameAssigned?: string;
  cpfOrRegistration?: string;
}

const OSDetail: React.FC = () => {
  const router = useRouter();
  const { id, status } = router.query;
  const [os, setOs] = useState<OS | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && status) {
      const fetchOS = async () => {
        try {
          const response = await axios.get(`/api/os/${id}`, {
            params: { status },
          });

          setOs(response.data);
        } catch (error) {
          console.error('Erro ao buscar OS:', error);
          setError('Erro ao buscar OS. Por favor, tente novamente mais tarde.');
        }
      };

      fetchOS();
    }
  }, [id, status]);

  if (error) {
    return <div>{error}</div>;
  }

  if (!os) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center">Detalhes da OS</h1>
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg flex flex-col items-center">
        <h2 className="text-2xl sm:text-5xl font-bold mb-4 bg-blue-900 rounded-xl text-white p-2 sm:p-4 text-center">{os.unidadeEscolar}</h2>
        <p className='text-zinc-700 text-lg sm:text-xl text-left sm:text-center'><strong>Técnico Responsável:</strong> {os.tecnicoResponsavel}</p>
        <p className='text-zinc-700 text-lg sm:text-xl text-left sm:text-center'><strong>Número OS:</strong> {os.numeroOs}</p>
        <p className='text-zinc-700 text-lg sm:text-xl text-left sm:text-center'><strong>Assinatura:</strong> {os.nameAssigned}</p>
        <p className='text-zinc-700 text-lg sm:text-xl text-left sm:text-center'><strong>CPF/Matrícula:</strong> {os.cpfOrRegistration}</p>
        <p className='text-zinc-700 text-lg sm:text-xl text-left sm:text-center'><strong>Data:</strong> {os.data}</p>
        <p className='text-zinc-700 text-lg sm:text-xl text-left sm:text-center'><strong>Hora:</strong> {os.hora}</p>
        <p className='text-zinc-700 text-lg sm:text-xl text-left sm:text-center'><strong>Status:</strong> {os.status}</p>
        <p className='text-zinc-700 text-lg sm:text-xl text-left sm:text-center'><strong>Solicitação da Visita:</strong> {os.solicitacaoDaVisita}</p>
        <p className='text-zinc-700 text-lg sm:text-xl text-left sm:text-center w-full sm:w-72'><strong>Relatório:</strong> {os.relatorio}</p>

        <div className="overflow-x-auto mt-8 bg-red-500 w-full">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Categoria</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Notebooks Outro Local</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.notebooksOutroLocal}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Tablets Outro Local</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.tabletsOutroLocal}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">PCS Sieduca</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.pcsSieduca}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Notebooks Sieduca</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.notebooksSieduca}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Tablets Sieduca</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.tabletsSieduca}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Estabilizadores Sieduca</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.estabilizadoresSieduca}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Não Há Sieduca</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.naoHaSieduca}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Dell Secretaria</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.dellSecretaria}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Locados Secretaria</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.locadosSecretaria}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Outros Secretaria</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.outrosSecretaria}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Notebooks Secretaria</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.notebooksSecretaria}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Tablets Secretaria</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.tabletsSecretaria}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Estabilizadores Secretaria</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.estabilizadoresSecretaria}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Dell Outro Local</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.dellOutroLocal}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Locados Outro Local</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.locadosOutroLocal}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Outros Outro Local</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.outrosOutroLocal}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Estabilizadores Outro Local</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.estabilizadoresOutroLocal}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Não Há Outro Local</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.naoHaOutroLocal}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Rede BR</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.redeBr}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Internet nas Escolas</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.internetNasEscolas}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Educação Conectada</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.educacaoConectada}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Não Há Provedor</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.naoHaProvedor}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Rack</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.rack}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Switch</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.switchDevice}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Roteador</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.roteador}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Oki</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.oki}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Ricoh</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.ricoh}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">HP</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.hp}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Kyocera</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.kyocera}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Outras Impressoras</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.outrasImpressoras}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Solucionado</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.solucionado}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-gray-700">Email Responsável</td>
                <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.emailResponsavel}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {os.fotosAntes && os.fotosAntes.length > 0 && (
          <div className="w-full max-w-5xl mx-auto">
            <h3 className="text-2xl sm:text-4xl font-thin mt-8 sm:mt-16 text-center text-zinc-500">Fotos Antes</h3>
            <div>
              <Carousel className='w-full' opts={{}}>
                <CarouselContent className='w-full flex'>
                  {os.fotosAntes.map((foto, index) => (
                    <CarouselItem className='justify-center items-center w-full sm:w-3xl' key={index}>
                      <img src={foto} alt={`Foto Antes ${index + 1}`} className="mt-2 object-cover w-full sm:w-[820px] h-[300px] sm:h-[820px] mx-auto" />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className='left-5 bg-zinc-800' />
                <CarouselNext className='right-10 bg-zinc-800' />
              </Carousel>
            </div>
          </div>
        )}
        {os.fotosDepois && os.fotosDepois.length > 0 && (
          <div className="w-full max-w-5xl mx-auto">
            <h3 className="text-2xl sm:text-4xl font-thin mt-8 sm:mt-16 text-center text-zinc-500">Fotos Depois</h3>
            <div>
              <Carousel className='w-full' opts={{}}>
                <CarouselContent className='w-full flex'>
                  {os.fotosDepois.map((foto, index) => (
                    <CarouselItem key={index} className='justify-center items-center w-full sm:w-3xl'>
                      <img src={foto} alt={`Foto Depois ${index + 1}`} className="mt-2 object-cover w-full sm:w-[820px] h-[300px] sm:h-[820px] mx-auto" />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className='left-5 bg-zinc-800' />
                <CarouselNext className='right-10 bg-zinc-800' />
              </Carousel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OSDetail;