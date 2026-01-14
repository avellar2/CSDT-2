import React, { useState, useEffect } from 'react';
import { X, Printer, EnvelopeSimple, CheckCircle, Clock, Eye } from 'phosphor-react';
import Select from 'react-select';

interface School {
  value: number;
  label: string;
  email: string;
  district: string;
}

interface PrinterRequest {
  id: number;
  School: {
    name: string;
    email: string;
    district: string;
  };
  status: string;
  sentAt: string;
  completedAt: string | null;
  nomeResponsavel: string | null;
  cpfMatricula: string | null;
  cargoResponsavel: string | null;
  printers: Array<{
    marca: string;
    serial: string;
  }>;
}

interface PrinterRequestCardProps {
  onClose: () => void;
}

const PrinterRequestCard: React.FC<PrinterRequestCardProps> = ({ onClose }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<School[]>([]);
  const [printerRequests, setPrinterRequests] = useState<PrinterRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'send' | 'view'>('send');
  const [selectedRequest, setSelectedRequest] = useState<PrinterRequest | null>(null);

  useEffect(() => {
    fetchSchools();
    fetchPrinterRequests();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/get-school');
      const data = await response.json();
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
    }
  };

  const fetchPrinterRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/list-printer-requests');
      const data = await response.json();
      setPrinterRequests(data);
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmails = async () => {
    if (selectedSchools.length === 0) {
      setMessage('Selecione pelo menos uma escola');
      return;
    }

    setSendingEmails(true);
    setMessage('');

    try {
      const response = await fetch('/api/send-printer-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolIds: selectedSchools.map(s => s.value),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`Emails enviados com sucesso! ${result.totalSent} enviados, ${result.totalFailed} falharam.`);
        setSelectedSchools([]);
        fetchPrinterRequests(); // Atualizar lista
      } else {
        setMessage(`Erro ao enviar emails: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro ao enviar emails:', error);
      setMessage('Erro ao enviar emails');
    } finally {
      setSendingEmails(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Printer size={32} weight="fill" />
            <div>
              <h2 className="text-2xl font-bold">Solicitação de Dados de Impressoras</h2>
              <p className="text-purple-100 text-sm">Envie emails para escolas solicitando informações sobre impressoras locadas</p>
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
                ? 'bg-white dark:bg-zinc-800 text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <EnvelopeSimple size={20} className="inline mr-2" weight="bold" />
            Enviar Solicitações
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'view'
                ? 'bg-white dark:bg-zinc-800 text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Eye size={20} className="inline mr-2" weight="bold" />
            Ver Respostas ({printerRequests.filter(r => r.status === 'Concluído').length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'send' && (
            <div className="space-y-6">
              {/* Seleção de Escolas */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Selecione as Escolas
                </label>
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
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {selectedSchools.length} escola(s) selecionada(s)
                </p>
              </div>

              {/* Mensagem */}
              {message && (
                <div className={`p-4 rounded-lg ${
                  message.includes('sucesso')
                    ? 'bg-green-100 text-green-700 border-l-4 border-green-500'
                    : 'bg-red-100 text-red-700 border-l-4 border-red-500'
                }`}>
                  {message}
                </div>
              )}

              {/* Botão de Enviar */}
              <button
                onClick={handleSendEmails}
                disabled={sendingEmails || selectedSchools.length === 0}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingEmails ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <EnvelopeSimple size={24} weight="bold" />
                    Enviar Solicitações
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'view' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-400 mt-4">Carregando...</p>
                </div>
              ) : printerRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Printer size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Nenhuma solicitação enviada ainda</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {printerRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-gray-50 dark:bg-zinc-700 rounded-lg p-5 border-2 border-gray-200 dark:border-zinc-600 hover:border-purple-400 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                            {request.School.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {request.School.email} • Distrito {request.School.district}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            request.status === 'Concluído'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {request.status === 'Concluído' ? (
                            <CheckCircle size={16} className="inline mr-1" weight="fill" />
                          ) : (
                            <Clock size={16} className="inline mr-1" weight="fill" />
                          )}
                          {request.status}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <p>Enviado em: {formatDate(request.sentAt)}</p>
                        {request.completedAt && (
                          <p>Respondido em: {formatDate(request.completedAt)}</p>
                        )}
                      </div>

                      {request.status === 'Concluído' && (
                        <div className="mt-4 p-4 bg-white dark:bg-zinc-800 rounded-lg border border-purple-200 dark:border-purple-700">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                            Informações Preenchidas
                          </h4>
                          <div className="grid md:grid-cols-3 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Responsável</p>
                              <p className="font-medium text-gray-900 dark:text-white">{request.nomeResponsavel}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">CPF/Matrícula</p>
                              <p className="font-medium text-gray-900 dark:text-white">{request.cpfMatricula}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Cargo</p>
                              <p className="font-medium text-gray-900 dark:text-white">{request.cargoResponsavel}</p>
                            </div>
                          </div>

                          <div className="mt-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Impressoras ({request.printers.length})
                            </p>
                            <div className="space-y-2">
                              {request.printers.map((printer, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded"
                                >
                                  <Printer size={16} className="text-purple-600" />
                                  <div className="flex-1">
                                    <p className="font-medium text-sm text-gray-900 dark:text-white">
                                      {printer.marca}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      Serial: {printer.serial}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-zinc-700 p-4 bg-gray-50 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <p>Total de solicitações: {printerRequests.length}</p>
            <p>
              Concluídas: {printerRequests.filter(r => r.status === 'Concluído').length} |
              Pendentes: {printerRequests.filter(r => r.status === 'Pendente').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterRequestCard;
