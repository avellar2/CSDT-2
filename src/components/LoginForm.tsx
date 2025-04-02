import { Lock, SignIn, User, WarningCircle } from 'phosphor-react';
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Modal from 'react-modal';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Tentativa de login com email:', email); // Log para depuração
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('Erro no login:', error); // Log para depuração
        if (error.message === 'Invalid login credentials') {
          setModalMessage('Email ou senha incorretos. Por favor, verifique suas credenciais.');
        } else {
          setModalMessage(error.message || 'Erro ao fazer login');
        }
        setModalIsOpen(true);
      } else {
        console.log('Login bem-sucedido:', data); // Log para depuração
        localStorage.setItem('token', data.session?.access_token || '');
        router.push('/dashboard'); // Redireciona para o dashboard
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error); // Log para depuração
      setModalMessage('Erro ao fazer login');
      setModalIsOpen(true);
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="p-4 rounded-lg shadow-md flex flex-col bg-zinc-900 w-full">
        <div className='flex items-center gap-2 bg-zinc-800 mb-4'>
          <User size={25} className='ml-4' />
          <span className='border border-zinc-500 ml-2 h-5'></span>
          <input
            type="email"
            value={email}
            className="w-full p-4 bg-zinc-800 text-gray-100  focus:outline-blue-400 focus:outline-1"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
        </div>

        <div className='flex items-center gap-2 bg-zinc-800 mb-8'>
          <Lock size={25} className='ml-4' />
          <span className='border border-zinc-500 ml-2 h-5'></span>
          <input
            type="password"
            value={password}
            className="w-full p-4 bg-zinc-800 text-gray-100 border-none focus:outline-blue-400 focus:outline-1"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            required
          />
        </div>

        <button type="submit" className={`w-full flex items-center justify-center bg-blue-500 gap-1 py-2.5 hover:bg-blue-600 ${email && password ? 'cursor-pointer' : 'cursor-not-allowed'}`} disabled={!email || !password}>
          <SignIn size={25} />
          Entrar
        </button>
      </form>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Mensagem de Erro"
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <div className="flex flex-col items-center">
          <WarningCircle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl mb-4">Erro</h2>
          <p>{modalMessage}</p>
          <button onClick={closeModal} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white p-2 rounded">
            Fechar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default LoginForm;