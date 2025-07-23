import React, { useState, useEffect } from "react";

const Scales: React.FC = () => {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [schoolDemands, setSchoolDemands] = useState<{ [key: string]: string }>(
    {},
  );
  const [baseTechnicians, setBaseTechnicians] = useState<string[]>([]);
  const [visitTechnicians, setVisitTechnicians] = useState<string[]>([]);
  const [offTechnicians, setOffTechnicians] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [conflictingTechnicians, setConflictingTechnicians] = useState<
    { name: string; categories: string[] }[]
  >([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // MODIFICAR: Tornar errorMessage um objeto
  const [errorMessage, setErrorMessage] = useState<{
    title: string;
    schoolName: string;
    totalPending: number;
    details: string;
    instruction: string;
  } | null>(null);

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
  const handleSelectSchool = async (school: any) => {
    console.log(`🏫 Tentando selecionar escola:`, school); // Esta linha já existe
    console.log(`🔍 ID da escola sendo enviado:`, school.id); // ADICIONAR
    console.log(`🔍 Tipo do ID:`, typeof school.id); // ADICIONAR

    // Verificar se a escola já está selecionada
    if (selectedSchools.some((s) => s.id === school.id)) {
      console.log(`ℹ️ Escola já selecionada: ${school.name}`);
      setSearchText("");
      return;
    }

    console.log(`🔍 Verificando OS pendentes antes de adicionar escola...`);
    // NOVA VALIDAÇÃO: Verificar OS pendentes
    const hasPending = await checkPendingOs(school.id);
    if (hasPending) {
      console.log(`❌ Escola BLOQUEADA por OS pendente: ${school.name}`);
      setSearchText("");
      return; // Não adiciona a escola se tiver OS pendente
    }

    console.log(`✅ Escola ADICIONADA com sucesso: ${school.name}`);
    // Se não tiver OS pendente, adiciona normalmente
    setSelectedSchools((prev) => [...prev, school]);
    setSearchText("");
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

    // NOVA VALIDAÇÃO: Verificar OS pendentes para TODAS as escolas selecionadas
    for (const school of selectedSchools) {
      const hasPending = await checkPendingOs(school.id);
      if (hasPending) {
        // Se encontrar alguma escola com OS pendente, para o processo
        return; // A função checkPendingOs já mostra o modal de erro
      }
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
        !visitTechnicians.includes(String(tech.id)) &&
        !offTechnicians.includes(String(tech.id)), // Exclui técnicos de folga
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

  // MODIFICAR: Atualizar a mensagem de erro para ser mais específica
  const checkPendingOs = async (schoolId: string): Promise<boolean> => {
    try {
      console.log(`🔍 Verificando OS pendentes para escola: ${schoolId}`);

      const response = await fetch(`/api/check-pending-os?schoolId=${schoolId}`);
      console.log(`📡 Response status: ${response.status}`);

      const data = await response.json();
      console.log(`📊 Dados recebidos da API:`, data);

      if (data.hasPendingOs) {
        // Buscar o nome da escola para a mensagem
        const school = schools.find(s => s.id === schoolId);
        const schoolName = school ? school.name : 'Escola selecionada';

        console.log(`⚠️ OS pendente encontrada para: ${schoolName}`, {
          totalPending: data.totalPending,
          pendingOsOld: data.pendingOsOld,
          pendingOsNew: data.pendingOsNew
        });

        // NOVA MENSAGEM MELHORADA
        const oldOsText = data.pendingOsOld > 0 ? `${data.pendingOsOld} OS na tabela antiga` : '';
        const newOsText = data.pendingOsNew > 0 ? `${data.pendingOsNew} OS na tabela nova` : '';
        const osDetails = [oldOsText, newOsText].filter(text => text).join(' e ');

        setErrorMessage({
          title: 'OS Pendente Encontrada',
          schoolName: schoolName,
          totalPending: data.totalPending,
          details: osDetails,
          instruction: 'Finalize as OS pendentes antes de criar uma nova escala.'
        });

        setShowModal(true);
        return true;
      }

      console.log(`✅ Nenhuma OS pendente encontrada para escola: ${schoolId}`);
      return false;
    } catch (error) {
      console.error('❌ Erro ao verificar OS pendentes:', error);
      setErrorMessage({
        title: 'Erro de Conexão',
        schoolName: '',
        totalPending: 0,
        details: '',
        instruction: 'Erro ao verificar OS pendentes. Tente novamente.'
      });
      setShowModal(true);
      return true;
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setErrorMessage(null); // ATUALIZADO
    setSuccessMessage(null);

    if (conflictingTechnicians.length > 0) {
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

      setConflictingTechnicians([]);
    }
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
                      required
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {successMessage ? (
              // Modal de sucesso (existente)
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-green-600 mb-4">
                    Sucesso!
                  </h2>
                </div>
                <p className="text-gray-700 mb-6 text-center text-lg">{successMessage}</p>
                <button
                  onClick={handleCloseModal}
                  className="w-full bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition duration-300 text-lg font-medium"
                >
                  Fechar
                </button>
              </>
            ) : errorMessage ? (
              // Modal de erro melhorado para OS pendente
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                    <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.268 19c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-red-600 mb-2">
                    {errorMessage.title}
                  </h2>
                </div>

                {errorMessage.schoolName && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-red-800 mb-4 text-lg">
                      📍 Escola Selecionada:
                    </h3>
                    <p className="text-red-700 text-base mb-4 break-words font-medium">
                      {errorMessage.schoolName}
                    </p>

                    {errorMessage.totalPending > 0 && (
                      <div className="bg-white rounded-md p-4 border border-red-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-red-800 text-lg">
                            📋 OS Pendentes:
                          </span>
                          <span className="bg-red-100 text-red-800 px-3 py-2 rounded-full text-base font-bold">
                            {errorMessage.totalPending}
                          </span>
                        </div>
                        {errorMessage.details && (
                          <p className="text-red-600 text-base font-medium">
                            {errorMessage.details}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-5 mb-6">
                  <div className="flex items-start">
                    <svg className="h-6 w-6 text-yellow-400 mt-1 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-yellow-800 font-semibold text-lg mb-2">Ação Necessária:</h4>
                      <p className="text-yellow-700 text-base font-medium">
                        {errorMessage.instruction}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
                  <div className="flex items-start">
                    <svg className="h-6 w-6 text-blue-400 mt-1 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-blue-800 font-semibold text-lg mb-2">💡 Dica:</h4>
                      <p className="text-blue-800 text-base font-medium">
                        Acesse o painel de OS Externas para finalizar as pendências antes de criar uma nova escala.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCloseModal}
                  className="w-full bg-red-500 text-white py-4 px-6 rounded-lg hover:bg-red-600 transition duration-300 font-semibold text-lg"
                >
                  Entendi
                </button>
              </>
            ) : (
              // Modal de erro de conflitos (existente com melhorias)
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                    <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.268 19c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-red-600 mb-4">
                    Erros na Escala
                  </h2>
                </div>

                <div className="space-y-6">
                  {conflictingTechnicians.some((t) =>
                    t.categories[0].includes("Alocado em"),
                  ) && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                        <h3 className="font-semibold text-gray-800 text-lg mb-3">
                          ⚠️ Conflitos de Alocação:
                        </h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-2">
                          {conflictingTechnicians
                            .filter((t) => t.categories[0].includes("Alocado em"))
                            .map((tech, index) => (
                              <li key={index} className="text-base">
                                <span className="font-medium">{tech.name}</span> - {tech.categories[0]}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  {conflictingTechnicians.some((t) =>
                    t.categories[0].includes("Não está"),
                  ) && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
                        <h3 className="font-semibold text-gray-800 text-lg mb-3">
                          📋 Técnicos Não Alocados:
                        </h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-2">
                          {conflictingTechnicians
                            .filter((t) => t.categories[0].includes("Não está"))
                            .map((tech, index) => (
                              <li key={index} className="text-base">
                                <span className="font-medium">{tech.name}</span> - {tech.categories[0]}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                </div>

                <button
                  onClick={handleCloseModal}
                  className="w-full mt-6 bg-red-500 text-white py-4 px-6 rounded-lg hover:bg-red-600 transition duration-300 font-semibold text-lg"
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
