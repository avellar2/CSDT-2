import React, { useEffect } from "react";
import { useRouter } from "next/router";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login"); // Redireciona para a página de login se não houver token
    }
  }, [router]);

  return <>{children}</>;
};

export default ProtectedRoute;