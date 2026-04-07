import React, { useEffect, useState, Fragment, useCallback } from "react";
import { useRouter } from "next/router";
import Select from "react-select";
import { Dialog, Transition } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Trash,
  PencilSimple,
  MagnifyingGlass,
  Eye,
  FileText,
  Warning,
  X,
} from "phosphor-react";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/hooks/useToast";
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

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Pendente: {
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-400",
  },
  Aceita: {
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-400",
  },
  "Concluído": {
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-400",
  },
};

const CreateInternalOS: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  // Form state
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianOption | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<ProblemOption | null>(null);
  const [descricao, setDescricao] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [internalOSList, setInternalOSList] = useState<InternalOS[]>([]);
  const [selectedOS, setSelectedOS] = useState<InternalOS | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Parallel data fetching
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [schoolsRes, techniciansRes, osRes] = await Promise.all([
        fetch("/api/get-school"),
        fetch("/api/get-technicians"),
        fetch("/api/get-internal-os"),
      ]);

      const [schoolsData, techniciansData, osData] = await Promise.all([
        schoolsRes.json(),
        techniciansRes.json(),
        osRes.json(),
      ]);

      setSchools(
        schoolsData.map((school: { id: string; name: string }) => ({
          value: school.id,
          label: school.name,
        }))
      );
      setTechnicians(
        techniciansData.map((technician: { id: number; name: string }) => ({
          value: technician.id,
          label: technician.name,
        }))
      );
      setInternalOSList(osData);
    } catch (error) {
      showToast({
        type: "error",
        title: "Erro ao carregar dados",
        message: "Tente recarregar a página.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const resetForm = () => {
    setSelectedSchool(null);
    setSelectedTechnician(null);
    setSelectedProblem(null);
    setDescricao("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSchool) {
      showToast({ type: "warning", title: "Selecione um setor" });
      return;
    }
    if (!selectedTechnician) {
      showToast({ type: "warning", title: "Selecione um técnico" });
      return;
    }
    if (!selectedProblem) {
      showToast({ type: "warning", title: "Selecione um problema" });
      return;
    }
    if (!descricao.trim()) {
      showToast({ type: "warning", title: "Descreva o problema" });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      setor: selectedSchool,
      tecnico: selectedTechnician,
      problema: selectedProblem,
      descricao: descricao.trim(),
    };

    try {
      const response = await fetch("/api/save-internal-os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsSuccessModalOpen(true);
        resetForm();
        await fetchInitialData();
      } else {
        const errorData = await response.json();
        showToast({
          type: "error",
          title: "Erro ao salvar OS",
          message: errorData.error,
        });
      }
    } catch {
      showToast({
        type: "error",
        title: "Erro ao salvar OS interna",
        message: "Verifique sua conexão e tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (os: InternalOS) => {
    setSelectedOS({ ...os });
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/delete-internal-os`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        showToast({ type: "success", title: "OS excluída com sucesso" });
        setInternalOSList((prev) => prev.filter((os) => os.id !== id));
      } else {
        showToast({ type: "error", title: "Erro ao excluir OS" });
      }
    } catch {
      showToast({ type: "error", title: "Erro ao excluir OS" });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedOS) return;
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/update-internal-os`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedOS),
      });

      if (response.ok) {
        showToast({ type: "success", title: "OS atualizada com sucesso" });
        setIsEditModalOpen(false);
        fetchInitialData();
      } else {
        showToast({ type: "error", title: "Erro ao atualizar OS" });
      }
    } catch {
      showToast({ type: "error", title: "Erro ao atualizar OS" });
    } finally {
      setIsUpdating(false);
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
      new Date(os.updatedAt).toLocaleDateString("pt-BR").includes(query)
    );
  });

  const paginatedOSList = filteredOSList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalOS = internalOSList.length;
  const pendentes = internalOSList.filter((os) => os.status === "Pendente").length;
  const aceitas = internalOSList.filter((os) => os.status === "Aceita").length;
  const concluidas = internalOSList.filter((os) => os.status === "Concluído").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <FileText size={36} weight="duotone" className="text-blue-500" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              OS Interna
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Crie e gerencie ordens de serviço internas
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalOS}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-400">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendentes}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Aceitas</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{aceitas}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-400">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Concluídas</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{concluidas}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Form + Table Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-4"
          >
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText size={20} weight="duotone" className="text-indigo-500" />
                  Nova Ordem de Serviço
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Setor
                    </label>
                    <Select
                      options={schools}
                      value={selectedSchool}
                      onChange={(option) => setSelectedSchool(option)}
                      placeholder="Selecione um setor..."
                      className="react-select-container"
                      classNamePrefix="react-select"
                      isSearchable
                      isDisabled={isLoading}
                      noOptionsMessage={() => "Nenhum setor encontrado"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Técnico
                    </label>
                    <Select
                      options={technicians}
                      value={selectedTechnician}
                      onChange={(option) => setSelectedTechnician(option)}
                      placeholder="Selecione um técnico..."
                      className="react-select-container"
                      classNamePrefix="react-select"
                      isSearchable
                      isDisabled={isLoading}
                      noOptionsMessage={() => "Nenhum técnico encontrado"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Problema
                    </label>
                    <Select
                      options={problemOptions}
                      value={selectedProblem}
                      onChange={(option) => setSelectedProblem(option)}
                      placeholder="Selecione o tipo..."
                      className="react-select-container"
                      classNamePrefix="react-select"
                      isSearchable
                      noOptionsMessage={() => "Nenhum problema encontrado"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Descrição do Problema <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none dark:text-white"
                      rows={4}
                      placeholder="Descreva o problema detalhadamente..."
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push("/dashboard")}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Enviando...
                        </span>
                      ) : (
                        "Criar OS"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Table Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-8"
          >
            {/* Search */}
            <div className="relative mb-5">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlass size={20} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Pesquisar por técnico, problema, setor, status ou data..."
                className="w-full pl-12 pr-4 py-3 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
              />
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 w-24" />
                      </div>
                    ))}
                  </div>
                ) : paginatedOSList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <FileText size={48} weight="duotone" className="mb-3" />
                    <p className="text-lg font-medium">Nenhuma OS encontrada</p>
                    <p className="text-sm">Crie uma nova OS usando o formulário ao lado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-800/50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Setor</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Técnico</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Problema</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Confirmação</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Atualizado</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {paginatedOSList.map((os, index) => {
                          const statusStyle = statusConfig[os.status] || {
                            bg: "bg-gray-50 dark:bg-gray-800",
                            text: "text-gray-700 dark:text-gray-300",
                            dot: "bg-gray-400",
                          };
                          return (
                            <motion.tr
                              key={os.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.03 }}
                              className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-medium max-w-[150px] truncate">
                                {os.setor}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                {os.tecnico}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                                {os.problema.replace(/-/g, " ")}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                  {os.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {os.email === "Confirmado" ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">
                                        <CheckCircle size={14} weight="fill" />
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
                                  <span className="text-gray-400 dark:text-gray-500 text-xs">
                                    {os.email || "—"}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {new Date(os.updatedAt).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleEdit(os)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                    title="Editar"
                                  >
                                    <PencilSimple size={18} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(os.id)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash size={18} />
                                  </button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                        title="Ver descrição"
                                      >
                                        <Eye size={18} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-72">
                                      <DropdownMenuLabel>Descrição do Problema</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="whitespace-normal">
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                          {os.descricao || "—"}
                                        </span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {filteredOSList.length > itemsPerPage && (
              <div className="mt-5">
                <Pagination
                  total={filteredOSList.length}
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </div>
            )}
          </motion.div>
        </div>

        {/* Success Modal */}
        <Transition appear show={isSuccessModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setIsSuccessModalOpen(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            </Transition.Child>
            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex items-center justify-center min-h-full p-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-8 text-center align-middle shadow-2xl">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <CheckCircle size={56} weight="duotone" className="text-emerald-500 mx-auto mb-4" />
                    </motion.div>
                    <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      OS Criada com Sucesso!
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                      A ordem de serviço interna foi registrada no sistema.
                    </p>
                    <Button
                      onClick={() => setIsSuccessModalOpen(false)}
                      className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25"
                    >
                      Fechar
                    </Button>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Edit Modal */}
        <Transition appear show={isEditModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setIsEditModalOpen(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            </Transition.Child>
            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex items-center justify-center min-h-full p-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-2xl">
                    <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                      <PencilSimple size={22} className="text-indigo-500" />
                      Editar OS
                    </Dialog.Title>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Setor</label>
                        <Select
                          options={schools}
                          value={schools.find((s) => s.value === selectedOS?.setor)}
                          onChange={(option) =>
                            setSelectedOS((prev) =>
                              prev ? { ...prev, setor: option?.value || "" } : null
                            )
                          }
                          placeholder="Selecione um setor"
                          className="react-select-container"
                          classNamePrefix="react-select"
                          isSearchable
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Técnico</label>
                        <Select
                          options={technicians}
                          value={technicians.find((t) => t.value === Number(selectedOS?.tecnico))}
                          onChange={(option) =>
                            setSelectedOS((prev) =>
                              prev ? { ...prev, tecnico: option?.value ? String(option.value) : "" } : null
                            )
                          }
                          placeholder="Selecione um técnico"
                          className="react-select-container"
                          classNamePrefix="react-select"
                          isSearchable
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Problema</label>
                        <Select
                          options={problemOptions}
                          value={problemOptions.find((p) => p.value === selectedOS?.problema)}
                          onChange={(option) =>
                            setSelectedOS((prev) =>
                              prev ? { ...prev, problema: option?.value || "" } : null
                            )
                          }
                          placeholder="Selecione um problema"
                          className="react-select-container"
                          classNamePrefix="react-select"
                          isSearchable
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Descrição</label>
                        <textarea
                          value={selectedOS?.descricao || ""}
                          onChange={(e) =>
                            setSelectedOS((prev) =>
                              prev ? { ...prev, descricao: e.target.value } : null
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none dark:text-white"
                          rows={4}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setIsEditModalOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                        onClick={handleUpdate}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Salvando...
                          </span>
                        ) : (
                          "Salvar"
                        )}
                      </Button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Delete Confirmation Modal */}
        <Transition appear show={deleteConfirmId !== null} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setDeleteConfirmId(null)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            </Transition.Child>
            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex items-center justify-center min-h-full p-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-8 text-center align-middle shadow-2xl">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <Warning size={56} weight="duotone" className="text-red-500 mx-auto mb-4" />
                    </motion.div>
                    <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Excluir OS?
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                      Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25"
                        onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Excluindo...
                          </span>
                        ) : (
                          "Excluir"
                        )}
                      </Button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>
    </div>
  );
};

export default CreateInternalOS;

export const getServerSideProps = async () => ({ props: {} });
