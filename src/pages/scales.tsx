import React, { useState, useEffect } from "react";

const Scales: React.FC = () => {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]); // Lista de escolas
  const [selectedSchools, setSelectedSchools] = useState<any[]>([]); // Escolas selecionadas
  const [searchText, setSearchText] = useState(""); // Texto de pesquisa
  const [schoolDemands, setSchoolDemands] = useState<{ [key: string]: string }>(
    {},
  ); // Demandas por escola
  const [baseTechnicians, setBaseTechnicians] = useState<string[]>([]);
  const [visitTechnicians, setVisitTechnicians] = useState<string[]>([]);
  const [offTechnicians, setOffTechnicians] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [conflictingTechnicians, setConflictingTechnicians] = useState<
    { name: string; categories: string[] }[]
  >([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const response = await fetch("/api/getTechnicians");
        if (!response.ok) {
          throw new Error("Erro ao buscar técnicos");
        }
        const data = await response.json();
        setTechnicians(data);
      } catch (error) {
        console.error("Erro ao buscar técnicos:", error);
      }
    };

    const fetchSchools = async () => {
      try {
        const response = await fetch("/api/schools");
        if (!response.ok) {
          throw new Error("Erro ao buscar escolas");
        }
        const data = await response.json();
        setSchools(data);
      } catch (error) {
        console.error("Erro ao buscar escolas:", error);
      }
    };

    fetchTechnicians();
    fetchSchools();
  }, []);

  // Filtrar escolas com base no texto de pesquisa
  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  // Adicionar uma escola à lista de selecionadas
  const handleSelectSchool = (school: any) => {
    if (!selectedSchools.some((s) => s.id === school.id)) {
      setSelectedSchools((prev) => [...prev, school]);
    }
    setSearchText(""); // Limpa o campo de pesquisa
  };

  // Remover uma escola da lista de selecionadas
  const handleRemoveSchool = (schoolId: string) => {
    setSelectedSchools((prev) =>
      prev.filter((school) => school.id !== schoolId),
    );
    setSchoolDemands((prev) => {
      const updatedDemands = { ...prev };
      delete updatedDemands[schoolId]; // Remove as demandas da escola removida
      return updatedDemands;
    });
  };

  // Atualizar as demandas de uma escola
  const handleDemandChange = (schoolId: string, demand: string) => {
    setSchoolDemands((prev) => ({
      ...prev,
      [schoolId]: demand,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação existente
    if (selectedSchools.length === 0) {
      alert("Por favor, selecione pelo menos uma escola.");
      return;
    }

    const allSelectedTechnicians = [
      ...baseTechnicians,
      ...visitTechnicians,
      ...offTechnicians,
    ];

    // Verificação de erros (já existente)
    const duplicateTechnicians = Array.from(
      new Set(
        allSelectedTechnicians.filter(
          (techId, index) => allSelectedTechnicians.indexOf(techId) !== index,
        ),
      ),
    );

    const unallocatedTechnicians = technicians.filter(
      (tech) =>
        !baseTechnicians.includes(String(tech.id)) &&
        !visitTechnicians.includes(String(tech.id)),
    );

    const errors: {
      type: "CONFLITO" | "NAO_ALOCADO";
      message: string;
      technicians: { name: string; details: string }[];
    }[] = [];

    if (duplicateTechnicians.length > 0) {
      errors.push({
        type: "CONFLITO",
        message: "Técnicos alocados em mais de uma categoria:",
        technicians: duplicateTechnicians.map((techId) => {
          const tech = technicians.find((t) => String(t.id) === String(techId));
          const categories = [];
          if (baseTechnicians.includes(techId)) categories.push("Base");
          if (visitTechnicians.includes(techId))
            categories.push("Visita Técnica");
          if (offTechnicians.includes(techId)) categories.push("Folga");

          return {
            name: tech?.displayName || "Técnico não encontrado",
            details: `Alocado em: ${categories.join(", ")}`,
          };
        }),
      });
    }

    if (unallocatedTechnicians.length > 0) {
      errors.push({
        type: "NAO_ALOCADO",
        message: "Técnicos não alocados em Base ou Visita Técnica:",
        technicians: unallocatedTechnicians.map((tech) => ({
          name: tech.displayName || "Técnico não encontrado",
          details: "Não está em Base nem Visita Técnica",
        })),
      });
    }

    if (errors.length > 0) {
      setConflictingTechnicians(
        errors.flatMap((error) =>
          error.technicians.map((tech) => ({
            name: tech.name,
            categories: [tech.details],
          })),
        ),
      );
      setShowModal(true);
      return;
    }

    // Se não houver erros, envie os dados para o backend
    try {
      const response = await fetch("/api/saveScale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseTechnicians,
          visitTechnicians,
          offTechnicians,
          schoolDemands,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar escala");
      }

      // Define a mensagem de sucesso e exibe o modal
      setSuccessMessage("Escala salva com sucesso!");
      setShowModal(true);
    } catch (error) {
      console.error("Erro ao salvar escala:", error);
      setConflictingTechnicians([
        {
          name: "Erro no sistema",
          categories: ["Erro ao salvar escala. Tente novamente."],
        },
      ]);
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
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

          <div className="mb-6">
            <label
              htmlFor="searchSchools"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Pesquisar Escolas
            </label>
            <input
              id="searchSchools"
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Digite o nome da escola"
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            {searchText && (
              <ul className="mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredSchools.map((school) => (
                  <li
                    key={school.id}
                    onClick={() => handleSelectSchool(school)}
                    className="p-2 cursor-pointer hover:bg-blue-100 text-zinc-800"
                  >
                    {school.name}
                  </li>
                ))}
                {filteredSchools.length === 0 && (
                  <li className="p-2 text-gray-500">
                    Nenhuma escola encontrada
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Escolas Selecionadas
            </h3>
            {selectedSchools.length > 0 ? (
              <ul className="space-y-4">
                {selectedSchools.map((school) => (
                  <li key={school.id} className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg shadow-sm text-zinc-800">
                      <span>{school.name}</span>
                      <button
                        onClick={() => handleRemoveSchool(school.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remover
                      </button>
                    </div>
                    <textarea
                      value={schoolDemands[school.id] || ""}
                      onChange={(e) =>
                        handleDemandChange(school.id, e.target.value)
                      }
                      placeholder="Adicione as demandas do dia"
                      className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                Nenhuma escola selecionada
              </p>
            )}
          </div>

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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            {successMessage ? (
              // Modal de sucesso
              <>
                <h2 className="text-xl font-bold text-green-600 mb-4">
                  Sucesso!
                </h2>
                <p className="text-gray-700 mb-4">{successMessage}</p>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSuccessMessage(null);
                  }}
                  className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition duration-300"
                >
                  Fechar
                </button>
              </>
            ) : (
              // Modal de erro (existente)
              <>
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
                              <span className="font-medium">{tech.name}</span> -{" "}
                              {tech.categories[0]}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {conflictingTechnicians.some((t) =>
                    t.categories[0].includes("Não está"),
                  ) && (
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        Técnicos Não Alocados:
                      </h3>
                      <ul className="list-disc list-inside text-gray-700">
                        {conflictingTechnicians
                          .filter((t) => t.categories[0].includes("Não está"))
                          .map((tech, index) => (
                            <li key={index}>
                              <span className="font-medium">{tech.name}</span> -{" "}
                              {tech.categories[0]}
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Scales;
