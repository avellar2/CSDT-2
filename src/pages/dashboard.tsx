import React, { useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "@/components/Dashboard";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/theme-toggle";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DashboardPage: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login"); // Redireciona para a página de login se não houver sessão
      }
    };

    checkSession();
  }, [router]);

  return (
    <ProtectedRoute>
      <div className="container mx-auto">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <Dashboard />
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;