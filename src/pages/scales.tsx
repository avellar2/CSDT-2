import React, { useState, useEffect } from "react";

const Scales: React.FC = () => {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [baseTechnicians, setBaseTechnicians] = useState<string[]>([]);
  const [visitTechnicians, setVisitTechnicians] = useState<string[]>([]);
  const [offTechnicians, setOffTechnicians] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [conflictingTechnicians, setConflictingTechnicians] = useState<
    { name: string; categories: string[] }[]
  >([]);

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const response = await fetch("/api/getTechnicians");
        if (!response.ok) {
          throw new Error("Erro ao buscar técnicos");
        }
        const data = await response.json();
        console.log("Dados recebidos dos técnicos:", data); // Adicionado para depuração
        setTechnicians(data);
      } catch (error) {
        console.error("Erro ao buscar técnicos:", error);
      }
    };

    fetchTechnicians();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Impede o comportamento padrão do formulário

    // Junta todos os técnicos selecionados em qualquer categoria
    const allSelectedTechnicians = [
      ...baseTechnicians,
      ...visitTechnicians,
      ...offTechnicians,
    ];

    // Encontra técnicos duplicados (que aparecem em mais de uma lista)
    const duplicateTechnicians = Array.from(
      new Set(
        allSelectedTechnicians.filter(
          (techId, index) => allSelectedTechnicians.indexOf(techId) !== index
        )
      )
    );

    // Verifica técnicos não alocados
    const unallocatedTechnicians = technicians.filter(
      (tech) => !allSelectedTechnicians.includes(String(tech.id)) // Garante que o ID seja comparado como string
    );

    // Prepara mensagens de erro
    const errors: {
      type: string;
      technicians: { name: string; details: string }[];
    }[] = [];

    if (duplicateTechnicians.length > 0) {
      errors.push({
        type: "CONFLITO",
        technicians: duplicateTechnicians.map((techId) => {
          const tech = technicians.find((t) => String(t.id) === String(techId)); // Garante que o ID seja comparado corretamente
          const categories = [];
          if (baseTechnicians.includes(techId)) categories.push("Base");
          if (visitTechnicians.includes(techId)) categories.push("Visita Técnica");
          if (offTechnicians.includes(techId)) categories.push("Folga");

          return {
            name: tech?.displayName || "Técnico não encontrado", // Exibe o displayName corretamente
            details: `Alocado em: ${categories.join(", ")}`,
          };
        }),
      });
    }

    if (unallocatedTechnicians.length > 0) {
      errors.push({
        type: "NAO_ALOCADO",
        technicians: unallocatedTechnicians.map((tech) => ({
          name: tech.displayName || "Técnico não encontrado",
          details: "Não alocado em nenhuma categoria",
        })),
      });
    }

    // Se houver erros, mostra o modal
    if (errors.length > 0) {
      setConflictingTechnicians(
        errors.flatMap((error) =>
          error.technicians.map((tech) => ({
            name: tech.name,
            categories: [tech.details], // Usamos o campo categories para mostrar o detalhe
          }))
        )
      );
      setShowModal(true);
      return;
    }

    // Se chegou aqui, pode salvar
    console.log("Escala válida - salvando...");
    alert("Escala salva com sucesso!");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    // Opcional: Limpar seleções conflitantes
    const conflictingIds = conflictingTechnicians.map(
      (tech) => technicians.find((t) => t.displayName === tech.name)?.id,
    );

    setBaseTechnicians((prev) =>
      prev.filter((id) => !conflictingIds.includes(id)),
    );
    setVisitTechnicians((prev) =>
      prev.filter((id) => !conflictingIds.includes(id)),
    );
    setOffTechnicians((prev) =>
      prev.filter((id) => !conflictingIds.includes(id)),
    );
  };

  // Filtrar técnicos disponíveis para cada categoria
  const availableForBase = technicians.filter(
    (tech) =>
      !visitTechnicians.includes(tech.id) && !offTechnicians.includes(tech.id),
  );

  const availableForVisit = technicians.filter(
    (tech) =>
      !baseTechnicians.includes(tech.id) && !offTechnicians.includes(tech.id),
  );

  const availableForOff = technicians.filter(
    (tech) =>
      !baseTechnicians.includes(tech.id) && !visitTechnicians.includes(tech.id),
  );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Definir Escalas
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selecionar Técnicos de Base */}
          <div>
            <label
              htmlFor="baseTechnicians"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Técnicos de Base
            </label>
            <select
              id="baseTechnicians"
              multiple
              value={baseTechnicians}
              onChange={(e) =>
                setBaseTechnicians(
                  Array.from(
                    e.target.selectedOptions,
                    (option) => option.value,
                  ),
                )
              }
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {availableForBase.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.displayName}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-2">
              Segure <strong>Ctrl</strong> (ou <strong>Cmd</strong> no Mac) para
              selecionar múltiplos técnicos.
            </p>
          </div>

          {/* Selecionar Técnicos para Visitas */}
          <div>
            <label
              htmlFor="visitTechnicians"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Técnicos para Visitas Técnicas
            </label>
            <select
              id="visitTechnicians"
              multiple
              value={visitTechnicians}
              onChange={(e) =>
                setVisitTechnicians(
                  Array.from(
                    e.target.selectedOptions,
                    (option) => option.value,
                  ),
                )
              }
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {availableForVisit.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.displayName}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-2">
              Segure <strong>Ctrl</strong> (ou <strong>Cmd</strong> no Mac) para
              selecionar múltiplos técnicos.
            </p>
          </div>

          {/* Selecionar Técnicos de Folga */}
          <div>
            <label
              htmlFor="offTechnicians"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Técnicos de Folga
            </label>
            <select
              id="offTechnicians"
              multiple
              value={offTechnicians}
              onChange={(e) =>
                setOffTechnicians(
                  Array.from(
                    e.target.selectedOptions,
                    (option) => option.value,
                  ),
                )
              }
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {availableForOff.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.displayName}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-2">
              Segure <strong>Ctrl</strong> (ou <strong>Cmd</strong> no Mac) para
              selecionar múltiplos técnicos.
            </p>
          </div>

          {/* Botão de Submissão */}
          <div className="text-center">
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg shadow-lg hover:bg-blue-600 transition duration-300"
            >
              Salvar Escala
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Erro */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              Erros na Escala
            </h2>

            <div className="space-y-4">
              {conflictingTechnicians.some((t) =>
                t.categories[0].includes("Alocado em"),
              ) && (
                <div>
                  <h3 className="font-semibold text-gray-800">
                    Conflitos de Alocação:
                  </h3>
                  <ul className="list-disc list-inside text-gray-700">
                    {conflictingTechnicians
                      .filter((t) => t.categories[0].includes("Alocado em"))
                      .map((tech, index) => (
                        <li key={index}>
                          {tech.name} - {tech.categories[0]}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {conflictingTechnicians.some((t) =>
                t.categories[0].includes("Não alocado"),
              ) && (
                <div>
                  <h3 className="font-semibold text-gray-800">
                    Técnicos Não Alocados:
                  </h3>
                  <ul className="list-disc list-inside text-gray-700">
                    {conflictingTechnicians
                      .filter((t) => t.categories[0].includes("Não alocado"))
                      .map((tech, index) => (
                        <li key={index}>
                          {tech.name} - {tech.categories[0]}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={handleCloseModal}
              className="w-full mt-4 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition duration-300"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scales;
