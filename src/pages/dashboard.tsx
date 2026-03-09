import React, { useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "@/components/Dashboard";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { ThemeToggle } from "@/components/theme-toggle";

const DashboardPage: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
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
export const getServerSideProps = async () => ({ props: {} });
