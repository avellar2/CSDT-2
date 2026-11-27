import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useRouter } from "next/router";
import { PDFDocument, PDFCheckBox, PDFTextField } from "pdf-lib";
import { supabase } from "@/lib/supabaseClient";
import { useHeaderContext } from "@/context/HeaderContext";
import { uploadSingleImage } from "@/utils/storageProvider";
import {
  clearLaunchAttempt,
  clearPendingFinalization,
  findPendingForDraft,
  getAttemptRequestId,
  mergePhotoUrls,
  readPendingFinalizations,
  recordAttemptOs,
  serializeFormDraft,
  startNewLaunchAttempt,
  uniqueStrings,
  writePendingFinalization,
  type FinalizationStage,
  type PendingFinalization,
} from "@/utils/osExternaPendingDrafts";
import {
  FINALIZATION_STAGE_LABELS,
  deriveOsExternaFinalization,
} from "@/utils/osExternaFinalization";
import {
  clearPendingPhotos,
  loadPendingPhotos,
  savePendingPhotos,
} from "@/utils/pendingPhotoStore";
import {
  MAX_SOURCE_BYTES,
  isHeicFile,
  isSupportedImageFile,
} from "@/utils/imageCompression";
import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { formSteps } from "@/utils/formSteps";
import initialFormData from "@/utils/itens";
import { formatBrazilDateKey } from "@/utils/dailyDemandOsRules";
import {
  AuthSessionError,
  authedFetch,
  describeRequestError,
  getApiErrorMessage,
  getFreshAccessToken,
} from "@/utils/client-auth";

export interface Escola {
  name: string;
  email: string;
}

export interface DailyDemandAvailability {
  allowed: boolean;
  reason: string | null;
  currentDate: string;
  currentTime: string;
  demandDate: string;
  hasRelease: boolean;
  isVisitTechnician: boolean;
  isWithinBusinessHours: boolean;
}

export interface SchoolPendingDailyDemandAvailability {
  applies: boolean;
  demandId: number | null;
  demandDate: string | null;
  schoolName: string | null;
  availability: DailyDemandAvailability | null;
}

function preservePartnerSuffix(currentValue: string | undefined, primaryTechnician: string) {
  if (!currentValue || currentValue.trim() === '') return primaryTechnician;
  if (!currentValue.includes(" / ")) return primaryTechnician;
  const parts = currentValue.split(" / ").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return primaryTechnician;
  return `${primaryTechnician} / ${parts.slice(1).join(" / ")}`;
}

export interface FormDataType {
  [key: string]: any;
  tecnicoResponsavel: string;
  emailResponsavel: string;
  numeroOs?: string;
  unidadeEscolar?: string;
  data?: string;
  hora?: string;
  /** Mistura arquivos ainda não enviados com URLs já gravadas. */
  fotosAntes: (File | string)[];
  fotosDepois: (File | string)[];
  pcsProprio: NumberConstructor;
  pcsLocado: NumberConstructor;
  notebooksProprio: NumberConstructor;
  notebooksLocado: NumberConstructor;
  monitoresProprio: NumberConstructor;
  monitoresLocado: NumberConstructor;
  estabilizadoresProprio: NumberConstructor;
  estabilizadoresLocado: NumberConstructor;
  tabletsProprio: NumberConstructor;
  tabletsLocado: NumberConstructor;
  pcsProprioOutrosLocais: NumberConstructor;
  pcsLocadoOutrosLocais: NumberConstructor;
  notebooksProprioOutrosLocais: NumberConstructor;
  notebooksLocadoOutrosLocais: NumberConstructor;
  monitoresProprioOutrosLocais: NumberConstructor;
  monitoresLocadoOutrosLocais: NumberConstructor;
  estabilizadoresProprioOutrosLocais: NumberConstructor;
  estabilizadoresLocadoOutrosLocais: NumberConstructor;
  tabletsProprioOutrosLocais: NumberConstructor;
  tabletsLocadoOutrosLocais: NumberConstructor;
  pecasOuMaterial: string;
  relatorio: string;
  solicitacaoDaVisita: string;
  temLaboratorio: boolean | undefined;
  diretoraNaEscola: boolean | undefined;
  redeBr: string;
  educacaoConectada: string;
  naoHaProvedor: string;
  rack: NumberConstructor;
  switch: NumberConstructor;
  roteador: NumberConstructor;
  oki: NumberConstructor;
  kyocera: NumberConstructor;
  hp: NumberConstructor;
  ricoh: NumberConstructor;
  epson: NumberConstructor;
  outrasImpressoras: NumberConstructor;
  temImpressoraComProblema: boolean | undefined;
  relatorioImpressora: string;
  impressoraComProblema: string;
  solucionado: string;
}

/** Situação exibida na tela inicial, sem bloquear o lançamento de outra OS. */
export interface ServerPendingFinalization {
  id: number;
  numeroOs: string;
  unidadeEscolar: string | null;
  tecnicoResponsavel: string | null;
  data: string;
  lastEmailSent?: string | null;
  finalization: {
    stage: string;
    label: string;
    description: string;
    isPendingFinalization: boolean;
    totalFotos: number;
    missingFotos: number;
  };
}

class FinalizationStageError extends Error {
  readonly stage: FinalizationStage;

  constructor(stage: FinalizationStage, message: string) {
    super(message);
    this.name = "FinalizationStageError";
    this.stage = stage;
  }
}

