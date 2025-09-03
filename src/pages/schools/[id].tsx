import React, { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import Modal from 'react-modal';
import styles from './SchoolPage.module.css';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement 
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  MapPin, 
  Phone, 
  EnvelopeSimple, 
  Users, 
  GraduationCap, 
  ChartBar,
  ArrowLeft,
  Camera,
  FileText
} from 'phosphor-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const prisma = new PrismaClient();

interface School {
  id: number;
  name: string;
  inep: number;
  students: number;
  district: string;
  address: string;
  director: string;
  phone: string;
  email: string;
  photos: string[]; // Adicione um array de URLs de fotos
  items: {
    id: number;
    name: string;
    brand: string;
    quantity: number;
    serialNumber?: string; // Adicione o campo serial
    createdAt: string; // Adicione o campo serializado
    updatedAt: string; // Adicione o campo serializado
    school?: {
      id: number;
      name: string;
      isAnnex: boolean;
      isMainSchool: boolean;
    };
  }[]; // Adicione os itens relacionados à escola
}

interface SchoolPageProps {
  school: School | null;
}

interface SchoolStats {
  totalOS: number;
  osExternas: number;
  osAntigas: number;
  osAssinadas: number;
  internalOs: number;
  memorandos: number;
  items: number;
}

const SchoolPage: React.FC<SchoolPageProps> = ({ school }) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [newPhoto, setNewPhoto] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>(school?.photos || []);
  const [items, setItems] = useState<School['items']>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        if (school?.id) {
          const response = await fetch(`/api/schools/${school.id}/items`);
          if (!response.ok) {
            throw new Error(`Erro ao buscar itens: ${response.statusText}`);
          }
          const data = await response.json();
          setItems(data);
        }
      } catch (error) {
        console.error('Erro ao buscar itens:', error);
      } finally {
        setLoadingItems(false);
      }
    };

    const fetchStats = async () => {
      try {
        if (school?.id) {
          const response = await fetch(`/api/schools/${school.id}/stats`);
          if (!response.ok) {
            throw new Error(`Erro ao buscar estatísticas: ${response.statusText}`);
          }
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (school?.id) {
      fetchItems();
      fetchStats();
    }
  }, [school?.id]);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const handleAddPhoto = () => {
    if (newPhoto) {
      setPhotos([...photos, newPhoto]);
      setNewPhoto('');
      closeModal();
    }
  };

  if (!school) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Escola não encontrada
          </h1>
          <Link href="/schools">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
              <ArrowLeft size={16} />
              Voltar para escolas
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Preparar dados para os gráficos
  const osData = stats ? {
    labels: ['OS Externas', 'OS Antigas', 'OS Assinadas', 'OS Internas'],
    datasets: [{
      label: 'Quantidade de OS',
      data: [stats.osExternas, stats.osAntigas, stats.osAssinadas, stats.internalOs],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)', 
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderColor: [
        'rgb(59, 130, 246)',
        'rgb(16, 185, 129)',
        'rgb(245, 158, 11)', 
        'rgb(239, 68, 68)'
      ],
      borderWidth: 1
    }]
  } : null;

  const summaryData = stats ? {
    labels: ['Total OS', 'Memorandos', 'Itens'],
    datasets: [{
      data: [stats.totalOS, stats.memorandos, stats.items],
      backgroundColor: [
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(34, 197, 94, 0.8)'
      ],
      borderColor: [
        'rgb(139, 92, 246)',
        'rgb(236, 72, 153)', 
        'rgb(34, 197, 94)'
      ],
      borderWidth: 2
    }]
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Header com navegação */}
      <div className="bg-white dark:bg-zinc-800 shadow-sm border-b border-gray-200 dark:border-zinc-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/schools">
              <button className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <ArrowLeft size={20} />
                Voltar para escolas
              </button>
            </Link>
            <div className="flex items-center gap-4">
              <button 
                onClick={openModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Camera size={16} />
                Adicionar Foto
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header da escola */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informações principais */}
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {school.name}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <GraduationCap size={16} />
                    <span><strong>INEP:</strong> {school.inep}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin size={16} />
                    <span><strong>Distrito:</strong> {school.district}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users size={16} />
                    <span><strong>Alunos:</strong> {school.students?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <GraduationCap size={16} />
                    <span><strong>Diretor:</strong> {school.director}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone size={16} />
                    <a href={`tel:${school.phone}`} className="hover:text-blue-500 transition-colors">
                      {school.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <EnvelopeSimple size={16} />
                    <a href={`mailto:${school.email}`} className="hover:text-blue-500 transition-colors">
                      {school.email}
                    </a>
                  </div>
                </div>
              </div>
              {school.address && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                    <MapPin size={16} className="mt-0.5" />
                    <span className="text-sm">{school.address}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Estatísticas rápidas */}
            <div className="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ChartBar size={20} />
                Resumo Rápido
              </h3>
              {loadingStats ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-300 dark:bg-zinc-600 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-gray-200 dark:bg-zinc-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : stats ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total OS:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{stats.totalOS}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Memorandos:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{stats.memorandos}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Itens:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{stats.items}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Erro ao carregar estatísticas</p>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard com gráficos */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Gráfico de barras - OS por tipo */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Ordens de Serviço por Tipo
              </h3>
              {osData && (
                <Bar 
                  data={osData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        }
                      }
                    }
                  }}
                />
              )}
            </div>

            {/* Gráfico de pizza - Resumo geral */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Resumo Geral
              </h3>
              {summaryData && (
                <Doughnut 
                  data={summaryData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Galeria de fotos */}
        {photos.length > 0 && (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Camera size={20} />
              Galeria de Fotos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="aspect-video bg-gray-100 dark:bg-zinc-700 rounded-lg overflow-hidden">
                  <img 
                    src={photo} 
                    alt={`Foto ${index + 1}`} 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumo de itens cadastrados */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText size={20} />
            Resumo de Itens por Escola e Tipo
          </h3>
          {loadingItems ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-200 dark:bg-zinc-700 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Itens da escola principal */}
              {items.some(item => item.school?.isMainSchool) && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    🏫 {school.name} (Escola Principal)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(
                      items
                        .filter(item => item.school?.isMainSchool)
                        .reduce((acc, item) => {
                          if (!acc[item.name]) {
                            acc[item.name] = 0;
                          }
                          acc[item.name] += 1;
                          return acc;
                        }, {} as Record<string, number>)
                    ).map(([name, quantity]) => (
                      <div
                        key={`main-${name}`}
                        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center"
                      >
                        <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">{name}</h5>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{quantity}</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">itens</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Itens dos anexos agrupados por anexo */}
              {Array.from(new Set(items.filter(item => item.school?.isAnnex).map(item => item.school?.id)))
                .map(annexId => {
                  const annexItems = items.filter(item => item.school?.id === annexId);
                  const annexName = annexItems[0]?.school?.name || 'Anexo';
                  return (
                    <div key={annexId}>
                      <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        📍 {annexName.replace(/^ANEXO\s*(\([^)]*\))?\s*:?\s*/i, '')} (Anexo)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(
                          annexItems.reduce((acc, item) => {
                            if (!acc[item.name]) {
                              acc[item.name] = 0;
                            }
                            acc[item.name] += 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([name, quantity]) => (
                          <div
                            key={`annex-${annexId}-${name}`}
                            className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center"
                          >
                            <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">{name}</h5>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{quantity}</p>
                            <p className="text-xs text-purple-700 dark:text-purple-300">itens</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Lista detalhada de itens */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Todos os Itens Cadastrados (Escola + Anexos)
          </h3>
          {loadingItems ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-36 bg-gray-200 dark:bg-zinc-700 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    item.school?.isMainSchool
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10'
                      : item.school?.isAnnex
                      ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10'
                      : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                  }`}
                >
                  {/* Badge indicador da escola de origem */}
                  <div className="mb-3">
                    {item.school?.isMainSchool ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        🏫 Escola Principal
                      </span>
                    ) : item.school?.isAnnex ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                        📍 Anexo: {item.school.name.replace(/^ANEXO\s*(\([^)]*\))?\s*:?\s*/i, '')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400">
                        ❓ Origem não identificada
                      </span>
                    )}
                  </div>
                  
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {item.name}
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p><strong>Marca:</strong> {item.brand}</p>
                    <p><strong>Serial:</strong> {item.serialNumber || "Não informado"}</p>
                    <p><strong>Criado:</strong> {new Date(item.createdAt).toLocaleDateString()}</p>
                    <p><strong>Atualizado:</strong> {new Date(item.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum item cadastrado
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Esta escola e seus anexos ainda não possuem itens cadastrados no sistema.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal para adicionar fotos */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-md mx-auto mt-20 p-6 outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center px-4 py-8 z-50"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Adicionar Nova Foto
        </h2>
        <input
          type="url"
          placeholder="URL da foto..."
          value={newPhoto}
          onChange={(e) => setNewPhoto(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={handleAddPhoto}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Adicionar
          </button>
          <button
            onClick={closeModal}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!;
  const school = await prisma.school.findUnique({
    where: { id: Number(id) },
  });

  return {
    props: {
      school,
    },
  };
};

export default SchoolPage;