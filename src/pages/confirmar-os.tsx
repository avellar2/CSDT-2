import { useRouter } from 'next/router';
import { useState } from 'react';

const ConfirmarOS: React.FC = () => {
  const router = useRouter();
  const { osId } = router.query;
  const [nameAssigned, setNameAssigned] = useState('');
  const [cpfOrRegistration, setCpfOrRegistration] = useState('');
  const [message, setMessage] = useState('');

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
        setMessage('OS confirmada com sucesso!');
      } else {
        setMessage('Erro ao confirmar OS.');
      }
    } catch (error) {
      console.error('Erro ao confirmar OS:', error);
      setMessage('Erro ao confirmar OS.');
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
      {message && <p className="mt-4 text-center">{message}</p>}
    </div>
  );
};

export default ConfirmarOS;