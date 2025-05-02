import { supabase } from "@/lib/supabaseClient";
import React, { useEffect, useState } from "react";
import Select from "react-select";

const ChadaPage: React.FC = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Erro ao obter usuário logado:", error);
      } else {
        console.log("Usuário logado:", user);

        // Buscar o displayName do usuário logado
        const response = await fetch("/api/get-user-displayname", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: user?.id }),
        });

        if (response.ok) {
          const data = await response.json();
          setUserName(data.displayName);
          console.log("DisplayName do usuário logado:", data.displayName); // Adicionado aqui
        } else {
          console.error("Erro ao buscar displayName do usuário logado");
        }
      }
    };

    fetchUser();

    const fetchChadaItems = async () => {
      try {
        const response = await fetch("/api/chada-items");
        if (!response.ok) {
          throw new Error("Erro ao buscar itens da CHADA");
        }
        const data = await response.json();
        setItems(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchChadaItems();
  }, []);

  const fetchAllItems = async () => {
    try {
      const response = await fetch("/api/items");
      if (!response.ok) {
        throw new Error("Erro ao buscar todos os itens");
      }
      const data = await response.json();
      setAllItems(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddToChada = async () => {
    if (!selectedItem || !problem) {
      alert("Selecione um item e descreva o problema.");
      return;
    }

    try {
      console.log("Usuário logado antes de enviar:", userName);

      const response = await fetch("/api/add-to-chada", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: selectedItem,
          problem,
          userName,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao adicionar item à CHADA");
      }

      alert("Item adicionado à CHADA com sucesso!");
      setModalIsOpen(false);
      setProblem("");
      setSelectedItem(null);

      const updatedItems = await fetch("/api/chada-items").then((res) => res.json());
      setItems(updatedItems);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <div>Carregando itens da CHADA...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Itens na CHADA</h1>
      <button
        onClick={() => {
          setModalIsOpen(true);
          fetchAllItems();
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Adicionar Item à CHADA
      </button>
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: any) => (
            <div
              key={item.id}
              className="bg-white shadow-md rounded-lg p-4 border border-gray-200 text-zinc-800"
            >
              <h3 className="text-lg font-semibold">{item.name}</h3>
              <p><strong>Marca:</strong> {item.brand}</p>
              <p><strong>Serial:</strong> {item.serialNumber || "Não informado"}</p>
              <p><strong>Status:</strong> {item.status}</p>
              <p><strong>Problema:</strong> {item.problem || "Não informado"}</p>
              <p><strong>Adicionado por:</strong> {item.userName || "Não informado"}</p>
              <p><strong>Adicionado em:</strong> {new Date(item.createdAt).toLocaleDateString("pt-BR")}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>Nenhum item na CHADA.</p>
      )}

      {modalIsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Adicionar Item à CHADA</h2>
            <Select
              options={allItems.map((item: any) => ({
                value: item.id,
                label: `${item.name} - ${item.serialNumber || "Sem Serial"}`,
              }))}
              onChange={(selectedOption) =>
                setSelectedItem(selectedOption ? selectedOption.value : null)
              }
              placeholder="Selecione um item"
              className="mb-4 text-zinc-800"
            />
            <textarea
              className="w-full mb-4 p-2 border border-gray-300 rounded"
              placeholder="Descreva o problema"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                onClick={() => setModalIsOpen(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded mr-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddToChada}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChadaPage;