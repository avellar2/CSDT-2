import React, { useEffect, useState, Fragment } from "react";
import { useRouter } from "next/router";
import Select from "react-select";
import { Dialog, Transition } from "@headlessui/react";
import {
  CheckCircle,
  Trash,
  PencilSimple,
  MagnifyingGlass,
} from "phosphor-react"; // Ícones de sucesso, lixeira, lápis e lupa
import { Pagination } from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface SchoolOption {
  value: string;
  label: string;
}

interface TechnicianOption {
  value: number;
  label: string;
}

interface ProblemOption {
  value: string;
  label: string;
}

interface InternalOS {
  id: string;
  setor: string;
  tecnico: string;
  problema: string;
  descricao: string;
  assinado?: string;
  cpf?: string;
  status: string;
  email?: string;
  updatedAt: string;
}

const problemOptions: ProblemOption[] = [
  { value: "computador", label: "Computador" },
  { value: "impressora", label: "Impressora" },
  { value: "troca-de-tonner", label: "Troca de Tonner" },
  { value: "troca-de-equipamento", label: "Troca de Equipamento" },
  { value: "cabeamento", label: "Cabeamento" },
  { value: "outros", label: "Outros" },
];

const CreateInternalOS: React.FC = () => {
  const router = useRouter();
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(
    null,
  );
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [selectedTechnician, setSelectedTechnician] =
    useState<TechnicianOption | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<ProblemOption | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [internalOSList, setInternalOSList] = useState<InternalOS[]>([]);
  const [selectedOS, setSelectedOS] = useState<InternalOS | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Número de OS por página

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await fetch("/api/get-school");
        const data = await response.json();
        const options = data.map((school: { id: string; name: string }) => ({
          value: school.id,
          label: school.name,
        }));
        setSchools(options);
      } catch (error) {
        console.error("Erro ao buscar escolas:", error);
      }
    };

    fetchSchools();
  }, []);

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const response = await fetch("/api/get-technicians");
        const data = await response.json();
        const options = data.map(
          (technician: { id: number; name: string }) => ({
            value: technician.id,
            label: technician.name,
          }),
        );
        setTechnicians(options);
      } catch (error) {
        console.error("Erro ao buscar técnicos:", error);
      }
    };

    fetchTechnicians();
  }, []);

  const fetchInternalOSList = async () => {
    try {
      const response = await fetch("/api/get-internal-os");
      if (!response.ok) {
        throw new Error("Erro ao buscar OS internas");
      }
      const data = await response.json();
      setInternalOSList(data);
    } catch (error) {
      console.error("Erro ao buscar OS internas:", error);
    }
  };

  useEffect(() => {
    fetchInternalOSList();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSchool) {
      alert("Por favor, selecione um setor.");
      return;
    }
    if (!selectedTechnician) {
      alert("Por favor, selecione um técnico.");
      return;
    }
    if (!selectedProblem) {
      alert("Por favor, selecione um problema.");
      return;
    }

    const payload = {
      setor: selectedSchool,
      tecnico: selectedTechnician,
      problema: selectedProblem,
      descricao: (document.getElementById("descricao") as HTMLTextAreaElement)
        .value,
    };

    try {
      const response = await fetch("/api/save-internal-os", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsModalOpen(true); // Abre o modal em caso de sucesso
      } else {
        const errorData = await response.json();
        alert(`Erro ao salvar OS interna: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Erro ao salvar OS interna:", error);
      alert("Erro ao salvar OS interna.");
    }
  };

  const handleEdit = (os: InternalOS) => {
    setSelectedOS(os); // Define a OS selecionada para edição
    setIsEditModalOpen(true); // Abre o modal de edição
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm("Tem certeza que deseja excluir esta OS?");
    if (!confirm) return;

    try {
      const response = await fetch(`/api/delete-internal-os`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        alert("OS excluída com sucesso!");
        setInternalOSList((prev) => prev.filter((os) => os.id !== id));
      } else {
        alert("Erro ao excluir OS.");
      }
    } catch (error) {
      console.error("Erro ao excluir OS:", error);
      alert("Erro ao excluir OS.");
    }
  };

  const handleUpdate = async () => {
    if (!selectedOS) return;

    try {
      const response = await fetch(`/api/update-internal-os`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedOS),
      });

      if (response.ok) {
        alert("OS atualizada com sucesso!");
        setIsEditModalOpen(false);
        fetchInternalOSList(); // Atualiza a lista de OS
      } else {
        alert("Erro ao atualizar OS.");
      }
    } catch (error) {
      console.error("Erro ao atualizar OS:", error);
      alert("Erro ao atualizar OS.");
    }
  };

  const filteredOSList = internalOSList.filter((os) => {
    const query = searchQuery.toLowerCase();

    return (
      os.tecnico.toLowerCase().includes(query) ||
      os.problema.toLowerCase().includes(query) ||
      os.setor.toLowerCase().includes(query) ||
      os.status.toLowerCase().includes(query) ||
      os.email?.toLowerCase().includes(query) ||
      new Date(os.updatedAt).toLocaleDateString().includes(query)
    );
  });

  const paginatedOSList = filteredOSList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  console.log(paginatedOSList);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Criar OS interna
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="setor"
              className="block text-sm font-bold text-gray-700"
            >
              Setor
            </label>
            <Select
              id="setor"
              options={schools}
              value={selectedSchool}
              onChange={(option) => setSelectedSchool(option)}
              placeholder="Selecione um setor"
              className="mt-1 text-zinc-700"
              isSearchable
              required
            />
          </div>
          <div>
            <label
              htmlFor="tecnico"
              className="block text-sm font-bold text-gray-700"
            >
              Técnico
            </label>
            <Select
              id="tecnico"
              options={technicians}
              value={selectedTechnician}
              onChange={(option) => setSelectedTechnician(option)}
              placeholder="Selecione um técnico"
              className="mt-1 text-zinc-700"
              isSearchable
              required
            />
          </div>
          <div>
            <label
              htmlFor="problema"
              className="block text-sm font-bold text-gray-700"
            >
              Problema
            </label>
            <Select
              id="problema"
              options={problemOptions}
              value={selectedProblem}
              onChange={(option) => setSelectedProblem(option)}
              placeholder="Selecione um problema"
              className="mt-1 text-zinc-700"
              isSearchable
              required
            />
          </div>
          <div>
            <label
              htmlFor="descricao"
              className="block text-sm font-bold text-gray-700"
            >
              Descrição do Problema
            </label>
            <textarea
              id="descricao"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-4"
              rows={4}
              placeholder="Descreva o problema"
            />
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
              onClick={() => router.push("/dashboard")}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Enviar
            </button>
          </div>
        </form>
      </div>

      {/* Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsModalOpen(false)}
        >
          <Transition.Child
            as="div"
            className="fixed inset-0 bg-black bg-opacity-50"
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          />

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4 text-center">
              <Transition.Child
                as="div"
                className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="flex flex-col items-center">
                  <CheckCircle size={48} className="text-green-500 mb-4" />
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Sucesso!
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 text-center">
                      A OS interna foi salva com sucesso.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Fechar
                  </button>
                </div>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Edit Modal */}
      <Transition appear show={isEditModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsEditModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Editar OS
                  </Dialog.Title>
                  <div className="mt-4">
                    <label className="block text-sm text-gray-700">
                      Setor
                    </label>
                    <Select
                      options={schools}
                      value={schools.find(
                        (school) => school.value === selectedOS?.setor,
                      )}
                      onChange={(option) =>
                        setSelectedOS((prev) =>
                          prev ? { ...prev, setor: option?.value || "" } : null,
                        )
                      }
                      placeholder="Selecione um setor"
                      className="mt-1 text-zinc-700"
                      isSearchable
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Técnico
                    </label>
                    <Select
                      options={technicians}
                      value={technicians.find(
                        (technician) =>
                          technician.value === Number(selectedOS?.tecnico),
                      )}
                      onChange={(option) =>
                        setSelectedOS((prev) =>
                          prev
                            ? {
                              ...prev,
                              tecnico: option?.value
                                ? String(option.value)
                                : "",
                            }
                            : null,
                        )
                      }
                      placeholder="Selecione um técnico"
                      className="mt-1 text-zinc-700"
                      isSearchable
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Problema
                    </label>
                    <Select
                      options={problemOptions}
                      value={problemOptions.find(
                        (problem) => problem.value === selectedOS?.problema,
                      )}
                      onChange={(option) =>
                        setSelectedOS((prev) =>
                          prev
                            ? { ...prev, problema: option?.value || "" }
                            : null,
                        )
                      }
                      placeholder="Selecione um problema"
                      className="mt-1 text-zinc-700"
                      isSearchable
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Descrição do Problema
                    </label>
                    <textarea
                      value={selectedOS?.descricao || ""}
                      onChange={(e) =>
                        setSelectedOS((prev) =>
                          prev ? { ...prev, descricao: e.target.value } : null,
                        )
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      rows={4}
                      placeholder="Descreva o problema"
                    />
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={() => setIsEditModalOpen(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={handleUpdate}
                    >
                      Salvar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <div className="w-full max-w-4xl mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">OS Criadas</h2>
        <div className="relative mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por técnico, problema, setor, status, email ou data"
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MagnifyingGlass size={20} className="text-gray-400" />
          </div>
        </div>
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">
                  Setor
                </th>
                <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">
                  Técnico
                </th>
                <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">
                  Problema
                </th>
                <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">
                  Atualizado em
                </th>
                <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedOSList.map((os) => (
                <tr key={os.id} className="border-t">
                  <td className="px-4 py-2 text-sm text-gray-700">{os.setor}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{os.tecnico}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{os.problema}</td>
                  <td
                    className={`px-4 py-2 text-sm font-medium ${os.status === "Pendente"
                      ? "text-yellow-500 bg-yellow-100"
                      : os.status === "Aceita"
                        ? "text-blue-500 bg-blue-100"
                        : os.status === "Concluído"
                          ? "text-green-500 bg-green-100"
                          : "text-gray-700"
                      }`}
                  >
                    {os.status}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {os.email === "Confirmado" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition">
                            Confirmado
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Dados da Confirmação</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <span className="font-semibold">Assinado:</span>&nbsp;
                            {os.assinado || "—"}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <span className="font-semibold">CPF/Matrícula:</span>&nbsp;
                            {os.cpf || "—"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      os.email || "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {new Date(os.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700 flex space-x-2">
                    <button
                      onClick={() => handleEdit(os)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <PencilSimple size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(os.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="mt-4">
          <Pagination
            total={filteredOSList.length}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateInternalOS;
