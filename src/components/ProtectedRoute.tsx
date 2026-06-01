import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Primeiro verifica se tem token no localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      // Valida o token com o Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        // Token inválido ou expirado — limpa e redireciona
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }

      setAuthorized(true);
    };

    checkAuth();
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Verificando autenticação...</div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;