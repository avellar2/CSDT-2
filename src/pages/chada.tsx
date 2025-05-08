import { supabase } from "@/lib/supabaseClient";
import React, { useEffect, useState } from "react";
import Select from "react-select";
import { CheckCircle, CloudArrowUp, Eye, Printer } from "phosphor-react"; // Importar os ícones do Phosphor
import { PDFDocument, rgb } from "pdf-lib";
import Modal from "@/components/Modal";

const ChadaPage: React.FC = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const [sector, setSector] = useState("");
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Erro ao obter usuário logado:", error);
      } else {
        console.log("Usuário logado:", user);

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
    if (!selectedItem || !problem || !sector) {
      alert("Selecione um item, descreva o problema e informe o setor.");
      return;
    }

    console.log("Item selecionado:", selectedItem);
    console.log("Problema:", problem);
    console.log("Usuário:", userName);
    console.log("Setor:", sector);

    try {
      const response = await fetch("/api/add-to-chada", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: selectedItem, // ID do item selecionado
          problem, // Problema informado pelo usuário
          userName, // Nome do usuário logado
          sector, // Setor informado pelo usuário
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao adicionar item à CHADA");
      }

      alert("Item adicionado à CHADA com sucesso!");
      setModalIsOpen(false);
      setProblem("");
      setSector("");
      setSelectedItem(null);

      const updatedItems = await fetch("/api/chada-items").then((res) => res.json());
      setItems(updatedItems);
    } catch (error) {
      console.error(error);
    }
  };

  const handleResolveItem = async (id: string) => {
    console.log("ID enviado para o backend:", id);

    if (!userName) {
      alert("Nome do usuário logado não encontrado.");
      return;
    }

    try {
      const response = await fetch("/api/update-item-status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id, // Certifique-se de que o `id` é o UUID correto
          status: "RESOLVIDO", // Status a ser atualizado
          updatedBy: userName, // Nome do usuário logado
        }),
      });

      console.log("Resposta do backend:", response);

      if (!response.ok) {
        throw new Error("Erro ao atualizar o status do item");
      }

      alert("Status do item atualizado para RESOLVIDO!");

      const updatedItems = await fetch("/api/chada-items").then((res) => res.json());
      setItems(updatedItems);
    } catch (error) {
      console.error("Erro ao resolver o item:", error);
      alert("Falha ao atualizar o status do item. Tente novamente.");
    }
  };

  const handlePrintOS = async (item: any) => {
    try {
      const existingPdfBytes = await fetch("/os-interna.pdf").then((res) =>
        res.arrayBuffer()
      );

      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      form.getTextField("SETOR").setText(item.sector || "Não informado");
      form.getTextField("HORA").setText(new Date().toLocaleTimeString("pt-BR"));
      form.getTextField("DATA").setText(new Date().toLocaleDateString("pt-BR"));
      form.getTextField("TECNICO").setText(item.userName || "Não informado");
      form.getTextField("ITEM").setText(
        `${item.brand || "Não informado"}, serial: ${item.serialNumber || "Não informado"}`
      );
      form.getTextField("RELATORIO").setText(item.problem || "Não informado");

      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `os-${item.serialNumber || "item"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao gerar o PDF:", error);
      alert("Erro ao gerar o PDF. Tente novamente.");
    }
  };

  const handleUploadOS = async (id: string) => {
    console.log("ID enviado para o backend:", id);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;

    input.onchange = async (event: any) => {
      const files = event.target.files;

      if (!files || files.length === 0) {
        alert("Nenhuma imagem selecionada.");
        return;
      }

      try {
        const uploadedUrls: string[] = [];

        for (const file of files) {
          const fileName = `${id}-${Date.now()}-${file.name}`;
          const { data: uploadData, error } = await supabase.storage
            .from("os-images")
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (error) {
            console.error("Erro ao fazer upload da imagem:", error);
            alert("Erro ao fazer upload da imagem.");
            return;
          }

          const { data: publicUrlData } = supabase.storage
            .from("os-images")
            .getPublicUrl(fileName);

          const publicUrl = publicUrlData.publicUrl;
          uploadedUrls.push(publicUrl);
        }

        console.log("URLs enviadas para osImages:", uploadedUrls);

        const response = await fetch("/api/upload-os", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id, // Certifique-se de que o `id` é uma string
            osImages: uploadedUrls,
            userName, // Enviar o nome do usuário logado
          }),
        });

        if (!response.ok) {
          throw new Error("Erro ao salvar as imagens na tabela");
        }

        alert("Imagens enviadas com sucesso!");
      } catch (error) {
        console.error("Erro ao fazer upload das imagens:", error);
        alert("Erro ao fazer upload das imagens. Tente novamente.");
      }
    };

    input.click();
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-bold mb-4">Itens Pendentes</h2>
            <div className="grid grid-cols-1 gap-4">
              {items
                .filter((item: any) => item.statusChada === "PENDENTE")
                .map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-white shadow-md rounded-lg p-4 border border-gray-200 text-zinc-800"
                  >
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <p><strong>Marca:</strong> {item.brand}</p>
                    <p><strong>Serial:</strong> {item.serialNumber || "Não informado"}</p>
                    <p><strong>Status:</strong> {item.status}</p>
                    <p><strong>Problema:</strong> {item.problem || "Não informado"}</p>
                    <p><strong>Setor:</strong> {item.sector || "Não informado"}</p>
                    <p><strong>Adicionado por:</strong> {item.userName || "Não informado"}</p>
                    <p><strong>Adicionado em:</strong> {new Date(item.createdAt).toLocaleDateString("pt-BR")}</p>
                    <div className="flex space-x-4 mt-4">
                      <button
                        onClick={() => handleResolveItem(item.id)}
                        className="flex items-center bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                      >
                        <CheckCircle size={20} className="mr-2" />
                        Dar Baixa
                      </button>
                      <button
                        onClick={() => handlePrintOS(item)}
                        className="flex items-center bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                      >
                        <Printer size={20} className="mr-2" />
                        Imprimir OS
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-4">Itens Resolvidos</h2>
            <div className="grid grid-cols-1 gap-4">
              {items
                .filter((item: any) => item.statusChada === "RESOLVIDO")
                .map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-white shadow-md rounded-lg p-4 border border-gray-200 text-zinc-800"
                  >
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <p><strong>Marca:</strong> {item.brand}</p>
                    <p><strong>Serial:</strong> {item.serialNumber || "Não informado"}</p>
                    <p><strong>Status:</strong> {item.status}</p>
                    <p><strong>Problema:</strong> {item.problem || "Não informado"}</p>
                    <p><strong>Setor:</strong> {item.sector || "Não informado"}</p>
                    <p><strong>Adicionado por:</strong> {item.userName || "Não informado"}</p>
                    <p><strong>Adicionado em:</strong> {new Date(item.createdAt).toLocaleDateString("pt-BR")}</p>
                    <p><strong>Baixa por:</strong> {item.updateBy || "Não informado"}</p>
                    <p><strong>Baixa em:</strong> {new Date(item.updatedAt).toLocaleDateString("pt-BR")}</p>

                    <h4 className="text-lg font-bold mt-4">Histórico de Uploads:</h4>
                    {item.osImages && Array.isArray(item.osImages) && item.osImages.length > 0 ? (
                      item.osImages.map((history: any, index: number) => (
                        <div key={index} className="mt-2">
                          <p><strong>Enviado por:</strong> {history.uploadedBy}</p>
                          <p><strong>Data:</strong> {new Date(history.uploadedAt).toLocaleDateString("pt-BR")}</p>
                        </div>
                      ))
                    ) : (
                      <p>Nenhum histórico disponível.</p>
                    )}
                    <div className="flex space-x-4 mt-4">
                      {item.osImages && Array.isArray(item.osImages) && item.osImages.length > 0 ? (
                        item.osImages.map((history: any, index: number) => (
                          <div key={index}>
                            {history.images.map((url: string, i: number) => (
                              <button
                                key={i}
                                onClick={() => window.open(url, "_blank")} // Abre a imagem em uma nova aba
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex justify-center items-center gap-2"
                              >
                                <Eye size={25}/> Ver OS
                              </button>
                            ))}
                          </div>
                        ))
                      ) : (
                        <button
                          onClick={() => handleUploadOS(item.id)}
                          className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                        >
                          <CloudArrowUp size={25} /> Subir OS
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <p>Nenhum item na CHADA.</p>
      )}
      {modalIsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4 text-zinc-700">Adicionar Item à CHADA</h2>
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
            <input
              type="text"
              className="w-full mb-4 p-2 border border-gray-300 rounded"
              placeholder="Informe o setor"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
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