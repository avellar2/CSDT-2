import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { CheckCircle, X } from 'phosphor-react';

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

  useEffect(() => {
    if (numeroOs && token) {
      fetchOsData();
    }
  }, [numeroOs, token]);

  const fetchOsData = async () => {
    try {
      const response = await fetch(`/api/get-os-externa?numeroOs=${numeroOs}&token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setOsData(data);
      } else {
        setMessage('OS não encontrada ou token inválido.');
      }
    } catch (error) {
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

  if (!osData && !message) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-700 mb-2">Confirmado!</h2>
          <p className="text-gray-600 mb-4">{message}</p>
          <p className="text-sm text-gray-500 mb-4">
            Você será redirecionado automaticamente em alguns segundos...
          </p>
          <Button
            onClick={handleGoToGoogle}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Ir para o Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600 mb-2">
            Confirmação de OS Externa
          </h1>
          {osData && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
              <p><strong>OS:</strong> {osData.numeroOs}</p>
              <p><strong>Escola:</strong> {osData.unidadeEscolar}</p>
              <p><strong>Técnico:</strong> {osData.tecnicoResponsavel}</p>
            </div>
          )}
        </div>

        {message && !success && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex items-center">
              <X size={20} className="mr-2" />
              {message}
            </div>
          </div>
        )}

        {osData && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Responsável *
              </label>
              <input
                type="text"
                name="nomeResponsavel"
                value={formData.nomeResponsavel}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF/Matrícula *
              </label>
              <input
                type="text"
                name="cpfMatricula"
                value={formData.cpfMatricula}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cargo do Responsável *
              </label>
              <input
                type="text"
                name="cargoResponsavel"
                value={formData.cargoResponsavel}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md disabled:opacity-50"
            >
              {loading ? 'Confirmando...' : 'Confirmar OS'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ConfirmarOsExterna;