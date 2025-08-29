import React from "react";
import LoginForm from "@/components/LoginForm";

const LoginPage: React.FC = () => {
  return (
    <div className="login-page bg-gradient-to-br from-gray-900 via-slate-800 to-blue-900 relative flex items-center justify-center min-h-screen overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-slate-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-gradient-to-r from-slate-400/20 to-blue-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-gradient-to-r from-gray-400/20 to-blue-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-500"></div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left side - Branding */}
          <div className="hidden lg:flex flex-col justify-center space-y-8 text-white">
            <div className="space-y-6">
              <div className="w-32 h-32 bg-gradient-to-r from-blue-500 via-slate-600 to-blue-400 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-12 hover:rotate-0 transition-transform duration-500">
                <img
                  src="/images/logo.png"
                  alt="Logo"
                  className="w-20 h-20 object-contain transform -rotate-12 hover:rotate-0 transition-transform duration-500"
                />
              </div>
              <div className="space-y-4">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-slate-300 to-blue-300 bg-clip-text text-transparent">
                  CSDT
                </h1>
                <h2 className="text-3xl font-light text-gray-200">
                  Plataforma de Gestão Educacional
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Solução inteligente para o gerenciamento de serviços técnicos em instituições de ensino. Unindo tecnologia de ponta, eficiência operacional e comunicação integrada entre escolas e equipes especializadas.
                </p>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-200 mb-4">Recursos avançados:</h3>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 text-lg">📌</span>
                <span className="text-gray-300">
                  Registro ágil e simplificado de chamados técnicos
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 text-lg">📅</span>
                <span className="text-gray-300">
                  Agendamento inteligente de visitas e atendimentos
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 text-lg">⚙️</span>
                <span className="text-gray-300">
                  Monitoramento completo de ordens de serviço
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 text-lg">⏱️</span>
                <span className="text-gray-300">
                  Acompanhamento em tempo real, com transparência total
                </span>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-600">
                <p className="text-gray-300 font-medium italic">
                  Segurança, confiabilidade e inovação para transformar a gestão educacional.
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="flex flex-col justify-center">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 lg:p-12 space-y-8 transform hover:scale-[1.02] transition-all duration-300">
              {/* Mobile logo */}
              <div className="lg:hidden text-center space-y-6">
                <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-500 via-slate-600 to-blue-400 rounded-2xl flex items-center justify-center shadow-xl">
                  <img
                    src="/images/logo.png"
                    alt="Logo"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Bem-vindo
                  </h1>
                  <p className="text-gray-300">Entre em sua conta</p>
                </div>
              </div>

              {/* Desktop header */}
              <div className="hidden lg:block text-center space-y-4">
                <h1 className="text-4xl font-bold text-white">Entrar</h1>
                <p className="text-gray-300 text-lg">
                  Acesse sua conta do CSDT
                </p>
              </div>

              {/* Login Form */}
              <LoginForm />

              {/* Footer links */}
              <div className="text-center space-y-4 pt-6 border-t border-white/10">
                <p className="text-sm text-gray-400">
                  Sistema seguro e confiável
                </p>
                <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
                  <span>© 2025 CSDT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
