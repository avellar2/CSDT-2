import React, { useState, useEffect } from 'react';
import { X, Wrench, EnvelopeSimple, CheckCircle, Eye, DownloadSimple, ClockCounterClockwise, XCircle } from 'phosphor-react';
import Select from 'react-select';

interface School {
  value: number;
  label: string;
  email: string;
  district: string;
}

interface OSData {
  id: number;
  schoolName: string;
  printerModel: string;
  printerSerial: string;
  osNumber: string;
  emailFrom: string | null;
  emailReceivedAt: string;
  School: {
    name: string;
    email: string;
    district: string;
  } | null;
}

interface EmailLog {
  id: number;
  schoolName: string;
  printerModel: string;
  printerSerial: string;
  status: string;
  errorMessage: string | null;
  sentAt: string;
  School: {
    id: number;
    name: string;
    email: string;
    district: string;
  } | null;
}

interface PreventiveMaintenanceCardProps {
  onClose: () => void;
}

const PreventiveMaintenanceCard: React.FC<PreventiveMaintenanceCardProps> = ({ onClose }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<School[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState<'send' | 'view-os' | 'history'>('send');
  const [osList, setOsList] = useState<OSData[]>([]);
  const [capturingOS, setCapturingOS] = useState(false);
  const [loadingOS, setLoadingOS] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [statistics, setStatistics] = useState({ totalSuccess: 0, totalFailed: 0, totalLogs: 0 });

  useEffect(() => {
    fetchSchools();
    fetchOSList();
    fetchEmailLogs();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/get-school');
      const data = await response.json();

      // Filtrar apenas escolas (que têm email) e não setores
      const options = data
        .filter((school: any) => school.email) // Apenas escolas com email
        .map((school: any) => ({
          value: school.id,
          label: school.name,
          email: school.email,
          district: school.district || 'N/A',
        }));

      setSchools(options);
    } catch (error) {
      console.error('Erro ao buscar escolas:', error);
      setMessage('Erro ao carregar lista de escolas');
      setMessageType('error');
    }
  };

  const fetchOSList = async () => {
    setLoadingOS(true);
    try {
      const response = await fetch('/api/preventive-maintenance/list-os');
      const data = await response.json();

      if (data.success) {
        setOsList(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar lista de OS:', error);
    } finally {
      setLoadingOS(false);
    }
  };

  const fetchEmailLogs = async (filter: string = 'all') => {
    setLoadingLogs(true);
    try {
      const url = filter === 'all'
        ? '/api/preventive-maintenance/email-logs'
        : `/api/preventive-maintenance/email-logs?status=${filter}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setEmailLogs(data.data);
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCaptureOS = async () => {
    setCapturingOS(true);
    setMessage('🔍 Verificando emails do SAC XSCAN... Aguarde!');
    setMessageType('success');

    try {
      const response = await fetch('/api/preventive-maintenance/check-emails', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage(
          `✅ ${result.captured} número(s) de OS capturado(s)!\n` +
          `📧 ${result.totalEmails} emails verificados`
        );
        setMessageType('success');
        fetchOSList(); // Atualizar lista
      } else {
        setMessage(`❌ Erro: ${result.error || 'Não foi possível capturar OS'}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Erro ao capturar OS:', error);
      setMessage('❌ Erro ao verificar emails. Tente novamente.');
      setMessageType('error');
    } finally {
      setCapturingOS(false);
    }
  };

  const handleSendEmail = async () => {
    if (selectedSchools.length === 0) {
      setMessage('Selecione pelo menos uma escola');
      setMessageType('error');
      return;
    }

    setSendingEmail(true);
    setMessage('⏳ Iniciando envio de emails... Este processo pode levar vários minutos. Aguarde!');

    try {
      const response = await fetch('/api/send-preventive-maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolIds: selectedSchools.map(s => s.value),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const printersText = result.totalPrinters === 1 ? 'impressora' : 'impressoras';
        const schoolsText = selectedSchools.length === 1 ? 'escola' : 'escolas';
        const batchInfo = result.batchInfo;

        let successMessage = `✅ Processo concluído!\n\n`;
        successMessage += `📊 Estatísticas:\n`;
        successMessage += `• ${result.emailsSent} de ${result.totalPrinters} ${printersText} enviadas\n`;
        successMessage += `• ${selectedSchools.length} ${schoolsText} processadas\n`;

        if (batchInfo) {
          successMessage += `\n⏱️ Configuração:\n`;
          successMessage += `• ${batchInfo.totalBatches} lote(s) de ${batchInfo.batchSize} emails\n`;
          successMessage += `• Delay: ${batchInfo.emailDelaySeconds}s entre emails\n`;
          successMessage += `• Tempo estimado: ~${batchInfo.estimatedTimeMinutes} minutos\n`;
        }

        setMessage(successMessage);
        setMessageType('success');
        setSelectedSchools([]);
        fetchEmailLogs(); // Atualizar logs

        // Se houver falhas, adicionar aviso e sugerir visualizar histórico
        if (result.emailsFailed > 0) {
          setTimeout(() => {
            setMessage(
              `⚠️ ${result.emailsSent} emails enviados, mas ${result.emailsFailed} falharam. ` +
              `Verifique a aba "Histórico de Envios" para ver detalhes.`
            );
            setMessageType('error');
            console.error('Falhas no envio:', result.details?.failed);
          }, 5000);
        }
      } else {
        setMessage(`Erro ao enviar emails: ${result.error || 'Erro desconhecido'}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      setMessage('Erro ao enviar email. Tente novamente.');
      setMessageType('error');
    } finally {
      setSendingEmail(false);
    }
  };

  const selectAllSchools = () => {
    setSelectedSchools(schools);
  };

  const clearSelection = () => {
    setSelectedSchools([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench size={32} weight="fill" />
            <div>
              <h2 className="text-2xl font-bold">Manutenção Preventiva</h2>
              <p className="text-green-100 text-sm">Solicitar manutenção preventiva para escolas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'send'
                ? 'bg-white dark:bg-zinc-800 text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <EnvelopeSimple size={20} className="inline mr-2" weight="bold" />
            Enviar Solicitações
          </button>
          <button
            onClick={() => setActiveTab('view-os')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'view-os'
                ? 'bg-white dark:bg-zinc-800 text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Eye size={20} className="inline mr-2" weight="bold" />
            Ver OS Capturadas ({osList.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'history'
                ? 'bg-white dark:bg-zinc-800 text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ClockCounterClockwise size={20} className="inline mr-2" weight="bold" />
            Histórico ({statistics.totalLogs})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'send' && (
          <div className="space-y-6">
            {/* Instruções */}
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded">
              <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                📋 Informações
              </h3>
              <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                <li>• Selecione as escolas que precisam de manutenção preventiva</li>
                <li>• <strong>Um email por impressora</strong> será enviado para o SAC da XSCAN</li>
                <li>• A escola será colocada em cópia (CC) em cada email</li>
                <li>• Cada email contém dados de apenas 1 impressora (modelo + serial)</li>
                <li>• <strong>⏱️ Sistema inteligente:</strong></li>
                <li className="ml-4">→ Delay de 3 segundos entre cada email</li>
                <li className="ml-4">→ Lotes de 50 emails com pausa de 5 minutos</li>
                <li className="ml-4">→ Evita bloqueios e spam no Gmail</li>
                <li>• Cópia para: CSDT (csdt@smeduquedecaxias.rj.gov.br)</li>
              </ul>
            </div>

            {/* Seleção de Escolas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Selecione as Escolas
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllSchools}
                    className="text-xs px-3 py-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded transition-colors"
                  >
                    Selecionar Todas
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <Select
                isMulti
                options={schools}
                value={selectedSchools}
                onChange={(selected) => setSelectedSchools(selected as School[])}
                placeholder="Selecione as escolas..."
                className="text-gray-900"
                classNamePrefix="select"
                formatOptionLabel={(school) => (
                  <div>
                    <div className="font-medium">{school.label}</div>
                    <div className="text-xs text-gray-500">
                      Distrito {school.district} • {school.email}
                    </div>
                  </div>
                )}
                noOptionsMessage={() => "Nenhuma escola encontrada"}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {selectedSchools.length} escola(s) selecionada(s) de {schools.length} disponíveis
              </p>
            </div>

            {/* Preview das escolas selecionadas */}
            {selectedSchools.length > 0 && (
              <div className="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  📍 Escolas Selecionadas:
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {selectedSchools.map((school) => (
                    <div
                      key={school.value}
                      className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-800 rounded border border-gray-200 dark:border-zinc-600"
                    >
                      <CheckCircle size={16} className="text-green-600" weight="fill" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {school.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {school.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagem de feedback */}
            {message && (
              <div
                className={`p-4 rounded-lg border-l-4 ${
                  messageType === 'success'
                    ? 'bg-green-100 text-green-700 border-green-500 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-700 border-red-500 dark:bg-red-900/30 dark:text-red-300'
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans text-sm">{message}</pre>
              </div>
            )}

            {/* Botão de Enviar */}
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail || selectedSchools.length === 0}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sendingEmail ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <EnvelopeSimple size={24} weight="bold" />
                  Enviar Solicitação
                </>
              )}
            </button>
          </div>
          )}

          {activeTab === 'view-os' && (
          <div className="space-y-6">
            {/* Botão de Captura de OS */}
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded">
              <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                📥 Capturar Números de OS
              </h3>
              <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                O sistema verificará automaticamente os emails recebidos do SAC XSCAN e capturará os números de OS enviados.
              </p>
              <button
                onClick={handleCaptureOS}
                disabled={capturingOS}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {capturingOS ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Capturando...
                  </>
                ) : (
                  <>
                    <DownloadSimple size={20} weight="bold" />
                    Capturar OS dos Emails
                  </>
                )}
              </button>
            </div>

            {/* Mensagem de feedback */}
            {message && activeTab === 'view-os' && (
              <div
                className={`p-4 rounded-lg border-l-4 ${
                  messageType === 'success'
                    ? 'bg-green-100 text-green-700 border-green-500 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-700 border-red-500 dark:bg-red-900/30 dark:text-red-300'
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans text-sm">{message}</pre>
              </div>
            )}

            {/* Lista de OS Capturadas */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                📋 OS Capturadas ({osList.length})
              </h3>

              {loadingOS ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-400 mt-4">Carregando...</p>
                </div>
              ) : osList.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                  <DownloadSimple size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Nenhuma OS capturada ainda</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Clique em "Capturar OS dos Emails" para verificar
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {osList.map((os) => (
                    <div
                      key={os.id}
                      className="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4 border-2 border-gray-200 dark:border-zinc-600 hover:border-green-400 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                            {os.schoolName}
                          </h4>
                          {os.School && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {os.School.email} • Distrito {os.School.district}
                            </p>
                          )}
                        </div>
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          OS: {os.osNumber}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 mt-3">
                        <div className="bg-white dark:bg-zinc-800 p-3 rounded border border-gray-200 dark:border-zinc-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Modelo da Impressora</p>
                          <p className="font-medium text-gray-900 dark:text-white">{os.printerModel}</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-800 p-3 rounded border border-gray-200 dark:border-zinc-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Número de Série</p>
                          <p className="font-medium text-gray-900 dark:text-white">{os.printerSerial}</p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        Capturado em: {new Date(os.emailReceivedAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Estatísticas e Filtros */}
            <div className="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                📊 Estatísticas de Envio
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-800 p-3 rounded border border-gray-200 dark:border-zinc-600">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Enviados</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.totalLogs}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded border border-green-200 dark:border-green-700">
                  <p className="text-xs text-green-600 dark:text-green-400 mb-1">Sucessos</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{statistics.totalSuccess}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded border border-red-200 dark:border-red-700">
                  <p className="text-xs text-red-600 dark:text-red-400 mb-1">Falhas</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{statistics.totalFailed}</p>
                </div>
              </div>

              {/* Filtros */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setLogFilter('all');
                    fetchEmailLogs('all');
                  }}
                  className={`px-4 py-2 rounded font-semibold transition-colors ${
                    logFilter === 'all'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 dark:bg-zinc-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-500'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => {
                    setLogFilter('success');
                    fetchEmailLogs('success');
                  }}
                  className={`px-4 py-2 rounded font-semibold transition-colors ${
                    logFilter === 'success'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 dark:bg-zinc-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-500'
                  }`}
                >
                  ✅ Sucessos
                </button>
                <button
                  onClick={() => {
                    setLogFilter('failed');
                    fetchEmailLogs('failed');
                  }}
                  className={`px-4 py-2 rounded font-semibold transition-colors ${
                    logFilter === 'failed'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 dark:bg-zinc-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-500'
                  }`}
                >
                  ❌ Falhas
                </button>
              </div>
            </div>

            {/* Lista de Logs */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                📋 Histórico de Envios ({emailLogs.length})
              </h3>

              {loadingLogs ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-400 mt-4">Carregando...</p>
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                  <ClockCounterClockwise size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Nenhum envio registrado</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {emailLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`rounded-lg p-4 border-2 transition-colors ${
                        log.status === 'success'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                            {log.status === 'success' ? (
                              <CheckCircle size={20} className="text-green-600" weight="fill" />
                            ) : (
                              <XCircle size={20} className="text-red-600" weight="fill" />
                            )}
                            {log.schoolName}
                          </h4>
                          {log.School && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {log.School.email}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            log.status === 'success'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                          }`}
                        >
                          {log.status === 'success' ? 'Sucesso' : 'Falhou'}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 mt-3">
                        <div className="bg-white dark:bg-zinc-800 p-3 rounded border border-gray-200 dark:border-zinc-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Modelo</p>
                          <p className="font-medium text-gray-900 dark:text-white">{log.printerModel}</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-800 p-3 rounded border border-gray-200 dark:border-zinc-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Serial</p>
                          <p className="font-medium text-gray-900 dark:text-white">{log.printerSerial}</p>
                        </div>
                      </div>

                      {log.errorMessage && (
                        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
                          <p className="text-xs text-red-600 dark:text-red-400 mb-1 font-semibold">Erro:</p>
                          <p className="text-sm text-red-700 dark:text-red-300">{log.errorMessage}</p>
                        </div>
                      )}

                      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        Enviado em: {new Date(log.sentAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-zinc-700 p-4 bg-gray-50 dark:bg-zinc-900">
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <div>
              <p className="font-semibold mb-1">📧 Destinatários do Email:</p>
              <p>• Para: sac@xscan.com.br</p>
              <p>• CC: Email da escola + csdt@smeduquedecaxias.rj.gov.br</p>
            </div>
            <div>
              <p className="font-semibold mb-1">⏱️ Sistema Inteligente de Envio:</p>
              <p>• Delay: 3 segundos entre cada email</p>
              <p>• Lotes: 50 emails → pausa de 5 minutos → continua</p>
              <p>• Assinatura: William Neves da Rocha - Coordenador do CSDT - SME</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreventiveMaintenanceCard;
