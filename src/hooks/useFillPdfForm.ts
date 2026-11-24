import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useRouter } from "next/router";
import { PDFDocument, PDFCheckBox, PDFTextField } from "pdf-lib";
import { supabase } from "@/lib/supabaseClient";
import { useHeaderContext } from "@/context/HeaderContext";
import { uploadFilesWithReport } from "@/utils/storageProvider";
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
  fotosAntes: File[] | string[];
  fotosDepois: File[] | string[];
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

/** Etapas que, depois de salvar a OS, ainda precisam ser concluídas. */
type FinalizationStage = "save" | "fotos" | "token" | "pdf" | "email" | "chamado";

const STAGE_LABELS: Record<FinalizationStage, string> = {
  save: "salvar a OS",
  fotos: "enviar as fotos",
  token: "gerar o token de confirmação",
  pdf: "gerar o PDF",
  email: "enviar o e-mail para a escola",
  chamado: "criar o chamado de reagendamento",
};

const PENDING_FINALIZATION_PREFIX = "csdt:os-externa:finalizacao-pendente:";
const ATTEMPT_PREFIX = "csdt:os-externa:tentativa:";
const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ATTEMPT_MAX_AGE_MS = 10 * 60 * 1000;
const MAX_PENDING_RECORDS = 5;

interface PendingFinalization {
  numeroOs: string;
  stage: FinalizationStage;
  at: number;
  school: string;
  date: string;
  confirmToken?: string;
  form?: Record<string, unknown>;
}

interface LaunchAttempt {
  requestId: string;
  fingerprint: string;
  at: number;
}

class FinalizationStageError extends Error {
  readonly stage: FinalizationStage;

  constructor(stage: FinalizationStage, message: string) {
    super(message);
    this.name = "FinalizationStageError";
    this.stage = stage;
  }
}

function serializeFormDraft(data: FormDataType): Record<string, unknown> {
  const draft: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "fotosAntes" || key === "fotosDepois") {
      draft[key] = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      draft[key] = value;
    }
  }
  return draft;
}

function pendingStorageKey(userId: string): string {
  return `${PENDING_FINALIZATION_PREFIX}${userId}`;
}

/**
 * Rascunhos são por usuário autenticado; um técnico nunca enxerga/retoma a
 * finalização pendente de outro. Vários registros são preservados (não
 * apagamos um rascunho válido só porque outro lançamento começou).
 */
function readPendingFinalizations(userId: string): PendingFinalization[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(pendingStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const list = Array.isArray(parsed)
      ? (parsed as PendingFinalization[])
      : [parsed as PendingFinalization];

    const valid = list.filter(
      (item) =>
        !!item?.numeroOs &&
        Date.now() - Number(item.at || 0) <= PENDING_MAX_AGE_MS
    );

    if (valid.length !== list.length) {
      localStorage.setItem(pendingStorageKey(userId), JSON.stringify(valid));
    }

    return valid.sort((a, b) => Number(b.at || 0) - Number(a.at || 0));
  } catch {
    return [];
  }
}

function writePendingFinalization(
  userId: string,
  pending: PendingFinalization
): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const current = readPendingFinalizations(userId).filter(
      (item) => item.numeroOs !== pending.numeroOs
    );
    const next = [pending, ...current].slice(0, MAX_PENDING_RECORDS);
    localStorage.setItem(pendingStorageKey(userId), JSON.stringify(next));
  } catch {
    // Sem localStorage não é possível retomar; o erro na tela continua claro.
  }
}

function clearPendingFinalization(userId: string, numeroOs: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const next = readPendingFinalizations(userId).filter(
      (item) => item.numeroOs !== numeroOs
    );
    if (next.length) {
      localStorage.setItem(pendingStorageKey(userId), JSON.stringify(next));
    } else {
      localStorage.removeItem(pendingStorageKey(userId));
    }
  } catch {
    // ignora
  }
}

function generateRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fallback abaixo
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && value.trim() !== ""
      )
    )
  );
}

function payloadFingerprint(data: FormDataType, dateKey: string): string {
  return JSON.stringify({
    school: data.unidadeEscolar || "",
    date: dateKey,
    solicitacao: data.solicitacaoDaVisita || "",
    relatorio: data.relatorio || "",
    solucionado: data.solucionado || "",
  });
}

