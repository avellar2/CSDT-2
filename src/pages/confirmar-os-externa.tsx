import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Calendar, Clock, User, Briefcase, FileText, Image, MapPin } from 'phosphor-react';

const ConfirmarOsExterna: React.FC = () => {
  const router = useRouter();
  const { numeroOs, token } = router.query;

  const [formData, setFormData] = useState({
    nomeResponsavel: '',
    cpfMatricula: '',
    cargoResponsavel: ''
  });

  const [osData, setOsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (numeroOs && token) {
      fetchOsData();
    }
  }, [numeroOs, token]);

  const fetchOsData = async () => {
    try {
      console.log('🔍 Buscando OS:', numeroOs, 'Token:', token);
      const response = await fetch(`/api/get-os-externa?numeroOs=${numeroOs}&token=${token}`);
      const data = await response.json();

      console.log('📦 Resposta da API:', data);

      if (response.ok) {
        setOsData(data);
        console.log('✅ OS carregada com sucesso!');
      } else {
        console.error('❌ Erro na resposta:', data);
        setMessage(data.error || 'OS não encontrada ou token inválido.');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar OS:', error);
      setMessage('Erro ao carregar dados da OS.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.nomeResponsavel || !formData.cpfMatricula || !formData.cargoResponsavel) {
      setMessage('Todos os campos são obrigatórios.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/confirmar-os-externa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numeroOs,
          token,
          nomeResponsavel: formData.nomeResponsavel,
          cpfMatricula: formData.cpfMatricula,
          cargoResponsavel: formData.cargoResponsavel,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setMessage('OS confirmada com sucesso!');

        // Redirecionar para o Google após 3 segundos
        setTimeout(() => {
          window.location.href = 'https://www.google.com';
        }, 3000);
      } else {
        setMessage(result.error || 'Erro ao confirmar OS.');
      }
    } catch (error) {
      setMessage('Erro ao confirmar OS.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToGoogle = () => {
    window.location.href = 'https://www.google.com';
  };

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  // Se não tem osData e não tem mensagem de erro ainda, mostra loading
  if (!osData && !message && numeroOs && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Carregando informações da OS...</p>
          <p className="text-gray-500 text-sm mt-2">OS: {numeroOs}</p>
        </div>
      </div>
    );
  }

  // Se não tem numeroOs ou token na URL
  if (!numeroOs || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md">
          <div className="bg-red-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <X size={64} weight="fill" className="text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-red-700 mb-3">Link Inválido</h2>
          <p className="text-gray-700 text-lg mb-2">
            Esta página requer um link válido para confirmação de OS.
          </p>
          <p className="text-gray-600 text-sm">
            Verifique o link que você recebeu por email e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  // Se tem mensagem de erro (OS não encontrada, token inválido, etc)
  if (message && !osData && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md">
          <div className="bg-red-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <X size={64} weight="fill" className="text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-red-700 mb-3">Erro</h2>
          <p className="text-gray-700 text-lg mb-4">{message}</p>
          <div className="bg-gray-50 p-4 rounded-lg text-left text-sm">
            <p className="text-gray-600 mb-1"><strong>OS:</strong> {numeroOs}</p>
            <p className="text-gray-600"><strong>Possíveis causas:</strong></p>
            <ul className="text-gray-600 list-disc list-inside mt-2 space-y-1">
              <li>OS já foi confirmada anteriormente</li>
              <li>Link expirado ou inválido</li>
              <li>Número da OS incorreto</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md">
          <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={64} weight="fill" className="text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-green-700 mb-3">Confirmado!</h2>
          <p className="text-gray-700 text-lg mb-2">{message}</p>
          <p className="text-sm text-gray-500 mb-6">
            Você será redirecionado automaticamente em alguns segundos...
          </p>
          <Button
            onClick={handleGoToGoogle}
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg"
          >
            Ir para o Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-t-2xl shadow-lg">
          <h1 className="text-3xl font-bold text-center mb-2">
            Confirmação de Ordem de Serviço
          </h1>
          <p className="text-center text-blue-100">
            Revise as informações e confirme o atendimento
          </p>
        </div>

        <div className="bg-white rounded-b-2xl shadow-2xl overflow-hidden">
          {/* Informações da OS */}
          {osData && (
            <div className="p-8">
              {/* Card de Informações Principais */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl mb-6 border-l-4 border-blue-600">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <FileText size={24} className="mr-2 text-blue-600" />
                  Informações da OS
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Número da OS</p>
                    <p className="text-lg font-bold text-blue-600">{osData.numeroOs}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <MapPin size={16} className="mr-1" />
                      Unidade Escolar
                    </p>
                    <p className="text-lg font-semibold text-gray-800">{osData.unidadeEscolar}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <User size={16} className="mr-1" />
                      Técnico Responsável
                    </p>
                    <p className="text-lg font-semibold text-gray-800">{osData.tecnicoResponsavel}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <Calendar size={16} className="mr-1" />
                      Data do Atendimento
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {osData.data} às {osData.hora}
                    </p>
                  </div>
                </div>
              </div>

              {/* Solicitação da Visita */}
              {osData.solicitacaoDaVisita && (
                <div className="mb-6 bg-yellow-50 p-6 rounded-xl border-l-4 border-yellow-500">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <Briefcase size={20} className="mr-2 text-yellow-600" />
                    Motivo da Visita
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{osData.solicitacaoDaVisita}</p>
                </div>
              )}

              {/* Relatório do Atendimento */}
              {osData.relatorio && (
                <div className="mb-6 bg-green-50 p-6 rounded-xl border-l-4 border-green-500">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <FileText size={20} className="mr-2 text-green-600" />
                    Relatório do Atendimento
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{osData.relatorio}</p>
                </div>
              )}

              {/* Status da Solução */}
              {osData.solucionado && (
                <div className="mb-6">
                  <div className={`p-4 rounded-lg ${
                    osData.solucionado.toLowerCase().includes('sim') || osData.solucionado.toLowerCase().includes('resolvido')
                      ? 'bg-green-100 border-l-4 border-green-500'
                      : 'bg-red-100 border-l-4 border-red-500'
                  }`}>
                    <h3 className="font-bold text-gray-800 mb-2">Status da Solução</h3>
                    <p className={`font-semibold ${
                      osData.solucionado.toLowerCase().includes('sim') || osData.solucionado.toLowerCase().includes('resolvido')
                        ? 'text-green-700'
                        : 'text-red-700'
                    }`}>
                      {osData.solucionado}
                    </p>
                  </div>
                </div>
              )}

              {/* Equipamentos Atendidos */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  Equipamentos Atendidos
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Equipamentos Próprios */}
                  {(osData.pcsProprio > 0 || osData.notebooksProprio > 0 || osData.tabletsProprio > 0 ||
                    osData.monitoresProprio > 0 || osData.estabilizadoresProprio > 0) && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-bold text-blue-800 mb-2">Equipamentos Próprios</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {osData.pcsProprio > 0 && <li>• Computadores: {osData.pcsProprio}</li>}
                        {osData.notebooksProprio > 0 && <li>• Notebooks: {osData.notebooksProprio}</li>}
                        {osData.tabletsProprio > 0 && <li>• Tablets: {osData.tabletsProprio}</li>}
                        {osData.monitoresProprio > 0 && <li>• Monitores: {osData.monitoresProprio}</li>}
                        {osData.estabilizadoresProprio > 0 && <li>• Estabilizadores: {osData.estabilizadoresProprio}</li>}
                      </ul>
                    </div>
                  )}

                  {/* Equipamentos Locados */}
                  {(osData.pcsLocado > 0 || osData.notebooksLocado > 0 || osData.tabletsLocado > 0 ||
                    osData.monitoresLocado > 0 || osData.estabilizadoresLocado > 0) && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="font-bold text-purple-800 mb-2">Equipamentos Locados</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {osData.pcsLocado > 0 && <li>• Computadores: {osData.pcsLocado}</li>}
                        {osData.notebooksLocado > 0 && <li>• Notebooks: {osData.notebooksLocado}</li>}
                        {osData.tabletsLocado > 0 && <li>• Tablets: {osData.tabletsLocado}</li>}
                        {osData.monitoresLocado > 0 && <li>• Monitores: {osData.monitoresLocado}</li>}
                        {osData.estabilizadoresLocado > 0 && <li>• Estabilizadores: {osData.estabilizadoresLocado}</li>}
                      </ul>
                    </div>
                  )}

                  {/* Outros Locais */}
                  {(osData.pcsProprioOutrosLocais > 0 || osData.pcsLocadoOutrosLocais > 0 ||
                    osData.notebooksProprioOutrosLocais > 0 || osData.notebooksLocadoOutrosLocais > 0 ||
                    osData.tabletsProprioOutrosLocais > 0 || osData.tabletsLocadoOutrosLocais > 0) && (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-bold text-orange-800 mb-2">Outros Locais</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {osData.pcsProprioOutrosLocais > 0 && <li>• PCs Próprios: {osData.pcsProprioOutrosLocais}</li>}
                        {osData.pcsLocadoOutrosLocais > 0 && <li>• PCs Locados: {osData.pcsLocadoOutrosLocais}</li>}
                        {osData.notebooksProprioOutrosLocais > 0 && <li>• Notebooks Próprios: {osData.notebooksProprioOutrosLocais}</li>}
                        {osData.notebooksLocadoOutrosLocais > 0 && <li>• Notebooks Locados: {osData.notebooksLocadoOutrosLocais}</li>}
                        {osData.tabletsProprioOutrosLocais > 0 && <li>• Tablets Próprios: {osData.tabletsProprioOutrosLocais}</li>}
                        {osData.tabletsLocadoOutrosLocais > 0 && <li>• Tablets Locados: {osData.tabletsLocadoOutrosLocais}</li>}
                      </ul>
                    </div>
                  )}

                  {/* Impressoras */}
                  {(osData.oki > 0 || osData.kyocera > 0 || osData.hp > 0 || osData.ricoh > 0 || osData.outrasImpressoras > 0) && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-bold text-green-800 mb-2">Impressoras</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {osData.oki > 0 && <li>• Oki: {osData.oki}</li>}
                        {osData.kyocera > 0 && <li>• Kyocera: {osData.kyocera}</li>}
                        {osData.hp > 0 && <li>• HP: {osData.hp}</li>}
                        {osData.ricoh > 0 && <li>• Ricoh: {osData.ricoh}</li>}
                        {osData.outrasImpressoras > 0 && <li>• Outras: {osData.outrasImpressoras}</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Peças ou Material */}
              {osData.pecasOuMaterial && (
                <div className="mb-6 bg-indigo-50 p-6 rounded-xl border-l-4 border-indigo-500">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" />
                    </svg>
                    Peças ou Material Utilizado
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{osData.pecasOuMaterial}</p>
                </div>
              )}

              {/* Fotos do Atendimento */}
              {((osData.fotosAntes && osData.fotosAntes.length > 0) ||
                (osData.fotosDepois && osData.fotosDepois.length > 0)) && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Image size={20} className="mr-2 text-pink-600" />
                    Fotos do Atendimento
                  </h3>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Fotos Antes */}
                    {osData.fotosAntes && osData.fotosAntes.length > 0 && (
                      <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                        <h4 className="font-bold text-red-800 mb-3 flex items-center">
                          <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">
                            1
                          </span>
                          Antes do Atendimento
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {osData.fotosAntes.map((foto: string, index: number) => (
                            <div
                              key={index}
                              className="relative group cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all"
                              onClick={() => openImageModal(foto)}
                            >
                              <img
                                src={foto}
                                alt={`Antes ${index + 1}`}
                                className="w-full h-40 object-cover transition-transform group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                                <span className="text-white opacity-0 group-hover:opacity-100 font-bold">
                                  Clique para ampliar
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fotos Depois */}
                    {osData.fotosDepois && osData.fotosDepois.length > 0 && (
                      <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                        <h4 className="font-bold text-green-800 mb-3 flex items-center">
                          <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">
                            2
                          </span>
                          Depois do Atendimento
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {osData.fotosDepois.map((foto: string, index: number) => (
                            <div
                              key={index}
                              className="relative group cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all"
                              onClick={() => openImageModal(foto)}
                            >
                              <img
                                src={foto}
                                alt={`Depois ${index + 1}`}
                                className="w-full h-40 object-cover transition-transform group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                                <span className="text-white opacity-0 group-hover:opacity-100 font-bold">
                                  Clique para ampliar
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mensagem de Erro */}
              {message && !success && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 shadow-md">
                  <div className="flex items-center">
                    <X size={24} className="mr-3" weight="bold" />
                    <span className="font-medium">{message}</span>
                  </div>
                </div>
              )}

              {/* Formulário de Confirmação */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                  Confirme o Atendimento
                </h3>
                <p className="text-gray-600 text-center mb-6">
                  Preencha os dados do responsável pela escola para confirmar que o serviço foi realizado
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nome Completo do Responsável *
                    </label>
                    <input
                      type="text"
                      name="nomeResponsavel"
                      value={formData.nomeResponsavel}
                      onChange={handleInputChange}
                      className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Digite o nome completo"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      CPF ou Matrícula *
                    </label>
                    <input
                      type="text"
                      name="cpfMatricula"
                      value={formData.cpfMatricula}
                      onChange={handleInputChange}
                      className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Digite o CPF ou matrícula"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cargo do Responsável *
                    </label>
                    <input
                      type="text"
                      name="cargoResponsavel"
                      value={formData.cargoResponsavel}
                      onChange={handleInputChange}
                      className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Ex: Diretor(a), Coordenador(a)"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Confirmando...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <CheckCircle size={24} className="mr-2" weight="bold" />
                        Confirmar Atendimento
                      </span>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-600 text-sm">
          <p>Sistema CSDT - Coordenadoria de Suporte e Desenvolvimento Tecnológico</p>
        </div>
      </div>

      {/* Modal de Imagem */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-6xl max-h-full">
            <button
              onClick={closeImageModal}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X size={32} weight="bold" />
            </button>
            <img
              src={selectedImage}
              alt="Imagem ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmarOsExterna;
