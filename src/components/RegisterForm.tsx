import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const RegisterForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"ADMIN" | "TECH" | "ONLYREAD" | "ADMTOTAL">("ONLYREAD"); // Inclui ADMTOTAL

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
        });

      if (signUpError) {
        alert(`Erro: ${signUpError.message}`);
        return;
      }

      const userId = signUpData.user?.id;
      if (userId) {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            displayName: name,
            photoUrl: "/images/perfil.jpg",
            role, // Envia a role selecionada
          }),
        });

        if (response.ok) {
          alert("Usuário registrado com sucesso!");
        } else {
          const errorData = await response.json();
          alert(`Erro ao salvar o perfil: ${errorData.error}`);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar usuário");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full">
      <input
        type="text"
        className="mb-4 p-3 bg-zinc-800 rounded"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome"
        required
      />
      <input
        type="email"
        className="mb-4 p-3 bg-zinc-800 rounded"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        className="mb-4 p-3 bg-zinc-800 rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
        required
      />
      <select
        className="mb-10 p-3 bg-zinc-800 rounded text-white"
        value={role}
        onChange={(e) =>
          setRole(e.target.value as "ADMIN" | "TECH" | "ONLYREAD" | "ADMTOTAL")
        }
        required
      >
        <option value="ONLYREAD">Somente Leitura</option>
        <option value="TECH">Técnico</option>
        <option value="ADMIN">Administrador</option>
        <option value="ADMTOTAL">Administrador Total</option> {/* Novo valor */}
      </select>
      <button className="w-full p-4 bg-blue-500" type="submit">
        Registrar
      </button>
    </form>
  );
};

export default RegisterForm;
