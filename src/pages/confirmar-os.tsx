import { useRouter } from 'next/router';
import { useState } from 'react';

const ConfirmarOS: React.FC = () => {
  const router = useRouter();
  const { osId } = router.query;
  const [nameAssigned, setNameAssigned] = useState('');
  const [cpfOrRegistration, setCpfOrRegistration] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/aceitar-os?osId=${osId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nameAssigned, cpfOrRegistration }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setModalMessage('A OS foi confirmada com sucesso!');
        setIsModalOpen(true);
      } else {
        setIsSuccess(false);
        setModalMessage('Erro ao confirmar OS. Por favor, tente novamente.');
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Erro ao confirmar OS:', error);
      setIsSuccess(false);
      setModalMessage('Erro ao confirmar OS. Por favor, tente novamente.');
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (isSuccess) {
      router.push('/'); // Redirect to another page if needed
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">Confirmar OS</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nameAssigned">
            Nome
          </label>
          <input
            type="text"
            id="nameAssigned"
            value={nameAssigned}
            onChange={(e) => setNameAssigned(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cpfOrRegistration">
            CPF ou Registro
          </label>
          <input
            type="text"
            id="cpfOrRegistration"
            value={cpfOrRegistration}
            onChange={(e) => setCpfOrRegistration(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Confirmar OS
        </button>
      </form>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2
              className={`text-2xl font-bold mb-4 text-center ${
                isSuccess ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isSuccess ? 'Sucesso!' : 'Erro!'}
            </h2>
            <p className="text-center text-gray-700 mb-6">{modalMessage}</p>
            <button
              onClick={closeModal}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmarOS;