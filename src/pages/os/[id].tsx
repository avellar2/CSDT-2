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

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-left sm:text-center border mt-8 w-full'>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Notebooks Outro Local:</strong> {os.notebooksOutroLocal}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Tablets Outro Local:</strong> {os.tabletsOutroLocal}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>PCS Sieduca:</strong> {os.pcsSieduca}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Notebooks Sieduca:</strong> {os.notebooksSieduca}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Tablets Sieduca:</strong> {os.tabletsSieduca}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Estabilizadores Sieduca:</strong> {os.estabilizadoresSieduca}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Não Há Sieduca:</strong> {os.naoHaSieduca}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Dell Secretaria:</strong> {os.dellSecretaria}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Locados Secretaria:</strong> {os.locadosSecretaria}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Outros Secretaria:</strong> {os.outrosSecretaria}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Notebooks Secretaria:</strong> {os.notebooksSecretaria}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Tablets Secretaria:</strong> {os.tabletsSecretaria}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Estabilizadores Secretaria:</strong> {os.estabilizadoresSecretaria}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Dell Outro Local:</strong> {os.dellOutroLocal}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Locados Outro Local:</strong> {os.locadosOutroLocal}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Outros Outro Local:</strong> {os.outrosOutroLocal}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Estabilizadores Outro Local:</strong> {os.estabilizadoresOutroLocal}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Não Há Outro Local:</strong> {os.naoHaOutroLocal}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Rede BR:</strong> {os.redeBr}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Internet nas Escolas:</strong> {os.internetNasEscolas}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Educação Conectada:</strong> {os.educacaoConectada}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Não Há Provedor:</strong> {os.naoHaProvedor}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Rack:</strong> {os.rack}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Switch:</strong> {os.switchDevice}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Roteador:</strong> {os.roteador}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Oki:</strong> {os.oki}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Ricoh:</strong> {os.ricoh}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>HP:</strong> {os.hp}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Kyocera:</strong> {os.kyocera}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-200'><strong>Outras Impressoras:</strong> {os.outrasImpressoras}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-zinc-100'><strong>Solucionado:</strong> {os.solucionado}</p>
          <p className='text-zinc-700 text-lg sm:text-xl bg-red-400'><strong>Email Responsável:</strong> {os.emailResponsavel}</p>
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