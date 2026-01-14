import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Printer, Plus, Trash, User, Briefcase, FileText } from 'phosphor-react';

interface PrinterData {
  marca: string;
  serial: string;
}

const PreencherImpressoras: React.FC = () => {
  const router = useRouter();
  const { id, token } = router.query;

  const [formData, setFormData] = useState({
    nomeResponsavel: '',
    cpfMatricula: '',
    cargoResponsavel: ''
  });

  const [printers, setPrinters] = useState<PrinterData[]>([
    { marca: '', serial: '' }
  ]);

  const [requestData, setRequestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (id && token) {
      fetchRequestData();
    }
  }, [id, token]);

  const fetchRequestData = async () => {
    try {
      const response = await fetch(`/api/get-printer-request?id=${id}&token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setRequestData(data);

        // Verificar se já foi preenchido
        if (data.status === 'Concluído') {
          setMessage('Esta solicitação já foi preenchida anteriormente.');
        }
      } else {
        setMessage(data.error || 'Solicitação não encontrada ou token inválido.');
      }
    } catch (error) {
      console.error('Erro ao carregar solicitação:', error);
      setMessage('Erro ao carregar dados da solicitação.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePrinterChange = (index: number, field: 'marca' | 'serial', value: string) => {
    const newPrinters = [...printers];
    newPrinters[index][field] = value;
    setPrinters(newPrinters);
  };

  const addPrinter = () => {
    setPrinters([...printers, { marca: '', serial: '' }]);
  };

  const removePrinter = (index: number) => {
    if (printers.length > 1) {
      const newPrinters = printers.filter((_, i) => i !== index);
      setPrinters(newPrinters);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validações
    if (!formData.nomeResponsavel || !formData.cpfMatricula || !formData.cargoResponsavel) {
      setMessage('Todos os campos do responsável são obrigatórios.');
      setLoading(false);
      return;
    }

    // Verificar se todas as impressoras têm marca e serial
    for (const printer of printers) {
      if (!printer.marca || !printer.serial) {
        setMessage('Preencha a marca e o número de série de todas as impressoras.');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/submit-printer-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: id,
          token,
          nomeResponsavel: formData.nomeResponsavel,
          cpfMatricula: formData.cpfMatricula,
          cargoResponsavel: formData.cargoResponsavel,
          printers,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setMessage('Informações enviadas com sucesso!');

        setTimeout(() => {
          window.location.href = 'https://www.google.com';
        }, 3000);
      } else {
        setMessage(result.error || 'Erro ao enviar informações.');
      }
    } catch (error) {
      setMessage('Erro ao enviar informações.');
    } finally {
      setLoading(false);
    }
  };

  // Se não tem id ou token na URL
  if (!id || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md">
          <div className="bg-red-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <X size={64} weight="fill" className="text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-red-700 mb-3">Link Inválido</h2>
          <p className="text-gray-700 text-lg mb-2">
            Esta página requer um link válido para preenchimento.
          </p>
          <p className="text-gray-600 text-sm">
            Verifique o link que você recebeu por email e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  // Se não carregou os dados ainda
  if (!requestData && !message && id && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se tem mensagem de erro e não tem requestData
  if (message && !requestData && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md">
          <div className="bg-red-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <X size={64} weight="fill" className="text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-red-700 mb-3">Erro</h2>
          <p className="text-gray-700 text-lg mb-4">{message}</p>
        </div>
      </div>
    );
  }

  // Se foi concluído com sucesso
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md">
          <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={64} weight="fill" className="text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-green-700 mb-3">Enviado!</h2>
          <p className="text-gray-700 text-lg mb-2">{message}</p>
          <p className="text-sm text-gray-500 mb-6">
            Você será redirecionado automaticamente em alguns segundos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 rounded-t-2xl shadow-lg">
          <h1 className="text-3xl font-bold text-center mb-2 flex items-center justify-center">
            <Printer size={32} className="mr-3" weight="fill" />
            Informações sobre Impressoras Locadas
          </h1>
          <p className="text-center text-purple-100">
            {requestData?.schoolName}
          </p>
        </div>

        <div className="bg-white rounded-b-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            {requestData.status === 'Concluído' && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg mb-6 shadow-md">
                <div className="flex items-center">
                  <CheckCircle size={24} className="mr-3" weight="bold" />
                  <span className="font-medium">Esta solicitação já foi preenchida anteriormente.</span>
                </div>
              </div>
            )}

            {requestData.status !== 'Concluído' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados do Responsável */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <User size={24} className="mr-2 text-blue-600" weight="fill" />
                    Dados do Responsável
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nome Completo *
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
                        Cargo *
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
                  </div>
                </div>

                {/* Impressoras */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                      <Printer size={24} className="mr-2 text-purple-600" weight="fill" />
                      Impressoras Locadas
                    </h3>
                    <button
                      type="button"
                      onClick={addPrinter}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                    >
                      <Plus size={20} weight="bold" />
                      Adicionar Impressora
                    </button>
                  </div>

                  <div className="space-y-4">
                    {printers.map((printer, index) => (
                      <div key={index} className="bg-white p-5 rounded-lg border-2 border-purple-200 relative">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-700">Impressora {index + 1}</h4>
                          {printers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePrinter(index)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              <Trash size={20} weight="bold" />
                            </button>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Marca *
                            </label>
                            <input
                              type="text"
                              value={printer.marca}
                              onChange={(e) => handlePrinterChange(index, 'marca', e.target.value)}
                              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                              placeholder="Ex: HP, Ricoh, Kyocera"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Número de Série *
                            </label>
                            <input
                              type="text"
                              value={printer.serial}
                              onChange={(e) => handlePrinterChange(index, 'serial', e.target.value)}
                              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                              placeholder="Digite o número de série"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mensagem de Erro */}
                {message && !success && (
                  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md">
                    <div className="flex items-center">
                      <X size={24} className="mr-3" weight="bold" />
                      <span className="font-medium">{message}</span>
                    </div>
                  </div>
                )}

                {/* Botão de Enviar */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Enviando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <CheckCircle size={24} className="mr-2" weight="bold" />
                      Enviar Informações
                    </span>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-600 text-sm">
          <p>Sistema CSDT - Coordenadoria de Suporte e Desenvolvimento Tecnológico</p>
        </div>
      </div>
    </div>
  );
};

export default PreencherImpressoras;
