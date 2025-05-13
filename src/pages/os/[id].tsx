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
  switch?: string;
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

        <table className="table-auto w-full border-collapse border border-gray-300 text-left">
          <tbody>
            <tr className="bg-gray-100">
              <td className="border border-gray-300 px-4 py-2 font-bold text-gray-700">Técnico Responsável</td>
              <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.tecnicoResponsavel}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-bold text-gray-700">Número OS</td>
              <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.numeroOs}</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-gray-300 px-4 py-2 font-bold text-gray-700">Assinatura</td>
              <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.nameAssigned}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-bold text-gray-700">CPF/Matrícula</td>
              <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.cpfOrRegistration}</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-gray-300 px-4 py-2 font-bold text-gray-700">Data</td>
              <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.data}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-bold text-gray-700">Hora</td>
              <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.hora}</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-gray-300 px-4 py-2 font-bold text-gray-700">Status</td>
              <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.status}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-bold text-gray-700">Solicitação da Visita</td>
              <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.solicitacaoDaVisita}</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-gray-300 px-4 py-2 font-bold text-gray-700">Relatório</td>
              <td className="border border-gray-300 px-4 py-2 text-gray-700">{os.relatorio}</td>
            </tr>
          </tbody>
        </table>

        <div className="overflow-x-auto mt-8 w-full">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Item</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Lab</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Sec</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Outro</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">PC</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.pcsSieduca}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{0}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{0}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{parseInt(os.pcsSieduca || '0') + parseInt('0') + parseInt('0')}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">Notebook</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.notebooksSieduca}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.notebooksSecretaria}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.notebooksOutroLocal}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{parseInt(os.notebooksSieduca || '0') + parseInt(os.notebooksSecretaria || '0') + parseInt(os.notebooksOutroLocal || '0')}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">Tablet</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.tabletsSieduca}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.tabletsSecretaria}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.tabletsOutroLocal}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{parseInt(os.tabletsSieduca || '0') + parseInt(os.tabletsSecretaria || '0') + parseInt(os.tabletsOutroLocal || '0')}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">Estabilizadores</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.estabilizadoresSieduca}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.estabilizadoresSecretaria}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.estabilizadoresOutroLocal}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{parseInt(os.estabilizadoresSieduca || '0') + parseInt(os.estabilizadoresSecretaria || '0') + parseInt(os.estabilizadoresOutroLocal || '0')}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">PC Dell</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{0}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.dellSecretaria}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.dellOutroLocal}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{parseInt(os.dellSecretaria || '0') + parseInt(os.dellOutroLocal || '0') + parseInt('0')}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">PC Locado</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{0}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.locadosSecretaria}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.locadosOutroLocal}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{parseInt(os.locadosSecretaria || '0') + parseInt(os.locadosOutroLocal || '0') + parseInt('0')}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">PC Próprio</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{0}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.outrosSecretaria}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.outrosOutroLocal}</td>
                <td className="border border-gray-300 px-4 py-2 text-zinc-800">{parseInt('0') + parseInt(os.outrosSecretaria || '0') + parseInt(os.outrosOutroLocal || '0')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <table className="table-auto w-full border-collapse border border-gray-300 mt-10">
          <thead className="bg-gray-200">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Item</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">OKI</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Kyocera</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">HP</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Ricoh</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Própria</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">Impressora</td>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.oki}</td>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.kyocera}</td>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.hp}</td>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.ricoh}</td>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.outrasImpressoras}</td>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">{parseInt(os.oki || '0') + parseInt(os.kyocera || '0') + parseInt(os.hp || '0') + parseInt(os.ricoh || '0') + parseInt(os.outrasImpressoras || '0')}</td>
            </tr>
          </tbody>
        </table>

        <table className="table-auto w-full border-collapse border border-gray-300 mt-10">
          <thead className="bg-gray-200">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Item</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Rede BR</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Oi/Satélite</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">EC</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700">Não Há</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">Internet</td>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.redeBr || '---'}</td>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.internetNasEscolas || '---'}</td>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.educacaoConectada || '---'}</td>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.naoHaProvedor || '---'}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">Rack</td>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.rack || '---'}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">Switch</td>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.switch || '---'}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">Roteador</td>
              <td className="border border-gray-300 px-4 py-2 text-zinc-800">{os.roteador || '---'}</td>
            </tr>
          </tbody>
        </table>
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