/**
 * Reaproveita o identificador da tentativa enquanto o mesmo usuário reenvia
 * exatamente o mesmo conteúdo (timeout/recarga). Conteúdo diferente gera uma
 * nova tentativa e não bloqueia lançamentos legítimos.
 */
function getAttemptRequestId(
  userId: string,
  data: FormDataType,
  dateKey: string
): string {
  if (typeof window === "undefined" || !userId) return generateRequestId();

  const key = `${ATTEMPT_PREFIX}${userId}`;
  const fingerprint = payloadFingerprint(data, dateKey);

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as LaunchAttempt;
      if (
        parsed?.requestId &&
        parsed.fingerprint === fingerprint &&
        Date.now() - Number(parsed.at || 0) <= ATTEMPT_MAX_AGE_MS
      ) {
        return parsed.requestId;
      }
    }

    const requestId = generateRequestId();
    localStorage.setItem(
      key,
      JSON.stringify({ requestId, fingerprint, at: Date.now() })
    );
    return requestId;
  } catch {
    return generateRequestId();
  }
}

function clearAttemptRequestId(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.removeItem(`${ATTEMPT_PREFIX}${userId}`);
  } catch {
    // ignora
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
  } | null>(null);
  const submittingRef = useRef(false);
  const sessionNoticeShownRef = useRef(false);
  const [chamadoRetry, setChamadoRetry] = useState<{ osData: FormDataType } | null>(null);

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

  // Recupera uma OS que foi salva mas cuja finalização (fotos/token/PDF/e-mail)
  // não terminou. O rascunho é por usuário e a propriedade da OS é validada
  // no backend antes de qualquer retomada.
  useEffect(() => {
    if (!localUserId || !router.isReady) return;

    const pending = readPendingFinalizations(localUserId)[0];
    if (!pending) return;

    let cancelled = false;

    const restore = async () => {
      try {
        const response = await authedFetch(
          `/api/os-externa-access?numeroOs=${encodeURIComponent(pending.numeroOs)}`
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (!cancelled) {
            setAlertDialog({
              title: "Não foi possível retomar",
              description: `${
                data.error || "A OS salva não pôde ser validada."
              } O rascunho foi preservado.`,
              success: false,
            });
          }
          return;
        }

        if (cancelled) return;

        if (data.alreadySigned) {
          clearPendingFinalization(localUserId, pending.numeroOs);
          setAlertDialog({
            title: "OS já assinada",
            description: `A OS ${pending.numeroOs} já foi assinada pela escola; não há finalização pendente.`,
            success: true,
          });
          return;
        }

        const storedFotosAntes = uniqueStrings(pending.form?.fotosAntes);
        const storedFotosDepois = uniqueStrings(pending.form?.fotosDepois);
        const existingFotosAntes = uniqueStrings(data.os?.fotosAntes);
        const existingFotosDepois = uniqueStrings(data.os?.fotosDepois);

        const fotosAntes = Array.from(
          new Set([...existingFotosAntes, ...storedFotosAntes])
        );
        const fotosDepois = Array.from(
          new Set([...existingFotosDepois, ...storedFotosDepois])
        );

        const confirmToken =
          typeof data.confirmToken === "string" && data.confirmToken
            ? data.confirmToken
            : pending.confirmToken;

        setPendingResume({
          numeroOs: pending.numeroOs,
          stage: pending.stage,
          school: pending.school,
          date: pending.date,
          confirmToken,
          fotosAntes,
          fotosDepois,
          alreadySigned: false,
          emailSentToday: Boolean(data.emailSentToday),
        });
        setOsNumero(pending.numeroOs);

        setFormData((prev) => ({
          ...prev,
          ...(pending.form || {}),
          // File objects não são serializáveis; as URLs já enviadas voltam e
          // nunca são substituídas por arrays vazios.
          fotosAntes: fotosAntes.length ? fotosAntes : prev.fotosAntes,
          fotosDepois: fotosDepois.length ? fotosDepois : prev.fotosDepois,
        }));

        setAlertDialog({
          title: "Finalização pendente",
          description: `A OS ${pending.numeroOs} já foi salva, mas a etapa "${
            STAGE_LABELS[pending.stage] || pending.stage
          }" não foi concluída. Os dados foram recuperados. Ao finalizar novamente, o mesmo número de OS será reaproveitado${
            pending.stage === "fotos" ? ". Reenvie as fotos antes de finalizar" : ""
          }. Não altere os dados já salvos; se precisar corrigir, edite a OS pela lista.`,
          success: false,
        });
      } catch (error) {
        if (!cancelled && !notifySessionProblem(error)) {
          setAlertDialog({
            title: "Não foi possível retomar",
            description: `${describeRequestError(
              error,
              "Falha ao validar a OS salva."
            )} O rascunho foi preservado.`,
            success: false,
          });
        }
      }
    };

    restore();

    return () => {
      cancelled = true;
    };
  }, [localUserId, router.isReady]);

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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const oversizedFiles = fileArray.filter((file) => file.size > 10 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        showToastMessage(`Arquivos muito grandes: ${oversizedFiles.map((f) => f.name).join(", ")}`, "error");
        return;
      }
      setFormData((prev) => ({ ...prev, [name]: fileArray }));
      showToastMessage(`${fileArray.length} arquivo(s) selecionado(s) com sucesso!`, "success");
      setIsDirty(true);
    } else {
      setFormData((prev) => ({ ...prev, [name]: [] }));
    }
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

  const clearForm = () => {
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
    if (osNumero) {
      clearPendingFinalization(localUserId, osNumero);
    }
    clearAttemptRequestId(localUserId);
    setPendingResume(null);
    showToastMessage("Formulario limpo com sucesso!", "info");
  };

  const saveDataAndGetNumeroOs = async (data: FormDataType): Promise<FormDataType> => {
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
    const clientRequestId = getAttemptRequestId(localUserId, updatedData, osDateKey);

    const response = await authedFetch(
      "/api/save-os-externa",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: updatedData,
          context: router.query.origin === "daily-demands"
            ? { origin: "daily-demands", dailyDemandId: router.query.demandId, dailyDemandDate: router.query.demandDate, userId: localUserId, clientRequestId }
            : { userId: localUserId, clientRequestId },
        }),
      },
      // O endpoint autentica antes de gravar: um 401 não gerou efeito.
      { retryOn401: true }
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.id) {
      throw new Error(result.error || "Erro ao salvar a OS.");
    }
    return {
      ...updatedData,
      numeroOs:
        typeof result.numeroOs === "string" && result.numeroOs
          ? result.numeroOs
          : `${result.id}/${currentDate.getFullYear()}`,
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
    confirmToken?: string
  ) => {
    writePendingFinalization(localUserId, {
      numeroOs,
      stage,
      at: Date.now(),
      school: String(data.unidadeEscolar || ""),
      date: getOsDateKey(),
      confirmToken,
      form: serializeFormDraft(data),
    });
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!canProceedToStep(currentStep, formData)) {
      showToastMessage("Preencha todos os campos obrigatorios antes de finalizar.", "warning");
      return;
    }
    // Retomada só vale para a mesma escola/data da OS já salva. Rascunhos de
    // outros lançamentos são preservados (não apagados).
    const currentDateKey = getOsDateKey();
    const resumeMatches =
      !!pendingResume &&
      pendingResume.school === String(formData.unidadeEscolar || "") &&
      pendingResume.date === currentDateKey;

    submittingRef.current = true;
    sessionNoticeShownRef.current = false;
    setLoading(true);

    let numeroOs: string | null = resumeMatches ? pendingResume!.numeroOs : null;
    let stage: FinalizationStage = resumeMatches ? pendingResume!.stage : "save";
    let accessConfirmToken: string | null = null;
    let accessFotosAntes: string[] = [];
    let accessFotosDepois: string[] = [];
    let accessEmailSentToday = false;

    try {
      if (resumeMatches) {
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
            : null;
        accessFotosAntes = uniqueStrings(accessData.os?.fotosAntes);
        accessFotosDepois = uniqueStrings(accessData.os?.fotosDepois);
        accessEmailSentToday = Boolean(accessData.emailSentToday);

        if (accessEmailSentToday && pendingResume!.stage === "email") {
          showToastMessage(
            "O e-mail desta OS já consta como enviado hoje; a retentativa não o duplicará.",
            "info"
          );
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

        if (pendingResume) setPendingResume(null);
      }

      let finalData: FormDataType;

      if (numeroOs) {
        // Não chama save-os-externa de novo: o número existente é reaproveitado.
        finalData = { ...formData, numeroOs, data: currentDateKey };
        setOsNumero(numeroOs);
      } else {
        stage = "save";
        finalData = await saveDataAndGetNumeroOs(formData);
        if (!finalData.numeroOs) throw new Error("Numero da OS nao foi gerado corretamente.");
        numeroOs = finalData.numeroOs;
        // Mostra o número imediatamente: se uma etapa seguinte falhar, o
        // técnico já sabe qual OS foi salva.
        setOsNumero(numeroOs);
        markPendingFinalization(numeroOs, "fotos", finalData);
      }

      stage = "fotos";
      const fotosAntesReport = await uploadFilesWithReport(
        (formData.fotosAntes as File[]).filter((file) => typeof file !== "string"),
        "fotos-antes",
        numeroOs
      );
      const fotosDepoisReport = await uploadFilesWithReport(
        (formData.fotosDepois as File[]).filter((file) => typeof file !== "string"),
        "fotos-depois",
        numeroOs
      );

      if (fotosAntesReport.errors.length || fotosDepoisReport.errors.length) {
        const failures = fotosAntesReport.errors.length + fotosDepoisReport.errors.length;
        throw new FinalizationStageError(
          "fotos",
          `Não foi possível enviar ${failures} foto(s). Remova a foto com problema ou tente novamente.`
        );
      }

      // Preserva as URLs já existentes (retomada/acesso) e anexa as novas.
      // Nunca substitui fotos existentes por um array vazio.
      const existingFotosAntes = uniqueStrings([
        ...accessFotosAntes,
        ...(pendingResume?.fotosAntes || []),
        ...(formData.fotosAntes as (File | string)[]).filter(
          (item): item is string => typeof item === "string"
        ),
      ]);
      const existingFotosDepois = uniqueStrings([
        ...accessFotosDepois,
        ...(pendingResume?.fotosDepois || []),
        ...(formData.fotosDepois as (File | string)[]).filter(
          (item): item is string => typeof item === "string"
        ),
      ]);

      const fotosAntesUrls = Array.from(
        new Set([...existingFotosAntes, ...fotosAntesReport.urls])
      );
      const fotosDepoisUrls = Array.from(
        new Set([...existingFotosDepois, ...fotosDepoisReport.urls])
      );

      markPendingFinalization(
        numeroOs,
        "fotos",
        {
          ...finalData,
          fotosAntes: fotosAntesUrls,
          fotosDepois: fotosDepoisUrls,
        },
        resumeMatches ? (accessConfirmToken || pendingResume?.confirmToken) : undefined
      );

      const updateResponse = await authedFetch(
        "/api/update-os-externa-fotos",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numeroOs, fotosAntes: fotosAntesUrls, fotosDepois: fotosDepoisUrls }),
        },
        { retryOn401: true }
      );
      if (!updateResponse.ok) {
        throw new FinalizationStageError(
          "fotos",
          await getApiErrorMessage(updateResponse, "Erro ao gravar as fotos no banco de dados.")
        );
      }

      stage = "token";
      const finalDataWithPhotos = {
        ...finalData,
        fotosAntes: fotosAntesUrls,
        fotosDepois: fotosDepoisUrls,
      };

      // Reutiliza o token já persistido numa tentativa anterior: se o e-mail
      // chegou a sair, o link recebido pela escola continua válido.
      const confirmToken =
        (resumeMatches && (accessConfirmToken || pendingResume?.confirmToken)) ||
        (await import("uuid")).v4();
      let effectiveConfirmToken = confirmToken;

      markPendingFinalization(numeroOs, "token", finalDataWithPhotos, confirmToken);

      // Ao retomar a partir da etapa de e-mail, o token já está gravado no
      // banco (a etapa anterior só concluiu depois do 200). Não regrava para
      // não conflitar com uma OS que a escola já tenha assinado.
      const tokenAlreadyStored =
        resumeMatches &&
        pendingResume?.stage === "email" &&
        !!(accessConfirmToken || pendingResume?.confirmToken);

      if (!tokenAlreadyStored) {
        const tokenResponse = await authedFetch(
          "/api/update-os-externa-token",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numeroOs, assinado: confirmToken }),
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
          // O backend reutiliza um token já gravado; o link precisa usar o
          // mesmo valor que está no banco.
          effectiveConfirmToken = tokenData.token;
        }
      }

      stage = "pdf";
      const finalUpdatedData = {
        ...finalDataWithPhotos,
        numeroOs,
      };
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
      markPendingFinalization(numeroOs, "email", finalUpdatedData, effectiveConfirmToken);

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

      // A OS foi entregue; não há mais o que retomar com o mesmo número.
      clearPendingFinalization(localUserId, numeroOs);
      clearAttemptRequestId(localUserId);
      setPendingResume(null);
      setChamadoData((prev) => ({ ...prev, escola: finalUpdatedData.unidadeEscolar || "" }));

      const problemaResolvido = formData.solucionado === "Sim";
      clearForm();

      if (!problemaResolvido) {
        const chamadoResult = await criarChamadoAutomatico(finalUpdatedData);
        if (chamadoResult.ok) {
          setAlertDialog({ title: "Sucesso", description: `OS Externa ${finalUpdatedData.numeroOs} enviada por e-mail para ${finalUpdatedData.unidadeEscolar}! Como o problema nao foi solucionado, um chamado foi criado automaticamente para reagendamento.`, success: true });
        } else {
          oferecerRetentativaChamado(finalUpdatedData, chamadoResult.error);
        }
      } else {
        setAlertDialog({ title: "Sucesso", description: `OS Externa ${finalUpdatedData.numeroOs} enviada por e-mail para ${finalUpdatedData.unidadeEscolar}! O responsavel recebera um e-mail para confirmacao.`, success: true });
        setTimeout(() => { setAlertDialog(null); setShowChamadoModal(true); }, 2000);
      }
    } catch (error) {
      const message = describeRequestError(error, "Erro ao processar a OS.");
      const failedStage =
        error instanceof FinalizationStageError ? error.stage : stage;

      if (error instanceof AuthSessionError) {
        setAlertDialog({
          title: error.reason === "missing" ? "Sessão necessária" : "Sessão expirada",
          description: `${error.message}${
            numeroOs
              ? ` A OS ${numeroOs} já foi salva; a etapa "${STAGE_LABELS[failedStage]}" não foi concluída e poderá ser retomada.`
              : ""
          }`,
          success: false,
        });
      } else if (numeroOs) {
        setAlertDialog({
          title: "OS salva, finalização pendente",
          description: `A OS ${numeroOs} foi salva, mas a etapa "${STAGE_LABELS[failedStage]}" não foi concluída: ${message} Os dados foram preservados nesta tela. Ao tentar novamente, o mesmo número de OS será reaproveitado.`,
          success: false,
        });
      } else {
        setAlertDialog({
          title: "Erro ao salvar a OS",
          description: `${message} Os dados preenchidos foram preservados nesta tela.`,
          success: false,
        });
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
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

  return {
    // State
    formData, setFormData, localTecnicoName, localUserId, isLoadingTecnico,
    pendingResume,
    dailyDemandAvailability, isCheckingDailyDemandAvailability,
    schoolPendingAvailability, isCheckingSchoolPendingAvailability,
    escolas, alertDialog, setAlertDialog, loading, showChamadoModal, setShowChamadoModal,
    osNumero, chamadoData, setChamadoData, showToast, setShowToast, isDirty, progress, scrollY,
    // Multi-step
    currentStep, totalSteps, completedSteps, goToStep, nextStep, previousStep, currentStepData,
    // Computed
    escolaOptions, stepProgress, canProceed,
    // Handlers
    showToastMessage, handleInputChange, handleFileChange, handleSelectChange,
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
