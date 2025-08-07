import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabaseClient';
import {
  Wrench,
  ArrowLeft,
  Check,
  X,
  Desktop,
  DeviceMobile,
  Laptop,
  Printer,
  WifiHigh,
  Code,
  Gear,
  Question
} from 'phosphor-react';

interface SchoolProfile {
  schoolId: number;
  schoolName: string;
  displayName: string;
}

const CreateTechnicalTicket: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<SchoolProfile | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'OTHER',
    equipmentAffected: '',
    attachments: [] as string[]
  });

  const categories = [
    { value: 'COMPUTER', label: 'Computador/Desktop', icon: Desktop },
    { value: 'NOTEBOOK', label: 'Notebook', icon: Laptop },
    { value: 'TABLET', label: 'Tablet', icon: DeviceMobile },
    { value: 'PRINTER', label: 'Impressora', icon: Printer },
    { value: 'NETWORK', label: 'Rede/Internet', icon: WifiHigh },
    { value: 'SOFTWARE', label: 'Software', icon: Code },
    { value: 'MAINTENANCE', label: 'Manutenção Geral', icon: Gear },
    { value: 'OTHER', label: 'Outros', icon: Question }
  ];

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

      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile) return;

    try {
      setSubmitting(true);

      const response = await fetch('/api/technical-tickets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolId: userProfile.schoolId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          equipmentAffected: formData.equipmentAffected.trim() || null,
          createdBy: userProfile.displayName,
          attachments: formData.attachments
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar chamado');
      }

      console.log('Chamado criado com sucesso:', result.ticket);
      setShowSuccess(true);

      // Limpar formulário
      setFormData({
        title: '',
        description: '',
        category: 'OTHER',
        equipmentAffected: '',
        attachments: []
      });

      // Redirecionar após 3 segundos
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      alert('Erro ao criar chamado técnico. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">

        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Chamado Criado!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Seu chamado técnico foi enviado com sucesso para o CSDT.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Nossa equipe irá analisar e entrar em contato em breve.
            </p>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Redirecionando em alguns segundos...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
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
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                  <Wrench size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Abrir Chamado Técnico
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    {userProfile?.schoolName}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Título do Problema */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Título do Problema *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ex: Computador da direção não liga"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Categoria */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Categoria do Problema *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {categories.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <label
                        key={category.value}
                        className={`relative cursor-pointer border-2 rounded-lg p-4 flex flex-col items-center gap-2 transition-all ${formData.category === category.value
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-orange-300'
                          }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category.value}
                          checked={formData.category === category.value}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <IconComponent
                          size={24}
                          className={formData.category === category.value ? 'text-orange-500' : 'text-gray-400'}
                        />
                        <span className={`text-xs font-medium text-center ${formData.category === category.value
                            ? 'text-orange-700 dark:text-orange-300'
                            : 'text-gray-600 dark:text-gray-400'
                          }`}>
                          {category.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Equipamentos Afetados */}
              <div>
                <label htmlFor="equipmentAffected" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Equipamentos Afetados
                </label>
                <input
                  type="text"
                  id="equipmentAffected"
                  name="equipmentAffected"
                  value={formData.equipmentAffected}
                  onChange={handleChange}
                  placeholder="Ex: Desktop Dell da sala da direção, Impressora HP da secretaria"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Descrição */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição Detalhada do Problema *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={6}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Descreva detalhadamente o problema que está acontecendo, quando começou, e qualquer informação que possa ajudar nossos técnicos..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Informações Importantes */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  ℹ️ Informações Importantes
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Seu chamado será analisado pela equipe do CSDT</li>
                  <li>• A prioridade será definida pelos técnicos responsáveis</li>
                  <li>• Você será notificado quando o chamado for agendado</li>
                  <li>• Em casos urgentes, entre em contato por telefone</li>
                </ul>
              </div>

              {/* Botões */}
              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting || !formData.title.trim() || !formData.description.trim()}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Wrench size={20} />
                      Abrir Chamado Técnico
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTechnicalTicket;