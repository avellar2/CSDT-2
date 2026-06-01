import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

// Cache simples em memória: evita chamar Supabase a cada navegação
// { uid, timestamp } — válido por 5 minutos
let cachedAuth: { uid: string; ts: number } | null = null;
const CACHE_MS = 30 * 60 * 1000; // 30 minutos

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      // Se cache é válido, autoriza direto sem chamar Supabase
      const now = Date.now();
      if (cachedAuth && cachedAuth.uid === token && (now - cachedAuth.ts) < CACHE_MS) {
        setAuthorized(true);
        return;
      }

      // Valida o token com o Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        localStorage.removeItem("token");
        cachedAuth = null;
        router.push("/login");
        return;
      }

      // Cacheia resultado
      cachedAuth = { uid: token, ts: now };
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