import React from 'react';
import LoginForm from '@/components/LoginForm';


const LoginPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full p-15">
      <img src='/images/logo.png' alt="Logo" className="w-44 h-44 mb-4" />
      <h1 className='text-2xl mb-4'>Login</h1>
      <LoginForm />
    </div>
  );
};

export default LoginPage;
