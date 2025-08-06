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
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo Email */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">Email</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User size={20} className="text-slate-400 group-focus-within:text-blue-400 transition-colors duration-200" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/15 backdrop-blur-sm"
              placeholder="Digite seu email"
              required
            />
          </div>
        </div>

        {/* Campo Senha */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">Senha</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock size={20} className="text-slate-400 group-focus-within:text-blue-400 transition-colors duration-200" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/15 backdrop-blur-sm"
              placeholder="Digite sua senha"
              required
            />
          </div>
        </div>

        {/* Botão Submit */}
        <button 
          type="submit" 
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
            email && password 
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-blue-500/25 hover:shadow-blue-500/40' 
              : 'bg-gray-600 text-gray-300 cursor-not-allowed'
          }`} 
          disabled={!email || !password}
        >
          <SignIn size={20} className={email && password ? 'animate-pulse' : ''} />
          {email && password ? 'Entrar' : 'Preencha os campos'}
        </button>
      </form>
      {/* Modal de Erro com design melhorado */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Mensagem de Erro"
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      >
        <div className="bg-slate-800 border border-red-500/20 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl transform animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <WarningCircle size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Oops! Algo deu errado</h2>
            <p className="text-slate-300 text-sm leading-relaxed">{modalMessage}</p>
            <button 
              onClick={closeModal} 
              className="mt-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-red-500/25"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LoginForm;