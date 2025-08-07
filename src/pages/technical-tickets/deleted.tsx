import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabaseClient';
import { 
  Trash, 
  ArrowLeft,
  Calendar,
  User,
  WaveTriangle
} from 'phosphor-react';

interface SchoolProfile {
  schoolId: number;
  schoolName: string;
  displayName: string;
}

interface DeletedTicket {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
  deletedAt: string;
  deletedBy: string;
  deletionReason: string;
  School: {
    name: string;
  };
}

const DeletedTickets: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<SchoolProfile | null>(null);
  const [deletedTickets, setDeletedTickets] = useState<DeletedTicket[]>([]);

  // Carregar perfil da escola logada
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);

        // Buscar usuário logado no Supabase
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          console.error('Erro ao buscar usuário:', error);
          router.push('/login');
          return;
        }

        // Buscar perfil no Prisma
        const response = await fetch(`/api/get-role?userId=${user.id}`);
        const profileData = await response.json();

        if (!response.ok) {
          console.error('Erro ao buscar perfil:', profileData.error);
          router.push('/login');
          return;
        }

        // Verificar se é uma escola
        if (profileData.role !== 'SCHOOL') {
          console.error('Usuário não é uma escola');
          router.push('/dashboard');
          return;
        }

        setUserProfile({
          schoolId: profileData.schoolId,
          schoolName: profileData.schoolName,
          displayName: profileData.displayName
        });

        // Carregar chamados excluídos
        await fetchDeletedTickets(profileData.schoolId);

      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [router]);

  const fetchDeletedTickets = async (schoolId: number) => {
    try {
      const response = await fetch(`/api/technical-tickets/deleted?schoolId=${schoolId}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar chamados excluídos');
      }

      const data = await response.json();
      if (data.success) {
        setDeletedTickets(data.deletedTickets);
      }
    } catch (error) {
      console.error('Erro ao buscar chamados excluídos:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header da página */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                  <Trash size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Chamados Excluídos
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    {userProfile?.schoolName}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  Total: {deletedTickets.length} chamado(s) excluído(s)
                </p>
              </div>
            </div>
          </div>

          {/* Lista de Chamados Excluídos */}
          <div className="space-y-4">
            {deletedTickets.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                <Trash size={48} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nenhum chamado excluído
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Você não possui chamados técnicos excluídos.
                </p>
              </div>
            ) : (
              deletedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-red-500"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        #{ticket.id} - {ticket.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Criado em: {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Trash size={14} />
                          Excluído em: {new Date(ticket.deletedAt).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          Por: {ticket.deletedBy}
                        </span>
                      </div>
                    </div>
                    
                    <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-xs font-medium">
                      Excluído
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Descrição do Chamado:
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300 text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        {ticket.description}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <WaveTriangle size={16} className="text-red-500" />
                        Motivo da Exclusão:
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                        {ticket.deletionReason}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Categoria: {ticket.category}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeletedTickets;