import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { useHeaderContext } from "@/context/HeaderContext";
import { formatBrazilDateKey } from "@/utils/dailyDemandOsRules";

export interface OsExterna {
  id: number;
  numeroOs: string;
  data: string;
  hora: string;
  unidadeEscolar: string;
  tecnicoResponsavel: string;
  emailResponsavel: string;
  fotosAntes: string[];
  fotosDepois: string[];
  pcsProprio?: number;
  pcsLocado?: number;
  notebooksProprio?: number;
  notebooksLocado?: number;
  monitoresProprio?: number;
  monitoresLocado?: number;
  estabilizadoresProprio?: number;
  estabilizadoresLocado?: number;
  tabletsProprio?: number;
  tabletsLocado?: number;
  pcsProprioOutrosLocais?: number;
  pcsLocadoOutrosLocais?: number;
  notebooksProprioOutrosLocais?: number;
  notebooksLocadoOutrosLocais?: number;
  monitoresProprioOutrosLocais?: number;
  monitoresLocadoOutrosLocais?: number;
  estabilizadoresProprioOutrosLocais?: number;
  estabilizadoresLocadoOutrosLocais?: number;
  tabletsProprioOutrosLocais?: number;
  tabletsLocadoOutrosLocais?: number;
  pecasOuMaterial?: string;
  relatorio?: string;
  solicitacaoDaVisita?: string;
  temLaboratorio?: boolean;
  diretoraNaEscola?: boolean;
  redeBr?: string;
  educacaoConectada?: string;
  naoHaProvedor?: string;
  rack?: number;
  switch?: number;
  roteador?: number;
  oki?: number;
  kyocera?: number;
  hp?: number;
  ricoh?: number;
  outrasImpressoras?: number;
  temImpressoraComProblema?: boolean;
  relatorioImpressora?: string;
  impressoraComProblema?: string;
  solucionado?: string;
  status: string;
  assinado?: string;
  motivoRecusa?: string | null;
  recusadoEm?: string | null;
  cpf?: string;
  cargoResponsavel?: string;
  lastEmailSent?: string;
  updatedAt: string;
  createdAt: string;
}

export interface PendingDailyDemand {
  demandId: number;
  schoolName: string;
  schoolAddress: string;
  schoolDistrict: string;
  description: string;
  createdAt: string;
  demandDate: string;
  visitStatus: string | null;
  visitReason: string | null;
  visitUpdatedBy: string | null;
  responsibleTechnicianIds: number[];
  responsibleTechnicians: string[];
}

export interface NotVisitedDailyDemand {
  demandId: number;
  schoolName: string;
  schoolAddress: string;
  schoolDistrict: string;
  description: string;
  createdAt: string;
  demandDate: string;
  visitReason: string | null;
  visitUpdatedBy: string | null;
  responsibleTechnicians: string[];
}

