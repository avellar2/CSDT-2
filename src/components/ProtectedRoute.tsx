import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode";
import { supabase } from "@/lib/supabaseClient";
import { getFreshAccessToken } from "@/utils/client-auth";

// Cache simples em memória: evita chamar Supabase a cada navegação.
// { token, uid, timestamp } — válido por 5 minutos.
let cachedAuth: { token: string; uid: string; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

function tokenIsFresh(token: string): boolean {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    // Exige pelo menos 30s de validade; abaixo disso renova antes de seguir.
    return !exp || exp * 1000 > Date.now() + 30_000;
  } catch {
    return false;
  }
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Fonte confiável: sessão do Supabase (renova se estiver vencendo).
      const token = await getFreshAccessToken();
      if (!token) {
        cachedAuth = null;
        router.push("/login");
        return;
      }

      const now = Date.now();
      if (
        cachedAuth &&
        cachedAuth.token === token &&
        tokenIsFresh(token) &&
        now - cachedAuth.ts < CACHE_MS
      ) {
        setAuthorized(true);
        return;
      }

      // Valida o token com o Supabase.
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        cachedAuth = null;
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        router.push("/login");
        return;
      }

      cachedAuth = { token, uid: user.id, ts: now };
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