export function useFillPdfForm() {
  const { userName } = useHeaderContext();
  const router = useRouter();

  const [formData, setFormData] = useState<FormDataType>({
    ...initialFormData,
    tecnicoResponsavel: "",
    emailResponsavel: "",
    fotosAntes: [] as File[],
    fotosDepois: [] as File[],
    pcsProprio: Number,
    pcsLocado: Number,
    notebooksProprio: Number,
    notebooksLocado: Number,
    monitoresProprio: Number,
    monitoresLocado: Number,
    estabilizadoresProprio: Number,
    estabilizadoresLocado: Number,
    tabletsProprio: Number,
    tabletsLocado: Number,
    pcsProprioOutrosLocais: Number,
    pcsLocadoOutrosLocais: Number,
    notebooksProprioOutrosLocais: Number,
    notebooksLocadoOutrosLocais: Number,
    monitoresProprioOutrosLocais: Number,
    monitoresLocadoOutrosLocais: Number,
    estabilizadoresProprioOutrosLocais: Number,
    estabilizadoresLocadoOutrosLocais: Number,
    tabletsProprioOutrosLocais: Number,
    tabletsLocadoOutrosLocais: Number,
    pecasOuMaterial: "",
    relatorio: "",
    solicitacaoDaVisita: "",
    temLaboratorio: undefined,
    diretoraNaEscola: undefined,
    redeBr: "",
    educacaoConectada: "",
    naoHaProvedor: "",
    rack: Number,
    switch: Number,
    roteador: Number,
    oki: Number,
    kyocera: Number,
    hp: Number,
    ricoh: Number,
    epson: Number,
    outrasImpressoras: Number,
    temImpressoraComProblema: undefined,
    relatorioImpressora: "",
    impressoraComProblema: "",
    solucionado: "",
  });

  const [localTecnicoName, setLocalTecnicoName] = useState<string>("");
  const [localUserId, setLocalUserId] = useState<string>("");
  const [isLoadingTecnico, setIsLoadingTecnico] = useState(true);
  const [dailyDemandAvailability, setDailyDemandAvailability] = useState<DailyDemandAvailability | null>(null);
  const [isCheckingDailyDemandAvailability, setIsCheckingDailyDemandAvailability] = useState(false);
  const [schoolPendingAvailability, setSchoolPendingAvailability] = useState<SchoolPendingDailyDemandAvailability | null>(null);
  const [isCheckingSchoolPendingAvailability, setIsCheckingSchoolPendingAvailability] = useState(false);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [alertDialog, setAlertDialog] = useState<{
    title: string;
    description: string;
    success: boolean;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    tertiaryActionLabel?: string;
    onTertiaryAction?: () => void;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChamadoModal, setShowChamadoModal] = useState(false);
  const [osNumero, setOsNumero] = useState<string>("");
  const [chamadoData, setChamadoData] = useState({ escola: "", titulo: "", descricao: "", categoria: "" });
  const [showToast, setShowToast] = useState<{ message: string; type: "success" | "error" | "warning" | "info" } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [pendingResume, setPendingResume] = useState<{
    numeroOs: string;
    stage: FinalizationStage;
    school: string;
    date: string;
    confirmToken?: string;
    fotosAntes: string[];
    fotosDepois: string[];
    alreadySigned: boolean;
    emailSentToday: boolean;
    /** `lastEmailSent` existe em qualquer data: não reenviar ao retomar. */
    emailEverSent: boolean;
  } | null>(null);
  const submittingRef = useRef(false);
  const sessionNoticeShownRef = useRef(false);
  const [chamadoRetry, setChamadoRetry] = useState<{ osData: FormDataType } | null>(null);
  // Finalizações pendentes não bloqueiam o formulário: a lista é exibida em
  // um aviso e o técnico escolhe retomar, iniciar outra OS ou ver todas.
  const [pendingFinalizations, setPendingFinalizations] = useState<PendingFinalization[]>([]);
  const [serverPendingFinalizations, setServerPendingFinalizations] = useState<ServerPendingFinalization[]>([]);
  const [serverPendingLoaded, setServerPendingLoaded] = useState(false);
  const [pendingPromptDismissed, setPendingPromptDismissed] = useState(false);
  const [pendingReady, setPendingReady] = useState(false);
  const [finalizationProgress, setFinalizationProgress] = useState<{
    label: string;
    current: number;
    total: number;
    stage: string;
  } | null>(null);
  const [uploadFailures, setUploadFailures] = useState<
    { field: "fotosAntes" | "fotosDepois"; fileName: string; reason: string }[]
  >([]);
  const [isResuming, setIsResuming] = useState(false);
  // "Nova OS" explícito: ignora o fallback de deduplicação por conteúdo.
  const forceNewRef = useRef(false);

  const {
    currentStep, totalSteps, completedSteps, goToStep, nextStep, previousStep,
    canProceedToStep, currentStepData, markStepAsCompleted, reset,
  } = useMultiStepForm();

  const showToastMessage = (message: string, type: "success" | "error" | "warning" | "info") => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 4000);
  };

  /**
   * Mostra uma única vez o aviso de sessão, sem derrubar o formulário.
   * Preservar a tela é parte da correção: o técnico não perde o que digitou
   * em Android/iOS quando a sessão vence.
   */
  const notifySessionProblem = (error: unknown): boolean => {
    if (!(error instanceof AuthSessionError)) return false;
    if (!sessionNoticeShownRef.current) {
      sessionNoticeShownRef.current = true;
      setAlertDialog({
        title: error.reason === "missing" ? "Sessão necessária" : "Sessão expirada",
        description: error.message,
        success: false,
      });
      // Permite avisar de novo depois que o usuário fechar o diálogo.
      setTimeout(() => {
        sessionNoticeShownRef.current = false;
      }, 5000);
    }
    return true;
  };

  const getOsDateKey = () => {
    const demandDateQuery =
      router.query.origin === "daily-demands" && typeof router.query.demandDate === "string"
        ? router.query.demandDate
        : null;
    return demandDateQuery && /^\d{4}-\d{2}-\d{2}$/.test(demandDateQuery)
      ? demandDateQuery
      : formatBrazilDateKey(new Date());
  };

  /**
   * Retoma EXPLICITAMENTE uma OS já salva. Nunca é chamada automaticamente ao
   * abrir o formulário (exceto por `/fill-pdf-form-2?resume=<numeroOs>`, que é
   * uma escolha explícita do técnico na lista). A autorização é revalidada no
   * backend antes de qualquer dado ser reaproveitado.
   */
  const resumePendingFinalization = async (
    numeroOs: string
  ): Promise<boolean> => {
    if (!numeroOs) return false;
    setIsResuming(true);
    try {
      const response = await authedFetch(
        `/api/os-externa-access?numeroOs=${encodeURIComponent(numeroOs)}`
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setAlertDialog({
          title: "Não foi possível retomar",
          description: `${
            data.error || "A OS salva não pôde ser validada."
          } O rascunho foi preservado.`,
          success: false,
        });
        return false;
      }

      if (data.alreadySigned) {
        clearPendingFinalization(localUserId, numeroOs);
        setPendingFinalizations(readPendingFinalizations(localUserId));
        setServerPendingFinalizations((current) =>
          current.filter((item) => item.numeroOs !== numeroOs)
        );
        setAlertDialog({
          title: "OS já assinada",
          description: `A OS ${numeroOs} já foi assinada pela escola; não há finalização pendente.`,
          success: true,
        });
        return false;
      }

      const local = readPendingFinalizations(localUserId).find(
        (item) => item.numeroOs === numeroOs
      );

      if (data.finalization && data.finalization.isPendingFinalization === false) {
        // Nada técnico pendente (ex.: aguardando assinatura). Não reabre o
        // fluxo de finalização; apenas informa.
        setAlertDialog({
          title: "Sem pendência técnica",
          description: `A OS ${numeroOs} está em "${data.finalization.label}". Não há etapa de finalização do técnico para retomar.`,
          success: true,
        });
        return false;
      }

      const existingFotosAntes = uniqueStrings(data.os?.fotosAntes);
      const existingFotosDepois = uniqueStrings(data.os?.fotosDepois);
      const storedFotosAntes = uniqueStrings(local?.form?.fotosAntes);
      const storedFotosDepois = uniqueStrings(local?.form?.fotosDepois);

      const fotosAntes = mergePhotoUrls(existingFotosAntes, storedFotosAntes);
      const fotosDepois = mergePhotoUrls(existingFotosDepois, storedFotosDepois);

      // Fotos que falharam no upload ficam no IndexedDB do aparelho e voltam
      // para a tela; em outro dispositivo, o backend informa o que já subiu.
      const pendingPhotos = await loadPendingPhotos(numeroOs);

      const confirmToken =
        typeof data.confirmToken === "string" && data.confirmToken
          ? data.confirmToken
          : local?.confirmToken;

      const stage: FinalizationStage =
        (data.finalization?.stage as FinalizationStage) ||
        local?.stage ||
        "fotos";

      setPendingResume({
        numeroOs,
        stage,
        school:
          data.os?.unidadeEscolar || local?.school || "",
        // Data operacional ORIGINAL: retomar outro dia não cria nova OS.
        date: data.os?.data || local?.date || getOsDateKey(),
        confirmToken,
        fotosAntes,
        fotosDepois,
        alreadySigned: false,
        emailSentToday: Boolean(data.emailSentToday),
        emailEverSent: Boolean(data.emailEverSent),
      });
      setOsNumero(numeroOs);

      setFormData((prev) => ({
        ...prev,
        // Reconstrói o formulário com os dados da OS (necessário ao retomar
        // em outro aparelho). Campos editáveis continuam editáveis.
        ...(data.os || {}),
        ...(local?.form || {}),
        // URLs já gravadas nunca são substituídas por arrays vazios.
        fotosAntes: [...fotosAntes, ...pendingPhotos.fotosAntes],
        fotosDepois: [...fotosDepois, ...pendingPhotos.fotosDepois],
      }));

      setPendingPromptDismissed(true);
      setUploadFailures([]);
      // Retoma direto na última etapa, sem obrigar a percorrer o formulário.
      for (let step = 0; step < totalSteps - 1; step++) {
        markStepAsCompleted(step);
      }
      goToStep(totalSteps - 1);

      const missingFiles =
        pendingPhotos.fotosAntes.length + pendingPhotos.fotosDepois.length;
      setAlertDialog({
        title: "Finalização retomada",
        description: `A OS ${numeroOs} foi carregada a partir da etapa "${
          FINALIZATION_STAGE_LABELS[stage] || stage
        }". O número, a data original e as fotos já enviadas serão preservados.${
          missingFiles
            ? ` ${missingFiles} foto(s) que falharam foram recuperadas neste aparelho; reenvie-as ao finalizar.`
            : stage === "fotos"
            ? " Selecione novamente as fotos que faltam e finalize."
            : ""
        }`,
        success: true,
      });
      return true;
    } catch (error) {
      if (!notifySessionProblem(error)) {
        setAlertDialog({
          title: "Não foi possível retomar",
          description: `${describeRequestError(
            error,
            "Falha ao validar a OS salva."
          )} O rascunho foi preservado.`,
          success: false,
        });
      }
      return false;
    } finally {
      setIsResuming(false);
    }
  };

  /**
   * "Iniciar nova OS" preserva TODOS os rascunhos/pendências existentes,
   * gera uma nova tentativa (novo clientRequestId) e não reutiliza dados,
   * fotos, token ou número da OS anterior.
   */
  const startNewOs = () => {
    forceNewRef.current = true;
    startNewLaunchAttempt(localUserId);
    setPendingResume(null);
    setOsNumero("");
    setPendingPromptDismissed(true);
    setUploadFailures([]);
    setFinalizationProgress(null);
    showToastMessage(
      "Nova OS iniciada. As finalizações pendentes foram preservadas.",
      "info"
    );
  };

  // Carrega a lista de pendências (local + banco) apenas para AVISAR. Nenhum
  // rascunho é restaurado automaticamente.
  useEffect(() => {
    if (!localUserId || !router.isReady) return;
    let cancelled = false;

    const loadPending = async () => {
      if (!cancelled) {
        setPendingFinalizations(readPendingFinalizations(localUserId));
      }
      try {
        const response = await authedFetch("/api/os-externas-pendentes");
        if (!response.ok) return;
        const data = await response.json().catch(() => null);
        if (!cancelled && data && Array.isArray(data.data)) {
          setServerPendingFinalizations(data.data);
          setServerPendingLoaded(true);
        }
      } catch (error) {
        notifySessionProblem(error);
      } finally {
        if (!cancelled) setPendingReady(true);
      }
    };

    loadPending();

    return () => {
      cancelled = true;
    };
  }, [localUserId, router.isReady]);

  // Retomada explícita via URL (`?resume=123/2026`), usada pela lista de OS.
  useEffect(() => {
    if (!localUserId || !router.isReady) return;
    const resume = router.query.resume;
    if (typeof resume === "string" && resume.trim()) {
      void resumePendingFinalization(resume.trim());
    }
  }, [localUserId, router.isReady, router.query.resume]);

  // Pre-fill form from URL parameters
  useEffect(() => {
    if (router.isReady) {
      const { schoolName, demand } = router.query;
      if (schoolName || demand) {
        setFormData((prev) => ({
          ...prev,
          unidadeEscolar: (schoolName as string) || prev.unidadeEscolar,
          solicitacaoDaVisita: (demand as string) || prev.solicitacaoDaVisita,
        }));
        if (schoolName) showToastMessage(`Escola pre-selecionada: ${schoolName}`, "info");
      }
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    const fetchDailyDemandAvailability = async () => {
      if (!router.isReady || !localUserId || router.query.origin !== "daily-demands") {
        setDailyDemandAvailability(null);
        return;
      }
      const demandDate = router.query.demandDate;
      if (typeof demandDate !== "string") { setDailyDemandAvailability(null); return; }
      try {
        setIsCheckingDailyDemandAvailability(true);
        const demandId = router.query.demandId;
        const demandIdParam =
          typeof demandId === "string" && demandId
            ? `&demandId=${encodeURIComponent(demandId)}`
            : "";
        const response = await authedFetch(`/api/daily-demands/os-availability?date=${encodeURIComponent(demandDate)}${demandIdParam}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Erro ao validar disponibilidade da OS");
        setDailyDemandAvailability(data);
      } catch (availabilityError) {
        notifySessionProblem(availabilityError);
        setDailyDemandAvailability({
          allowed: false,
          reason: availabilityError instanceof Error ? availabilityError.message : "Erro ao validar disponibilidade da OS",
          currentDate: "", currentTime: "",
          demandDate: typeof router.query.demandDate === "string" ? router.query.demandDate : "",
          hasRelease: false, isVisitTechnician: false, isWithinBusinessHours: false,
        });
      } finally {
        setIsCheckingDailyDemandAvailability(false);
      }
    };
    fetchDailyDemandAvailability();
  }, [router.isReady, router.query.origin, router.query.demandDate, router.query.demandId, localUserId]);

  // Calculate form completion progress
  const calculateProgress = () => {
    const totalFields = formSteps.reduce((acc, step) => acc + step.fields.length, 0);
    const filledFields = formSteps.reduce((acc, step) => {
      const stepFilledFields = step.fields.filter((field) => {
        const value = formData[field];
        if (Array.isArray(value)) return value.length > 0;
        if (field === "temLaboratorio" || field === "temImpressoraComProblema") {
          return value !== undefined && value !== null && typeof value === "boolean";
        }
        const labFields = ["pcsProprio", "pcsLocado", "notebooksProprio", "notebooksLocado",
          "monitoresProprio", "monitoresLocado", "estabilizadoresProprio", "estabilizadoresLocado", "tabletsProprio", "tabletsLocado"];
        if (labFields.includes(field) && formData.temLaboratorio === false) return true;
        const printerProblemFields = ["relatorioImpressora", "impressoraComProblema"];
        if (printerProblemFields.includes(field) && formData.temImpressoraComProblema === false) return true;
        return value && value.toString().trim() !== "";
      });
      return acc + stepFilledFields.length;
    }, 0);
    setProgress(Math.round((filledFields / totalFields) * 100));
  };

  const calculateStepProgress = () => {
    const currentStepFields = currentStepData.fields;
    const filledFields = currentStepFields.filter((field) => {
      const value = formData[field];
      if (Array.isArray(value)) return true;
      if (field === "temLaboratorio" || field === "temImpressoraComProblema") {
        return value !== undefined && value !== null && typeof value === "boolean";
      }
      const labFields = ["pcsProprio", "pcsLocado", "notebooksProprio", "notebooksLocado",
        "monitoresProprio", "monitoresLocado", "estabilizadoresProprio", "estabilizadoresLocado", "tabletsProprio", "tabletsLocado"];
      if (labFields.includes(field) && formData.temLaboratorio === false) return true;
      const printerProblemFields = ["relatorioImpressora", "impressoraComProblema"];
      if (printerProblemFields.includes(field) && formData.temImpressoraComProblema === false) return true;
      return value && value.toString().trim() !== "";
    });
    return Math.round((filledFields.length / currentStepFields.length) * 100);
  };

  useEffect(() => {
    const fetchEscolas = async () => {
      try {
        const response = await authedFetch("/api/schools");
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            (data && typeof data.error === "string" && data.error) ||
              "Erro ao carregar escolas."
          );
        }
        if (!Array.isArray(data)) {
          throw new Error("Resposta inválida ao carregar escolas.");
        }
        setEscolas(data);
        showToastMessage("Escolas carregadas com sucesso!", "success");
      } catch (error) {
        if (!notifySessionProblem(error)) {
          showToastMessage(
            describeRequestError(error, "Erro ao carregar escolas. Tente novamente."),
            "error"
          );
        }
      }
    };
    fetchEscolas();
  }, []);

  useEffect(() => { calculateProgress(); }, [formData]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  /**
   * Acrescenta fotos sem apagar as que já foram enviadas (URLs) nem as que
   * falharam. Rejeita apenas arquivos realmente inválidos, informando o
   * motivo individual — uma foto HEIC/corrompida não derruba as demais.
   */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    const field = name as "fotosAntes" | "fotosDepois";
    if (!files || files.length === 0) return;

    const incoming = Array.from(files);
    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const file of incoming) {
      if (isHeicFile(file)) {
        rejected.push(`${file.name}: formato HEIC/HEIF não suportado.`);
        continue;
      }
      if (!isSupportedImageFile(file)) {
        rejected.push(`${file.name}: formato não suportado (use JPG, PNG ou WEBP).`);
        continue;
      }
      if (file.size <= 0) {
        rejected.push(`${file.name}: arquivo vazio.`);
        continue;
      }
      if (file.size > MAX_SOURCE_BYTES) {
        rejected.push(
          `${file.name}: acima de ${Math.round(
            MAX_SOURCE_BYTES / (1024 * 1024)
          )} MB.`
        );
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length) {
      setFormData((prev) => {
        const current = Array.isArray(prev[field]) ? prev[field] : [];
        return { ...prev, [field]: [...current, ...accepted] };
      });
      setIsDirty(true);
      showToastMessage(
        `${accepted.length} foto(s) adicionada(s). Elas serão comprimidas antes do envio.`,
        "success"
      );
    }

    if (rejected.length) {
      showToastMessage(
        `Foto(s) não adicionada(s): ${rejected.slice(0, 3).join(" ")}`,
        "error"
      );
    }

    // Permite selecionar novamente o mesmo arquivo depois de removê-lo.
    e.target.value = "";
  };

  const handleRemoveFile = (field: "fotosAntes" | "fotosDepois", index: number) => {
    setFormData((prev) => {
      const current = Array.isArray(prev[field]) ? [...prev[field]] : [];
      if (index < 0 || index >= current.length) return prev;
      current.splice(index, 1);
      return { ...prev, [field]: current };
    });
    setIsDirty(true);
  };

  const handleSelectChange = async (selectedOption: any) => {
    if (!selectedOption?.value) {
      setFormData((prev) => ({ ...prev, unidadeEscolar: "", emailResponsavel: "" }));
      setSchoolPendingAvailability(null);
      return;
    }
    const selectedSchoolName = selectedOption.value as string;
    const selectedEscola = escolas.find((escola) => escola.name === selectedSchoolName);

    if (router.query.origin !== "daily-demands") {
      try {
        setIsCheckingSchoolPendingAvailability(true);
        const response = await authedFetch(
          `/api/daily-demands/school-os-availability?schoolName=${encodeURIComponent(selectedSchoolName)}`
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Erro ao validar pendencia da escola");
        setSchoolPendingAvailability(data);
        if (data.applies && data.availability && !data.availability.allowed) {
          setFormData((prev) => ({ ...prev, unidadeEscolar: "", emailResponsavel: "" }));
          setAlertDialog({ title: "Escola bloqueada", description: data.availability.reason || "Esta escola esta bloqueada para lancamento de OS.", success: false });
          return;
        }
      } catch (error) {
        if (notifySessionProblem(error)) return;
        setAlertDialog({
          title: "Erro ao validar escola",
          description: `${describeRequestError(error, "Erro ao validar a escola selecionada.")} A escola não foi selecionada; tente novamente.`,
          success: false,
        });
        return;
      } finally {
        setIsCheckingSchoolPendingAvailability(false);
      }
    }

    setFormData((prev) => ({ ...prev, unidadeEscolar: selectedSchoolName, emailResponsavel: selectedEscola ? selectedEscola.email : "" }));
    setIsDirty(true);
  };

  useEffect(() => {
    const fetchSchoolPendingAvailability = async () => {
      if (!router.isReady || router.query.origin === "daily-demands" || !formData.unidadeEscolar) {
        setSchoolPendingAvailability(null);
        setIsCheckingSchoolPendingAvailability(false);
        return;
      }
      try {
        setIsCheckingSchoolPendingAvailability(true);
        const response = await authedFetch(
          `/api/daily-demands/school-os-availability?schoolName=${encodeURIComponent(formData.unidadeEscolar)}`
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Erro ao validar pendencia da escola");
        setSchoolPendingAvailability(data);
      } catch (error) {
        notifySessionProblem(error);
        setSchoolPendingAvailability(null);
      } finally {
        setIsCheckingSchoolPendingAvailability(false);
      }
    };
    fetchSchoolPendingAvailability();
  }, [router.isReady, router.query.origin, formData.unidadeEscolar]);

  const handleNext = () => {
    if (canProceedToStep(currentStep + 1, formData)) {
      markStepAsCompleted(currentStep);
      nextStep();
      showToastMessage(`Etapa "${currentStepData.title}" concluida!`, "success");
    } else {
      showToastMessage("Preencha todos os campos obrigatorios antes de continuar.", "warning");
    }
  };

  const handlePrevious = () => { previousStep(); };

  const handleStepClick = (step: number) => {
    const maxAllowedStep = Math.max(...completedSteps, currentStep);
    if (step <= maxAllowedStep + 1) goToStep(step);
  };

  const generatePdfBytes = async (data: FormDataType): Promise<string> => {
    const pdfBytes = await fetch("/os-externa2-EDITADA.pdf").then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    form.getTextField("UNIDADE ESCOLAR").setText(data.unidadeEscolar || "");
    form.getTextField("NUMERO OS").setText(data.numeroOs || "");
    form.getTextField("DATA").setText(data.data || "");
    form.getTextField("HORA").setText(data.hora || "");
    form.getTextField("TECNICO RESPONSAVEL").setText(data.tecnicoResponsavel || "");
    form.getTextField("LAB_PC_P").setText(data.pcsProprio?.toString() || "");
    form.getTextField("LAB_PC_L").setText(data.pcsLocado?.toString() || "");
    form.getTextField("LAB_ESTABILIZADOR_P").setText(data.estabilizadoresProprio?.toString() || "");
    form.getTextField("LAB_ESTABILIZADOR_L").setText(data.estabilizadoresLocado?.toString() || "");
    form.getTextField("OUT_PC_P").setText(data.pcsProprioOutrosLocais?.toString() || "");
    form.getTextField("OUT_PC_L").setText(data.pcsLocadoOutrosLocais?.toString() || "");
    form.getTextField("OUT_ESTABILIZADOR_P").setText(data.estabilizadoresProprioOutrosLocais?.toString() || "");
    form.getTextField("OUT_ESTABILIZADOR_L").setText(data.estabilizadoresLocadoOutrosLocais?.toString() || "");
    form.getTextField("LAB_MONITOR_P").setText(data.monitoresProprio?.toString() || "");
    form.getTextField("LAB_MONITOR_L").setText(data.monitoresLocado?.toString() || "");
    form.getTextField("LAB_TABLET_P").setText(data.tabletsProprio?.toString() || "");
    form.getTextField("LAB_TABLET_L").setText(data.tabletsLocado?.toString() || "");
    form.getTextField("OUT_MONITOR_P").setText(data.monitoresProprioOutrosLocais?.toString() || "");
    form.getTextField("OUT_MONITOR_L").setText(data.monitoresLocadoOutrosLocais?.toString() || "");
    form.getTextField("OUT_TABLET_P").setText(data.tabletsProprioOutrosLocais?.toString() || "");
    form.getTextField("OUT_TABLET_L").setText(data.tabletsLocadoOutrosLocais?.toString() || "");
    form.getTextField("LAB_NOTEBOOK_P").setText(data.notebooksProprio?.toString() || "");
    form.getTextField("LAB_NOTEBOOK_L").setText(data.notebooksLocado?.toString() || "");
    form.getTextField("OUT_NOTEBOOK_P").setText(data.notebooksProprioOutrosLocais?.toString() || "");
    form.getTextField("OUT_NOTEBOOK_L").setText(data.notebooksLocadoOutrosLocais?.toString() || "");
    form.getTextField("RACK").setText(data.rack?.toString() || "");
    form.getTextField("ROTEADOR").setText(data.roteador?.toString() || "");
    form.getTextField("OKI").setText(data.oki?.toString() || "");
    form.getTextField("RICOH").setText(data.ricoh?.toString() || "");
    form.getTextField("SWITCH").setText(data.switch?.toString() || "");
    form.getTextField("KYOCERA").setText(data.kyocera?.toString() || "");
    form.getTextField("PROPRIA").setText(String(data.outrasImpressoras) || "");
    form.getTextField("HP").setText(data.hp?.toString() || "");
    form.getTextField("SOLICITACAO").setText(data.solicitacaoDaVisita || "");
    form.getTextField("PECA").setText(data.pecasOuMaterial || "");
    form.getTextField("RELATORIO").setText(data.relatorio || "");

    const fieldRedeBr = form.getField("REDEBR");
    if (fieldRedeBr instanceof PDFCheckBox) form.getCheckBox("REDEBR").check();
    else if (fieldRedeBr instanceof PDFTextField) form.getTextField("REDEBR").setText(data.redeBr || "");

    const fieldEducacaoConectada = form.getField("EDUCACAOCONECTADA");
    if (fieldEducacaoConectada instanceof PDFCheckBox) form.getCheckBox("EDUCACAOCONECTADA").check();
    else if (fieldEducacaoConectada instanceof PDFTextField) form.getTextField("EDUCACAOCONECTADA").setText(data.educacaoConectada || "");

    const fieldNaoHaProvedor = form.getField("NAOHAPROVEDOR");
    if (fieldNaoHaProvedor instanceof PDFCheckBox) form.getCheckBox("NAOHAPROVEDOR").check();
    else if (fieldNaoHaProvedor instanceof PDFTextField) form.getTextField("NAOHAPROVEDOR").setText(data.naoHaProvedor || "");

    const fieldNaoHaLaboratorio = form.getField("NAOHALABORATORIO");
    if (fieldNaoHaLaboratorio instanceof PDFCheckBox) form.getCheckBox("NAOHALABORATORIO").check();
    else if (fieldNaoHaLaboratorio instanceof PDFTextField) form.getTextField("NAOHALABORATORIO").setText(data.temLaboratorio ? "Sim" : "Nao");

    const fieldSim = form.getField("SIM");
    const fieldNao = form.getField("NAO");
    if (fieldSim instanceof PDFCheckBox) data.solucionado === "Sim" ? fieldSim.check() : fieldSim.uncheck();
    if (fieldNao instanceof PDFCheckBox) data.solucionado === "Nao" ? fieldNao.check() : fieldNao.uncheck();

    const pdfBytesFilled = await pdfDoc.save();
    return Buffer.from(pdfBytesFilled).toString("base64");
  };

  const resetFormData = () => {
    setFormData({
      ...initialFormData,
      tecnicoResponsavel: localTecnicoName, emailResponsavel: "",
      fotosAntes: [] as File[], fotosDepois: [] as File[],
      pcsProprio: Number, pcsLocado: Number,
      notebooksProprio: Number, notebooksLocado: Number,
      monitoresProprio: Number, monitoresLocado: Number,
      estabilizadoresProprio: Number, estabilizadoresLocado: Number,
      tabletsProprio: Number, tabletsLocado: Number,
      pcsProprioOutrosLocais: Number, pcsLocadoOutrosLocais: Number,
      notebooksProprioOutrosLocais: Number, notebooksLocadoOutrosLocais: Number,
      monitoresProprioOutrosLocais: Number, monitoresLocadoOutrosLocais: Number,
      estabilizadoresProprioOutrosLocais: Number, estabilizadoresLocadoOutrosLocais: Number,
      tabletsProprioOutrosLocais: Number, tabletsLocadoOutrosLocais: Number,
      pecasOuMaterial: "", relatorio: "", solicitacaoDaVisita: "",
      temLaboratorio: undefined, diretoraNaEscola: undefined,
      redeBr: "", educacaoConectada: "", naoHaProvedor: "",
      rack: Number, switch: Number, roteador: Number,
      oki: Number, kyocera: Number, hp: Number, ricoh: Number, epson: Number, outrasImpressoras: Number,
      temImpressoraComProblema: undefined, relatorioImpressora: "", impressoraComProblema: "", solucionado: "",
    });
    reset();
    setIsDirty(false);
    setProgress(0);
    setFinalizationProgress(null);
    setUploadFailures([]);
    setOsNumero("");
  };

  const clearForm = () => {
    resetFormData();
    // Limpar o formulário NÃO apaga rascunhos pendentes: eles continuam
    // disponíveis no aviso e na aba "Finalização pendente".
    setPendingResume(null);
    showToastMessage("Formulario limpo com sucesso!", "info");
  };

  const saveDataAndGetNumeroOs = async (
    data: FormDataType
  ): Promise<{
    data: FormDataType;
    numeroOs: string;
    emailEverSent: boolean;
    resumedAcrossDays: boolean;
  }> => {
    const currentDate = new Date();
    // OS lançada a partir de uma demanda usa a data operacional dela; o
    // backend rejeita qualquer divergência entre demanda e OS.
    const osDateKey = getOsDateKey();
    const updatedData = {
      ...data,
      // Data operacional em America/Sao_Paulo (o ISO/UTC adiantava o dia
      // após as 21h de Brasília e quebrava o vínculo com a rota).
      data: osDateKey,
      hora: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(currentDate),
    };
    const clientRequestId = getAttemptRequestId(localUserId, updatedData);

    // NUNCA manda File/Blob no JSON: `JSON.stringify(File)` vira `{}` e o
    // backend gravava uma URL vazia por foto (origem do bug da OS 651/2026).
    const payloadData = {
      ...updatedData,
      fotosAntes: uniqueStrings(updatedData.fotosAntes),
      fotosDepois: uniqueStrings(updatedData.fotosDepois),
    };

    const response = await authedFetch(
      "/api/save-os-externa",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: payloadData,
          context: router.query.origin === "daily-demands"
            ? {
                origin: "daily-demands",
                dailyDemandId: router.query.demandId,
                dailyDemandDate: router.query.demandDate,
                userId: localUserId,
                clientRequestId,
                forceNew: forceNewRef.current,
              }
            : {
                userId: localUserId,
                clientRequestId,
                forceNew: forceNewRef.current,
              },
        }),
      },
      // O endpoint autentica antes de gravar: um 401 não gerou efeito.
      { retryOn401: true }
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.id) {
      throw new Error(result.error || "Erro ao salvar a OS.");
    }

    const numeroOs =
      typeof result.numeroOs === "string" && result.numeroOs
        ? result.numeroOs
        : `${result.id}/${currentDate.getFullYear()}`;

    // A tentativa passa a apontar para o número criado. Recarregar a página
    // ou tentar de novo não cria outra OS.
    recordAttemptOs(localUserId, numeroOs);
    forceNewRef.current = false;

    const adoptedDate =
      typeof result.data === "string" && result.data
        ? result.data
        : osDateKey;

    return {
      // Se o backend recuperou uma tentativa de outro dia, a data original
      // prevalece para não trocar o vínculo com a rota/demanda.
      data: {
        ...updatedData,
        ...payloadData,
        data: adoptedDate,
        numeroOs,
      },
      numeroOs,
      emailEverSent: Boolean(result.emailEverSent),
      resumedAcrossDays: Boolean(result.resumedAcrossDays),
    };
  };

  const criarChamadoAutomatico = async (
    osData: FormDataType
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const chamadoAutomatico = {
        escola: osData.unidadeEscolar,
        titulo: `Reagendamento - OS ${osData.numeroOs} - ${osData.unidadeEscolar}`,
        descricao: `Problema nao solucionado na OS ${osData.numeroOs}. Solicitacao original: ${osData.solicitacaoDaVisita}. Relatorio: ${osData.relatorio}`,
        categoria: "Reagendamento", tecnico: osData.tecnicoResponsavel, osOriginal: osData.numeroOs, automatico: true,
      };
      const response = await authedFetch(
        "/api/chamados-escalas",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chamadoAutomatico),
        },
        // O endpoint autentica antes de gravar e deduplica chamados automáticos.
        { retryOn401: true }
      );
      if (!response.ok) {
        return {
          ok: false,
          error: await getApiErrorMessage(
            response,
            "Erro ao criar o chamado de reagendamento."
          ),
        };
      }
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: describeRequestError(
          error,
          "Erro ao criar o chamado de reagendamento."
        ),
      };
    }
  };

  const retentarChamadoAutomatico = async () => {
    if (!chamadoRetry) return;
    const osData = chamadoRetry.osData;

    setLoading(true);
    const result = await criarChamadoAutomatico(osData);
    setLoading(false);

    if (result.ok) {
      setChamadoRetry(null);
      setAlertDialog({
        title: "Chamado criado",
        description: `O chamado de reagendamento da OS ${osData.numeroOs} foi criado com sucesso.`,
        success: true,
      });
      return;
    }

    setAlertDialog({
      title: "Chamado ainda pendente",
      description: `A OS ${osData.numeroOs} continua salva e enviada, mas o chamado de reagendamento não foi criado: ${result.error}`,
      success: false,
      actionLabel: "Tentar novamente",
      onAction: () => {
        void retentarChamadoAutomatico();
      },
    });
  };

  const oferecerRetentativaChamado = (
    osData: FormDataType,
    error: string
  ) => {
    setChamadoRetry({ osData });
    setAlertDialog({
      title: "OS salva, mas chamado pendente",
      description: `A OS ${osData.numeroOs} foi salva e o e-mail foi enviado, mas o chamado de reagendamento não foi criado: ${error}`,
      success: false,
      actionLabel: "Tentar criar chamado novamente",
      onAction: () => {
        void retentarChamadoAutomatico();
      },
    });
  };

  const markPendingFinalization = (
    numeroOs: string,
    stage: FinalizationStage,
    data: FormDataType,
    confirmToken?: string,
    operationalDate?: string
  ) => {
    writePendingFinalization(localUserId, {
      numeroOs,
      stage,
      at: Date.now(),
      school: String(data.unidadeEscolar || ""),
      // Preserva a data ORIGINAL da OS (não a data do relógio).
      date:
        operationalDate ||
        (typeof data.data === "string" && data.data) ||
        getOsDateKey(),
      confirmToken,
      form: serializeFormDraft(data as unknown as Record<string, unknown>),
    });
    setPendingFinalizations(readPendingFinalizations(localUserId));
  };

  /** Estado auxiliar no banco; nunca interrompe a finalização. */
  const markServerFinalizationStage = async (
    numeroOs: string,
    stage: "fotos" | "token" | "pdf" | "email" | "chamado" | "aguardando-assinatura",
    lastError?: string
  ) => {
    try {
      await authedFetch(
        "/api/os-externa-finalization",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numeroOs, stage, lastError }),
        },
        { retryOn401: true }
      );
    } catch {
      // Tabela ainda não migrada / falha de rede: a derivação pela OS cobre.
    }
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!canProceedToStep(currentStep, formData)) {
      showToastMessage("Preencha todos os campos obrigatorios antes de finalizar.", "warning");
      return;
    }

    const isResume = Boolean(pendingResume);
    // Ao retomar, o número só pode ser reaproveitado para a MESMA escola.
    if (
      isResume &&
      pendingResume!.school &&
      pendingResume!.school !== String(formData.unidadeEscolar || "")
    ) {
      setAlertDialog({
        title: "Escola diferente da OS retomada",
        description:
          "Os dados da tela não pertencem à OS retomada. Volte para a lista, retome a OS correta ou clique em \"Iniciar nova OS\" para lançar um novo atendimento.",
        success: false,
      });
      return;
    }

    submittingRef.current = true;
    sessionNoticeShownRef.current = false;
    setLoading(true);
    setUploadFailures([]);
    setFinalizationProgress({
      label: "Preparando finalização...",
      current: 0,
      total: 0,
      stage: "save",
    });

    const failureDetails: {
      field: "fotosAntes" | "fotosDepois";
      fileName: string;
      reason: string;
    }[] = [];

    // Data ORIGINAL da OS ao retomar; hoje só para lançamento novo.
    let operationalDate = isResume ? pendingResume!.date : getOsDateKey();
    let numeroOs: string | null = isResume ? pendingResume!.numeroOs : null;
    let stage: FinalizationStage = isResume ? pendingResume!.stage : "save";
    let accessConfirmToken: string | null = null;
    let accessEmailEverSent = false;
    let accessChamadoCriado = false;
    let accessFotosAntes: string[] = [];
    let accessFotosDepois: string[] = [];
    let persistErrorMessage: string | null = null;
    let finalData: FormDataType | null = null;

    try {
      if (isResume) {
        // Revalida a propriedade da OS no backend antes de reaproveitar o
        // número. Um rascunho de outro técnico nunca é retomado.
        const accessResponse = await authedFetch(
          `/api/os-externa-access?numeroOs=${encodeURIComponent(pendingResume!.numeroOs)}`
        );
        const accessData = await accessResponse.json().catch(() => ({}));

        if (!accessResponse.ok) {
          setAlertDialog({
            title: "Não foi possível retomar",
            description: `${
              accessData.error || "A OS salva não pôde ser validada."
            } O rascunho foi preservado.`,
            success: false,
          });
          return;
        }

        if (accessData.alreadySigned) {
          clearPendingFinalization(localUserId, pendingResume!.numeroOs);
          setPendingFinalizations(readPendingFinalizations(localUserId));
          setAlertDialog({
            title: "OS já assinada",
            description: `A OS ${pendingResume!.numeroOs} já foi assinada pela escola; não há finalização pendente.`,
            success: true,
          });
          return;
        }

        accessConfirmToken =
          typeof accessData.confirmToken === "string" && accessData.confirmToken
            ? accessData.confirmToken
            : pendingResume!.confirmToken || null;
        accessEmailEverSent = Boolean(accessData.emailEverSent);
        accessChamadoCriado = Boolean(accessData.finalization?.chamadoCriado);
        accessFotosAntes = uniqueStrings(accessData.os?.fotosAntes);
        accessFotosDepois = uniqueStrings(accessData.os?.fotosDepois);

        if (typeof accessData.os?.data === "string" && accessData.os.data) {
          operationalDate = accessData.os.data;
        }
        if (accessData.finalization?.stage) {
          stage = accessData.finalization.stage as FinalizationStage;
        }
      } else {
        // Validações normais de disponibilidade só para lançamentos novos.
        if (router.query.origin === "daily-demands") {
          if (!localUserId || !dailyDemandAvailability) { showToastMessage("Aguardando validacao do tecnico para esta demanda.", "info"); return; }
          if (isCheckingDailyDemandAvailability) { showToastMessage("Aguarde a validacao da demanda antes de finalizar.", "info"); return; }
          if (dailyDemandAvailability && !dailyDemandAvailability.allowed) { showToastMessage(dailyDemandAvailability.reason || "Esta OS nao pode mais ser lancada.", "error"); return; }
        } else if (schoolPendingAvailability?.applies) {
          if (isCheckingSchoolPendingAvailability) { showToastMessage("Aguarde a validacao da escola antes de finalizar.", "info"); return; }
          if (schoolPendingAvailability.availability && !schoolPendingAvailability.availability.allowed) {
            showToastMessage(schoolPendingAvailability.availability.reason || "Esta escola tem uma OS pendente bloqueada.", "error");
            return;
          }
        }
      }

      if (numeroOs) {
        // Retomada: NÃO chama save-os-externa. O número, a data original e o
        // vínculo com demanda/rota são preservados.
        finalData = { ...formData, numeroOs, data: operationalDate };
        setOsNumero(numeroOs);
      } else {
        stage = "save";
        setFinalizationProgress({
          label: "Salvando OS...",
          current: 0,
          total: 0,
          stage: "save",
        });
        const saved = await saveDataAndGetNumeroOs(formData);
        numeroOs = saved.numeroOs;
        operationalDate =
          typeof saved.data.data === "string" && saved.data.data
            ? saved.data.data
            : operationalDate;
        finalData = saved.data;
        accessEmailEverSent = saved.emailEverSent;
        if (!finalData.numeroOs) throw new Error("Numero da OS nao foi gerado corretamente.");
        // Mostra o número imediatamente: se uma etapa seguinte falhar, o
        // técnico já sabe qual OS foi salva.
        setOsNumero(numeroOs);
        markPendingFinalization(numeroOs, "fotos", finalData, undefined, operationalDate);
        void markServerFinalizationStage(numeroOs, "fotos");
      }

      const osNumeroAtual = numeroOs;
      if (!osNumeroAtual || !finalData) {
        throw new Error("Número da OS não foi gerado corretamente.");
      }

      // ---------------- FOTOS ----------------
      stage = "fotos";
      const formAntes = (formData.fotosAntes as (File | string)[]) || [];
      const formDepois = (formData.fotosDepois as (File | string)[]) || [];
      const beforeFiles = formAntes.filter((item): item is File => typeof item !== "string");
      const afterFiles = formDepois.filter((item): item is File => typeof item !== "string");

      let urlAntes = mergePhotoUrls(
        accessFotosAntes,
        pendingResume?.fotosAntes,
        uniqueStrings(formAntes)
      );
      let urlDepois = mergePhotoUrls(
        accessFotosDepois,
        pendingResume?.fotosDepois,
        uniqueStrings(formDepois)
      );

      const failedAntes: File[] = [];
      const failedDepois: File[] = [];
      const totalFiles = beforeFiles.length + afterFiles.length;

      // Grava IMEDIATAMENTE no banco cada foto que subiu. Falha de gravação
      // não interrompe as demais; no fim o fluxo informa a pendência.
      const persistPhotos = async () => {
        persistErrorMessage = null;
        try {
          const response = await authedFetch(
            "/api/update-os-externa-fotos",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                numeroOs: osNumeroAtual,
                fotosAntes: urlAntes,
                fotosDepois: urlDepois,
              }),
            },
            { retryOn401: true }
          );
          if (!response.ok) {
            persistErrorMessage = await getApiErrorMessage(
              response,
              "Erro ao gravar as fotos no banco de dados."
            );
          }
        } catch (error) {
          persistErrorMessage = describeRequestError(
            error,
            "Erro ao gravar as fotos no banco de dados."
          );
        }
      };

      let photoIndex = 0;
      const processPhoto = async (
        field: "fotosAntes" | "fotosDepois",
        file: File
      ) => {
        photoIndex += 1;
        setFinalizationProgress({
          label: `Enviando foto ${photoIndex} de ${totalFiles}`,
          current: photoIndex,
          total: totalFiles,
          stage: "fotos",
        });

        const result = await uploadSingleImage(
          file,
          field === "fotosAntes" ? "fotos-antes" : "fotos-depois",
          osNumeroAtual
        );

        if (result.url) {
          if (field === "fotosAntes") {
            urlAntes = mergePhotoUrls(urlAntes, [result.url]);
          } else {
            urlDepois = mergePhotoUrls(urlDepois, [result.url]);
          }
          await persistPhotos();
          markPendingFinalization(
            osNumeroAtual,
            "fotos",
            {
              ...finalData!,
              fotosAntes: urlAntes,
              fotosDepois: urlDepois,
            },
            accessConfirmToken || pendingResume?.confirmToken,
            operationalDate
          );
        } else {
          const detail = {
            field,
            fileName: result.fileName,
            reason: result.error || "Falha desconhecida no envio.",
          };
          failureDetails.push(detail);
          setUploadFailures((current) => [...current, detail]);
          if (field === "fotosAntes") failedAntes.push(file);
          else failedDepois.push(file);
        }
      };

      for (const file of beforeFiles) {
        await processPhoto("fotosAntes", file);
      }
      for (const file of afterFiles) {
        await processPhoto("fotosDepois", file);
      }

      // Sucessos viram URLs; falhas continuam como File para reenvio.
      setFormData((prev) => ({
        ...prev,
        fotosAntes: [...urlAntes, ...failedAntes],
        fotosDepois: [...urlDepois, ...failedDepois],
      }));

      const totalFotosDisponiveis = urlAntes.length + urlDepois.length;

      if (failureDetails.length > 0) {
        await persistPhotos();
        await savePendingPhotos(osNumeroAtual, {
          fotosAntes: failedAntes,
          fotosDepois: failedDepois,
        });
        markPendingFinalization(
          osNumeroAtual,
          "fotos",
          {
            ...finalData,
            fotosAntes: urlAntes,
            fotosDepois: urlDepois,
          },
          accessConfirmToken || pendingResume?.confirmToken,
          operationalDate
        );
        void markServerFinalizationStage(
          osNumeroAtual,
          "fotos",
          `${failureDetails.length} foto(s) não enviada(s)`
        );

        const resumo = failureDetails
          .slice(0, 4)
          .map((item) => `${item.fileName}: ${item.reason}`)
          .join(" ");
        throw new FinalizationStageError(
          "fotos",
          `${failureDetails.length} foto(s) não foram enviadas. ${resumo}${
            failureDetails.length > 4 ? " ..." : ""
          } As fotos que subiram foram salvas; reenvie apenas as que falharam.`
        );
      }

      if (totalFotosDisponiveis === 0) {
        throw new FinalizationStageError(
          "fotos",
          "Selecione pelo menos uma foto antes de finalizar. As fotos são necessárias para comprovar o atendimento."
        );
      }

      if (persistErrorMessage) {
        throw new FinalizationStageError(
          "fotos",
          `${persistErrorMessage} As fotos foram enviadas, mas ainda não constam no banco. Tente novamente; elas não serão reenviadas.`
        );
      }

      // Tudo subiu e foi persistido: descarta os arquivos pendentes locais.
      await clearPendingPhotos(osNumeroAtual);
      markPendingFinalization(
        osNumeroAtual,
        "token",
        {
          ...finalData,
          fotosAntes: urlAntes,
          fotosDepois: urlDepois,
        },
        accessConfirmToken || pendingResume?.confirmToken,
        operationalDate
      );

      // ---------------- TOKEN ----------------
      stage = "token";
      setFinalizationProgress({
        label: "Gerando documento...",
        current: totalFiles,
        total: totalFiles,
        stage: "token",
      });
      void markServerFinalizationStage(osNumeroAtual, "token");

      const finalDataWithPhotos: FormDataType = {
        ...finalData,
        fotosAntes: urlAntes,
        fotosDepois: urlDepois,
      };

      let effectiveConfirmToken =
        accessConfirmToken ||
        pendingResume?.confirmToken ||
        (await import("uuid")).v4();

      // update-os-externa-token é idempotente: reutiliza um token já gravado
      // e nunca sobrescreve OS assinada.
      if (!accessConfirmToken) {
        const tokenResponse = await authedFetch(
          "/api/update-os-externa-token",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              numeroOs: osNumeroAtual,
              assinado: effectiveConfirmToken,
            }),
          },
          { retryOn401: true }
        );
        if (!tokenResponse.ok) {
          throw new FinalizationStageError(
            "token",
            await getApiErrorMessage(tokenResponse, "Erro ao salvar o token de confirmacao.")
          );
        }
        const tokenData = await tokenResponse.json().catch(() => ({}));
        if (typeof tokenData.token === "string" && tokenData.token) {
          effectiveConfirmToken = tokenData.token;
        }
        accessConfirmToken = effectiveConfirmToken;
      }

      // ---------------- PDF + E-MAIL ----------------
      // Se a OS já foi enviada alguma vez, NÃO reenvia o e-mail só porque
      // mudou o dia — vale também quando o salvamento deduplicou uma OS de
      // outro dia (retomada sem rascunho local).
      const deveEnviarEmail = !accessEmailEverSent;

      if (deveEnviarEmail) {
        stage = "pdf";
        const finalUpdatedData = { ...finalDataWithPhotos, numeroOs: osNumeroAtual };
        const pdfBase64 = await generatePdfBytes(finalUpdatedData);

        const getBaseUrl = () => {
          if (process.env.NODE_ENV === "development") return "http://localhost:3000";
          // Em producao, nunca deixa localhost vazar para links enviados por email
          // (a escola nao teria acesso). Se a env var estiver ausente ou apontando
          // para localhost, cai no dominio de producao.
          return process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes("localhost")
            ? process.env.NEXT_PUBLIC_BASE_URL
            : "https://csdt.vercel.app";
        };
        const confirmUrl = `${getBaseUrl()}/confirmar-os-externa?numeroOs=${finalUpdatedData.numeroOs}&token=${effectiveConfirmToken}`;
        const csdtEmail = process.env.CSDT_EMAIL || "csdt@smeduquedecaxias.rj.gov.br";

        const msg = {
          to: finalUpdatedData.emailResponsavel,
          from: process.env.EMAIL_USER,
          cc: csdtEmail,
          replyTo: `${process.env.EMAIL_USER}, ${csdtEmail}`,
          subject: `OS Externa ${finalUpdatedData.numeroOs} - ${finalUpdatedData.unidadeEscolar}`,
          html: buildEmailHtml(finalUpdatedData, confirmUrl),
          attachments: [{ content: pdfBase64, filename: `OS-Externa-${finalUpdatedData.numeroOs}.pdf`, contentType: "application/pdf", encoding: "base64" }],
          // Permite ao backend não duplicar o e-mail em retentativas.
          osExternaNumero: finalUpdatedData.numeroOs,
        };

        stage = "email";
        setFinalizationProgress({
          label: "Enviando e-mail...",
          current: totalFiles,
          total: totalFiles,
          stage: "email",
        });
        markPendingFinalization(
          osNumeroAtual,
          "email",
          finalUpdatedData,
          effectiveConfirmToken,
          operationalDate
        );
        void markServerFinalizationStage(osNumeroAtual, "email");

        const emailResponse = await authedFetch(
          "/api/send-email",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(msg),
          },
          // send-email autentica antes de enviar; um 401 não disparou e-mail.
          { retryOn401: true }
        );
        if (!emailResponse.ok) {
          throw new FinalizationStageError(
            "email",
            await getApiErrorMessage(emailResponse, "Erro ao enviar o e-mail para a escola.")
          );
        }

        const emailData = await emailResponse.json().catch(() => ({}));
        if (emailData?.ccStatus === "failed") {
          showToastMessage(
            "E-mail enviado à escola, mas a cópia institucional (CC) falhou.",
            "warning"
          );
        }
      } else {
        showToastMessage(
          "Esta OS já havia sido enviada por e-mail; o envio não foi repetido ao retomar.",
          "info"
        );
      }

      // ---------------- CHAMADO DE REAGENDAMENTO ----------------
      const problemaResolvido =
        (finalDataWithPhotos.solucionado ?? formData.solucionado) === "Sim";

      if (!problemaResolvido && !accessChamadoCriado) {
        stage = "chamado";
        setFinalizationProgress({
          label: "Criando chamado de reagendamento...",
          current: totalFiles,
          total: totalFiles,
          stage: "chamado",
        });
        void markServerFinalizationStage(osNumeroAtual, "chamado");

        const chamadoResult = await criarChamadoAutomatico({
          ...finalDataWithPhotos,
          numeroOs: osNumeroAtual,
        });
        if (!chamadoResult.ok) {
          markPendingFinalization(
            osNumeroAtual,
            "chamado",
            finalDataWithPhotos,
            effectiveConfirmToken,
            operationalDate
          );
          void markServerFinalizationStage(
            osNumeroAtual,
            "chamado",
            chamadoResult.error
          );
          oferecerRetentativaChamado(
            { ...finalDataWithPhotos, numeroOs: osNumeroAtual },
            chamadoResult.error
          );
          return;
        }
      }

      // ---------------- CONCLUÍDO ----------------
      setFinalizationProgress({
        label: "Finalizando atendimento...",
        current: totalFiles,
        total: totalFiles,
        stage: "done",
      });

      clearPendingFinalization(localUserId, osNumeroAtual);
      clearLaunchAttempt(localUserId);
      await clearPendingPhotos(osNumeroAtual);
      void markServerFinalizationStage(osNumeroAtual, "aguardando-assinatura");
      setPendingResume(null);
      setPendingFinalizations(readPendingFinalizations(localUserId));
      setServerPendingFinalizations((current) =>
        current.filter((item) => item.numeroOs !== osNumeroAtual)
      );
      setChamadoData((prev) => ({
        ...prev,
        escola: finalDataWithPhotos.unidadeEscolar || "",
      }));

      clearForm();

      if (!problemaResolvido) {
        setAlertDialog({
          title: "Sucesso",
          description: `OS Externa ${osNumeroAtual} enviada por e-mail para ${finalDataWithPhotos.unidadeEscolar}! Como o problema nao foi solucionado, um chamado foi criado automaticamente para reagendamento.`,
          success: true,
        });
      } else {
        setAlertDialog({
          title: "Sucesso",
          description: `OS Externa ${osNumeroAtual} enviada por e-mail para ${finalDataWithPhotos.unidadeEscolar}! O responsavel recebera um e-mail para confirmacao.`,
          success: true,
        });
        setTimeout(() => {
          setAlertDialog(null);
          setShowChamadoModal(true);
        }, 2000);
      }

    } catch (error) {
      const message = describeRequestError(error, "Erro ao processar a OS.");
      const failedStage =
        error instanceof FinalizationStageError ? error.stage : stage;
      const failedLabel =
        FINALIZATION_STAGE_LABELS[failedStage] || String(failedStage);
      const fotoFailure = failedStage === "fotos" && failureDetails.length > 0;

      if (error instanceof AuthSessionError) {
        setAlertDialog({
          title: error.reason === "missing" ? "Sessão necessária" : "Sessão expirada",
          description: `${error.message}${
            numeroOs
              ? ` A OS ${numeroOs} já foi salva e a etapa "${failedLabel}" poderá ser retomada.`
              : ""
          }`,
          success: false,
        });
      } else if (numeroOs) {
        if (finalData) {
          // Preserva URLs de fotos já gravadas/recém-enviadas no rascunho.
          const existingDraft = readPendingFinalizations(localUserId).find(
            (item) => item.numeroOs === numeroOs
          );
          markPendingFinalization(
            numeroOs,
            failedStage,
            {
              ...finalData,
              fotosAntes: mergePhotoUrls(
                existingDraft?.form?.fotosAntes,
                finalData.fotosAntes
              ),
              fotosDepois: mergePhotoUrls(
                existingDraft?.form?.fotosDepois,
                finalData.fotosDepois
              ),
            },
            accessConfirmToken || pendingResume?.confirmToken,
            operationalDate
          );
        }
        setAlertDialog({
          title: fotoFailure
            ? "Algumas fotos não foram enviadas"
            : "OS salva, finalização pendente",
          description: `A OS ${numeroOs} foi salva, mas a etapa "${failedLabel}" não foi concluída: ${message} As fotos que já subiram foram gravadas e o mesmo número de OS será reaproveitado.${
            fotoFailure
              ? " Ao tentar novamente, apenas as fotos com falha serão reenviadas."
              : ""
          }`,
          success: false,
          actionLabel: fotoFailure
            ? "Reenviar apenas as fotos que falharam"
            : "Tentar novamente",
          onAction: () => {
            setAlertDialog(null);
            void handleSubmit();
          },
          secondaryActionLabel: "Salvar pendência e iniciar nova OS",
          onSecondaryAction: () => {
            setAlertDialog(null);
            startNewOs();
            resetFormData();
          },
          tertiaryActionLabel: "Voltar para a lista de OS externas",
          onTertiaryAction: () => {
            setAlertDialog(null);
            void router.push("/os-externas-list");
          },
        });
      } else {
        setAlertDialog({
          title: "Erro ao salvar a OS",
          description: `${message} Os dados preenchidos foram preservados nesta tela. Nenhuma OS foi criada.`,
          success: false,
          actionLabel: "Tentar novamente",
          onAction: () => {
            setAlertDialog(null);
            void handleSubmit();
          },
        });
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
      setFinalizationProgress(null);
    }
  };

  const fetchTecnicoName = async () => {
    try {
      setIsLoadingTecnico(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setLocalTecnicoName(""); setIsLoadingTecnico(false); return; }
      setLocalUserId(user.id);

      const fallback = user.email?.split("@")[0] || "Tecnico";
      const token = await getFreshAccessToken();
      if (token) {
        const response = await authedFetch("/api/user-profile");
        const profile = response.ok ? await response.json().catch(() => null) : null;
        if (profile && profile.displayName) {
          setLocalTecnicoName(profile.displayName);
          setFormData((prev) => ({ ...prev, tecnicoResponsavel: preservePartnerSuffix(prev.tecnicoResponsavel, profile.displayName) }));
        } else {
          setLocalTecnicoName(fallback);
          setFormData((prev) => ({ ...prev, tecnicoResponsavel: preservePartnerSuffix(prev.tecnicoResponsavel, fallback) }));
        }
      } else {
        setLocalTecnicoName(fallback);
        setFormData((prev) => ({ ...prev, tecnicoResponsavel: preservePartnerSuffix(prev.tecnicoResponsavel, fallback) }));
      }
    } catch {
      setLocalTecnicoName("Tecnico");
      setFormData((prev) => ({ ...prev, tecnicoResponsavel: preservePartnerSuffix(prev.tecnicoResponsavel, "Tecnico") }));
    } finally {
      setIsLoadingTecnico(false);
    }
  };

  useEffect(() => { fetchTecnicoName(); }, []);
  useEffect(() => {
    if (userName && !isLoadingTecnico) {
      setLocalTecnicoName(userName);
      setFormData((prev) => ({ ...prev, tecnicoResponsavel: preservePartnerSuffix(prev.tecnicoResponsavel, userName) }));
    }
  }, [userName, isLoadingTecnico]);

  const criarChamadoManual = async () => {
    try {
      if (!chamadoData.titulo || !chamadoData.descricao || !chamadoData.categoria) {
        showToastMessage("Preencha todos os campos obrigatorios", "warning");
        return;
      }
      const chamadoManual = {
        escola: chamadoData.escola, titulo: chamadoData.titulo, descricao: chamadoData.descricao,
        categoria: chamadoData.categoria, tecnico: localTecnicoName, osOriginal: osNumero, automatico: false,
      };
      const response = await authedFetch(
        "/api/chamados-escalas",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chamadoManual),
        },
        { retryOn401: true }
      );
      if (!response.ok) throw new Error("Erro ao criar chamado");
      showToastMessage("Chamado criado com sucesso!", "success");
      setShowChamadoModal(false);
      setChamadoData({ escola: "", titulo: "", descricao: "", categoria: "" });
    } catch {
      showToastMessage("Erro ao criar chamado. Tente novamente.", "error");
    }
  };

  const escolaOptions = escolas.map((escola) => ({ value: escola.name, label: escola.name }));
  const stepProgress = calculateStepProgress();
  const canProceed = canProceedToStep(currentStep, formData);

  // União local + banco, sem duplicar. O banco é a fonte para retomar em
  // outro aparelho; o local cobre o aparelho atual mesmo se a API falhar.
  const pendingOptionsMap = new Map<
    string,
    {
      numeroOs: string;
      school: string;
      date: string;
      label: string;
      source: "server" | "local";
    }
  >();

  for (const item of pendingFinalizations) {
    pendingOptionsMap.set(item.numeroOs, {
      numeroOs: item.numeroOs,
      school: item.school,
      date: item.date,
      label:
        FINALIZATION_STAGE_LABELS[item.stage] || String(item.stage),
      source: "local",
    });
  }

  for (const item of serverPendingFinalizations) {
    pendingOptionsMap.set(item.numeroOs, {
      numeroOs: item.numeroOs,
      school: item.unidadeEscolar || "",
      date: item.data,
      label: item.finalization.label,
      source: "server",
    });
  }

  const pendingOptions = Array.from(pendingOptionsMap.values());
  const showPendingPrompt =
    pendingReady &&
    !pendingPromptDismissed &&
    !pendingResume &&
    pendingOptions.length > 0;

  return {
    // State
    formData, setFormData, localTecnicoName, localUserId, isLoadingTecnico,
    pendingResume,
    dailyDemandAvailability, isCheckingDailyDemandAvailability,
    schoolPendingAvailability, isCheckingSchoolPendingAvailability,
    escolas, alertDialog, setAlertDialog, loading, showChamadoModal, setShowChamadoModal,
    osNumero, chamadoData, setChamadoData, showToast, setShowToast, isDirty, progress, scrollY,
    // Finalização pendente (aviso NÃO bloqueante)
    pendingFinalizations, pendingOptions, showPendingPrompt,
    pendingPromptDismissed, setPendingPromptDismissed,
    serverPendingFinalizations, serverPendingLoaded, pendingReady,
    resumePendingFinalization, startNewOs, isResuming,
    finalizationProgress, uploadFailures,
    // Multi-step
    currentStep, totalSteps, completedSteps, goToStep, nextStep, previousStep, currentStepData,
    // Computed
    escolaOptions, stepProgress, canProceed,
    // Handlers
    showToastMessage, handleInputChange, handleFileChange, handleRemoveFile, handleSelectChange,
    handleNext, handlePrevious, handleStepClick, handleSubmit, criarChamadoManual,
    clearForm,
  };
}

function buildEmailHtml(finalUpdatedData: any, confirmUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1e40af 0%,#2563eb 60%,#0ea5e9 100%);padding:36px 40px;text-align:center;">
            <p style="margin:0 0 4px 0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;font-weight:600;">Prefeitura Municipal de Duque de Caxias</p>
            <p style="margin:0 0 8px 0;font-size:12px;color:rgba(255,255,255,0.6);letter-spacing:1px;">SME — Secretaria Municipal de Educacao</p>
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">CSDT</h1>
            <p style="margin:6px 0 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Coordenadoria de Suporte e Desenvolvimento Tecnologico</p>
          </td>
        </tr>
        <tr>
          <td style="background:#1e40af;padding:0 40px 28px;text-align:center;">
            <span style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;font-size:15px;font-weight:700;padding:8px 24px;border-radius:999px;letter-spacing:0.5px;">
              📋 Ordem de Servico No ${finalUpdatedData.numeroOs}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 0;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e293b;">Prezados responsaveis,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
              A Ordem de Servico referente a sua unidade escolar foi gerada e esta pronta para assinatura eletronica. O PDF completo esta anexado a este email.
            </p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Unidade Escolar</p>
              <p style="margin:0;font-size:17px;font-weight:700;color:#1e293b;">${finalUpdatedData.unidadeEscolar}</p>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td width="33%" style="padding:0 6px 0 0;">
                  <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 16px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:20px;">🧑‍💻</p>
                    <p style="margin:0 0 2px;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Tecnico</p>
                    <p style="margin:0;font-size:13px;font-weight:700;color:#0c4a6e;">${finalUpdatedData.tecnicoResponsavel}</p>
                  </div>
                </td>
                <td width="33%" style="padding:0 3px;">
                  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:20px;">📅</p>
                    <p style="margin:0 0 2px;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Data</p>
                    <p style="margin:0;font-size:13px;font-weight:700;color:#14532d;">${finalUpdatedData.data}</p>
                  </div>
                </td>
                <td width="33%" style="padding:0 0 0 6px;">
                  <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:20px;">🕐</p>
                    <p style="margin:0 0 2px;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Hora</p>
                    <p style="margin:0;font-size:13px;font-weight:700;color:#713f12;">${finalUpdatedData.hora}</p>
                  </div>
                </td>
              </tr>
            </table>
            <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:28px;">
              <p style="margin:0 0 8px;font-size:14px;color:#92400e;line-height:1.5;">
                <strong>⚠️ Acao necessaria:</strong> Esta OS precisa ser assinada eletronicamente para ser concluida. Por favor, utilize o botao abaixo.
              </p>
              <p style="margin:0;font-size:14px;color:#92400e;line-height:1.5;">
                Informamos, respeitosamente, que enquanto esta Ordem de Servico nao for assinada, <strong>o sistema ficara impedido de gerar novos atendimentos para sua unidade escolar</strong>. Contamos com a sua colaboracao para regularizar a situacao o quanto antes.
              </p>
            </div>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${confirmUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(37,99,235,0.35);">
                ✅ &nbsp;Assinar OS Eletronicamente
              </a>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:32px;">
              <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Caso o botao nao funcione, copie o link abaixo:</p>
              <p style="margin:0;font-size:12px;color:#2563eb;word-break:break-all;">${confirmUrl}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">Este e um email automatico. Para duvidas, entre em contato:</p>
            <a href="mailto:csdt@smeduquedecaxias.rj.gov.br" style="font-size:13px;color:#2563eb;font-weight:600;text-decoration:none;">csdt@smeduquedecaxias.rj.gov.br</a>
            <p style="margin:12px 0 0;font-size:11px;color:#cbd5e1;">© ${new Date().getFullYear()} CSDT — Prefeitura de Duque de Caxias</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
}
