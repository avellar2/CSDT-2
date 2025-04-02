import { useRouter } from 'next/router';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface HeaderContextType {
  userName: string;
  setUserName: (name: string) => void;
  handleLogout: () => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export const HeaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userName, setUserName] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const response = await fetch('/api/getProfile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'token': token || '',
          },
        });

        if (response.ok) {
          const profile = await response.json();
          setUserName(profile.displayName);
        } else {
          console.error('Erro ao buscar perfil');
        }
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <HeaderContext.Provider value={{ userName, setUserName, handleLogout }}>
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeaderContext = () => {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error('useHeaderContext must be used within a HeaderProvider');
  }
  return context;
};