export function useOsExternasList() {
  const router = useRouter();
  const { userName } = useHeaderContext();
  const [osExternas, setOsExternas] = useState<OsExterna[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOs, setSelectedOs] = useState<OsExterna | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [emailResult, setEmailResult] = useState<{ message: string; escola: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmOsData, setConfirmOsData] = useState<OsExterna | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [pendingDailyDemands, setPendingDailyDemands] = useState<PendingDailyDemand[]>([]);
  const [notVisitedDailyDemands, setNotVisitedDailyDemands] = useState<NotVisitedDailyDemand[]>([]);
  const [notVisitedDate, setNotVisitedDate] = useState(formatBrazilDateKey(new Date()));
  const [showNotVisitedModal, setShowNotVisitedModal] = useState(false);
  const [downloadPdf, setDownloadingPdf] = useState(false);
  const statusFilter = typeof router.query.status === "string" ? router.query.status : "";
  const pendingOnly = statusFilter === "Pendente";

  useEffect(() => {
    if (!router.isReady) return;

    const initializePage = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) { setLoading(false); return; }
        setCurrentUserId(user.id);
        await fetchUserRole(user.id);
        await fetchOsExternas(user.id);
        await fetchPendingDailyDemands(user.id);
        await fetchNotVisitedDailyDemands(user.id, notVisitedDate);
      } catch {
        setLoading(false);
      }
    };

    initializePage();
  }, [router.isReady, router.query.status]);

  useEffect(() => {
    if (!currentUserId || !userRole || !["ADMIN", "ADMTOTAL"].includes(userRole)) {
      setNotVisitedDailyDemands([]);
      return;
    }
    fetchNotVisitedDailyDemands(currentUserId, notVisitedDate);
  }, [currentUserId, userRole, notVisitedDate]);

  const fetchUserRole = async (userIdParam?: string) => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return;
      const effectiveUserId = userIdParam || user.id;
      const response = await fetch(`/api/get-role?userId=${effectiveUserId}`);
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
      }
    } catch {}
  };

  const fetchOsExternas = async (userIdParam?: string) => {
    try {
      const effectiveUserId = userIdParam || currentUserId;
      const params = new URLSearchParams();
      if (effectiveUserId) params.set("userId", effectiveUserId);
      if (statusFilter) params.set("status", statusFilter);
      const response = await fetch(`/api/get-all-os-externas${params.toString() ? `?${params.toString()}` : ""}`);
      if (response.ok) {
        const data = await response.json();
        setOsExternas(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchPendingDailyDemands = async (userIdParam?: string) => {
    try {
      const effectiveUserId = userIdParam || currentUserId;
      const params = new URLSearchParams();
      if (effectiveUserId) params.set("userId", effectiveUserId);
      const response = await fetch(`/api/pending-daily-demands${params.toString() ? `?${params.toString()}` : ""}`);
      if (response.ok) {
        const data = await response.json();
        setPendingDailyDemands(data.data || []);
      } else {
        setPendingDailyDemands([]);
      }
    } catch {
      setPendingDailyDemands([]);
    }
  };

  const fetchNotVisitedDailyDemands = async (userIdParam?: string, dateParam?: string) => {
    try {
      const effectiveUserId = userIdParam || currentUserId;
      const effectiveDate = dateParam || notVisitedDate;
      if (!effectiveUserId || !effectiveDate) { setNotVisitedDailyDemands([]); return; }
      const params = new URLSearchParams({ userId: effectiveUserId, date: effectiveDate });
      const response = await fetch(`/api/not-visited-daily-demands?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setNotVisitedDailyDemands(data.data || []);
      } else {
        setNotVisitedDailyDemands([]);
      }
    } catch {
      setNotVisitedDailyDemands([]);
    }
  };

  const filterOsBySearch = (osList: OsExterna[]) => {
    if (!searchTerm.trim()) return osList;
    return osList.filter((os) =>
      os.numeroOs?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.unidadeEscolar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.tecnicoResponsavel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.emailResponsavel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.assinado?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  const osExternasPendentes = filterOsBySearch(osExternas.filter((os) => os.status === "Pendente"));
  const osExternasAssinadas = filterOsBySearch(osExternas.filter((os) => os.status === "Assinado"));
  const filteredPendingDailyDemands = pendingDailyDemands.filter(
    (demand) =>
      demand.visitStatus !== "NOT_VISITED" &&
      (!searchTerm.trim() ||
        demand.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        demand.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (demand.visitReason || "").toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const todayDateKey = formatBrazilDateKey(new Date());
  const pendingDailyDemandsToday = filteredPendingDailyDemands.filter((d) => d.demandDate === todayDateKey);
  const pendingDailyDemandsPrevious = filteredPendingDailyDemands.filter((d) => d.demandDate < todayDateKey);

  const filteredNotVisitedDailyDemands = notVisitedDailyDemands.filter(
    (demand) =>
      !searchTerm.trim() ||
      demand.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demand.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (demand.visitReason || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const canSendEmailToday = (os: OsExterna) => {
    if (!os.lastEmailSent) return true;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const lastEmailDate = new Date(os.lastEmailSent);
    lastEmailDate.setHours(0, 0, 0, 0);
    return lastEmailDate.getTime() !== hoje.getTime();
  };

  const getLastEmailText = (os: OsExterna) => {
    if (!os.lastEmailSent) return "";
    const lastEmailDate = new Date(os.lastEmailSent);
    const hoje = new Date();
    const diffTime = hoje.getTime() - lastEmailDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Enviado hoje";
    if (diffDays === 1) return "Enviado ontem";
    return `Enviado ha ${diffDays} dias`;
  };

  const handleResendEmail = async (os: OsExterna) => {
    if (!userRole || !["ADMIN", "ADMTOTAL"].includes(userRole)) {
      alert("Voce nao tem permissao para reenviar emails.");
      return;
    }
    if (!canSendEmailToday(os)) {
      setEmailResult({ message: "Ja foi enviado um email para esta OS hoje. Limite: 1 email por OS por dia.", escola: os.unidadeEscolar });
      setShowSuccessModal(true);
      return;
    }
    setConfirmOsData(os);
    setShowConfirmModal(true);
  };

  const confirmResendEmail = async () => {
    if (!confirmOsData) return;
    setShowConfirmModal(false);
    const os = confirmOsData;
    setConfirmOsData(null);

    try {
      setResendingEmail(os.id);
      const response = await fetch("/api/resend-os-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ osId: os.id, unidadeEscolar: os.unidadeEscolar, emailResponsavel: os.emailResponsavel, numeroOs: os.numeroOs }),
      });
      if (response.ok) {
        setEmailResult({ message: "Email reenviado com sucesso!", escola: os.unidadeEscolar });
        setShowSuccessModal(true);
        fetchOsExternas(currentUserId);
        fetchPendingDailyDemands(currentUserId);
      } else {
        const errorData = await response.json();
        setEmailResult({ message: `Erro ao reenviar email: ${errorData.error || "Erro desconhecido"}`, escola: os.unidadeEscolar });
        setShowSuccessModal(true);
      }
    } catch {
      setEmailResult({ message: "Erro ao reenviar email. Tente novamente.", escola: os.unidadeEscolar });
      setShowSuccessModal(true);
    } finally {
      setResendingEmail(null);
    }
  };

  const handleViewDetails = (os: OsExterna) => {
    setSelectedOs(os);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOs(null);
  };

  return {
    // State
    osExternas, loading, selectedOs, showModal, setShowModal,
    searchTerm, setSearchTerm, userRole, resendingEmail,
    showSuccessModal, setShowSuccessModal, emailResult, setEmailResult,
    showConfirmModal, setShowConfirmModal, confirmOsData, setConfirmOsData,
    currentUserId, setCurrentUserId,
    pendingDailyDemands, notVisitedDailyDemands,
    notVisitedDate, setNotVisitedDate,
    showNotVisitedModal, setShowNotVisitedModal,
    downloadPdf, setDownloadingPdf,
    pendingOnly, userName,
    // Computed
    osExternasPendentes, osExternasAssinadas,
    filteredPendingDailyDemands,
    filteredNotVisitedDailyDemands,
    pendingDailyDemandsToday, pendingDailyDemandsPrevious,
    // Handlers
    handleViewDetails, closeModal,
    handleResendEmail, confirmResendEmail,
    canSendEmailToday, getLastEmailText,
    fetchOsExternas, fetchPendingDailyDemands,
  };
}
