import React from 'react';
import RegisterForm from '@/components/RegisterForm';

const RegisterPage: React.FC = () => {
  return (
    <div className='flex flex-col h-screen items-center justify-center p-4'>
      <h1 className='mb-6 text-2xl'>Registrar</h1>
      <div className='w-full bg-zinc-900 p-4 rounded-2xl'>
        <RegisterForm />
      </div>
    </div>
  );
};

export default RegisterPage;