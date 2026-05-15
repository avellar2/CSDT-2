import { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/router";
import { PDFDocument, PDFCheckBox, PDFTextField } from "pdf-lib";
import axios from "axios";
import { supabase } from "@/lib/supabaseClient";
import { useHeaderContext } from "@/context/HeaderContext";
import { uploadFiles } from "@/utils/storageProvider";
import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { formSteps } from "@/utils/formSteps";
import initialFormData from "@/utils/itens";

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
  if (!currentValue || !currentValue.includes(" / ")) return primaryTechnician;
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
  outrasImpressoras: NumberConstructor;
  temImpressoraComProblema: boolean | undefined;
  relatorioImpressora: string;
  impressoraComProblema: string;
  solucionado: string;
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
  const [alertDialog, setAlertDialog] = useState<{ title: string; description: string; success: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChamadoModal, setShowChamadoModal] = useState(false);
  const [osNumero, setOsNumero] = useState<string>("");
  const [chamadoData, setChamadoData] = useState({ escola: "", titulo: "", descricao: "", categoria: "" });
  const [showToast, setShowToast] = useState<{ message: string; type: "success" | "error" | "warning" | "info" } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const {
    currentStep, totalSteps, completedSteps, goToStep, nextStep, previousStep,
    canProceedToStep, currentStepData, markStepAsCompleted, reset,
  } = useMultiStepForm();

  const showToastMessage = (message: string, type: "success" | "error" | "warning" | "info") => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 4000);
  };

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
        const response = await fetch(`/api/daily-demands/os-availability?userId=${encodeURIComponent(localUserId)}&date=${encodeURIComponent(demandDate)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao validar disponibilidade da OS");
        setDailyDemandAvailability(data);
      } catch (availabilityError) {
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
  }, [router.isReady, router.query.origin, router.query.demandDate, localUserId]);

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
        const response = await fetch("/api/schools");
        const data = await response.json();
        setEscolas(data);
        showToastMessage("Escolas carregadas com sucesso!", "success");
      } catch {
        showToastMessage("Erro ao carregar escolas. Tente novamente.", "error");
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

    if (router.query.origin !== "daily-demands" && localUserId) {
      try {
        setIsCheckingSchoolPendingAvailability(true);
        const response = await fetch(`/api/daily-demands/school-os-availability?userId=${encodeURIComponent(localUserId)}&schoolName=${encodeURIComponent(selectedSchoolName)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao validar pendencia da escola");
        setSchoolPendingAvailability(data);
        if (data.applies && data.availability && !data.availability.allowed) {
          setFormData((prev) => ({ ...prev, unidadeEscolar: "", emailResponsavel: "" }));
          setAlertDialog({ title: "Escola bloqueada", description: data.availability.reason || "Esta escola esta bloqueada para lancamento de OS.", success: false });
          return;
        }
      } catch (error) {
        setAlertDialog({ title: "Erro ao validar escola", description: "Erro ao validar a escola selecionada.", success: false });
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
      if (!router.isReady || router.query.origin === "daily-demands" || !localUserId || !formData.unidadeEscolar) {
        setSchoolPendingAvailability(null);
        setIsCheckingSchoolPendingAvailability(false);
        return;
      }
      try {
        setIsCheckingSchoolPendingAvailability(true);
        const response = await fetch(`/api/daily-demands/school-os-availability?userId=${encodeURIComponent(localUserId)}&schoolName=${encodeURIComponent(formData.unidadeEscolar)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao validar pendencia da escola");
        setSchoolPendingAvailability(data);
      } catch {
        setSchoolPendingAvailability(null);
      } finally {
        setIsCheckingSchoolPendingAvailability(false);
      }
    };
    fetchSchoolPendingAvailability();
  }, [router.isReady, router.query.origin, localUserId, formData.unidadeEscolar]);

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
      oki: Number, kyocera: Number, hp: Number, ricoh: Number, outrasImpressoras: Number,
      temImpressoraComProblema: undefined, relatorioImpressora: "", impressoraComProblema: "", solucionado: "",
    });
    reset();
    setIsDirty(false);
    setProgress(0);
    showToastMessage("Formulario limpo com sucesso!", "info");
  };

  const saveDataAndGetNumeroOs = async (data: FormDataType): Promise<FormDataType> => {
    const currentDate = new Date();
    const updatedData = {
      ...data,
      data: currentDate.toISOString().split("T")[0],
      hora: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(currentDate),
    };
    const response = await fetch("/api/save-os-externa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formData: updatedData,
        context: router.query.origin === "daily-demands"
          ? { origin: "daily-demands", dailyDemandId: router.query.demandId, dailyDemandDate: router.query.demandDate, userId: localUserId }
          : { userId: localUserId },
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.id) throw new Error(result.error || "Erro ao salvar os dados");
    return { ...updatedData, numeroOs: `${result.id}/${currentDate.getFullYear()}` };
  };

  const criarChamadoAutomatico = async (osData: any) => {
    try {
      const chamadoAutomatico = {
        escola: osData.unidadeEscolar,
        titulo: `Reagendamento - OS ${osData.numeroOs} - ${osData.unidadeEscolar}`,
        descricao: `Problema nao solucionado na OS ${osData.numeroOs}. Solicitacao original: ${osData.solicitacaoDaVisita}. Relatorio: ${osData.relatorio}`,
        categoria: "Reagendamento", tecnico: osData.tecnicoResponsavel, osOriginal: osData.numeroOs, automatico: true,
      };
      const response = await fetch("/api/chamados-escalas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(chamadoAutomatico) });
      if (!response.ok) throw new Error("Erro ao criar chamado automatico");
    } catch {
      showToastMessage("Aviso: Erro ao criar chamado automatico", "warning");
    }
  };

  const handleSubmit = async () => {
    if (!canProceedToStep(currentStep, formData)) {
      showToastMessage("Preencha todos os campos obrigatorios antes de finalizar.", "warning");
      return;
    }
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

    setLoading(true);
    try {
      const updatedDataFromDb = await saveDataAndGetNumeroOs(formData);
      if (!updatedDataFromDb.numeroOs) throw new Error("Numero da OS nao foi gerado corretamente.");

      const fotosAntesUrls = await uploadFiles(formData.fotosAntes as File[], "fotos-antes", updatedDataFromDb.numeroOs);
      const fotosDepoisUrls = await uploadFiles(formData.fotosDepois as File[], "fotos-depois", updatedDataFromDb.numeroOs);

      const updateResponse = await fetch("/api/update-os-externa-fotos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroOs: updatedDataFromDb.numeroOs, fotosAntes: fotosAntesUrls, fotosDepois: fotosDepoisUrls }),
      });
      if (!updateResponse.ok) throw new Error("Erro ao atualizar fotos no banco de dados");

      const { v4: uuidv4 } = await import("uuid");
      const confirmToken = uuidv4();

      const tokenResponse = await fetch("/api/update-os-externa-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroOs: updatedDataFromDb.numeroOs, assinado: confirmToken }),
      });
      if (!tokenResponse.ok) throw new Error("Erro ao salvar token de confirmacao");

      const finalUpdatedData = { ...updatedDataFromDb, fotosAntes: fotosAntesUrls, fotosDepois: fotosDepoisUrls };
      const pdfBase64 = await generatePdfBytes(finalUpdatedData);

      const getBaseUrl = () => {
        if (process.env.NODE_ENV === "development") return "http://localhost:3000";
        return process.env.NEXT_PUBLIC_BASE_URL || "https://csdt.vercel.app";
      };
      const confirmUrl = `${getBaseUrl()}/confirmar-os-externa?numeroOs=${finalUpdatedData.numeroOs}&token=${confirmToken}`;
      const csdtEmail = process.env.CSDT_EMAIL || "csdt@smeduquedecaxias.rj.gov.br";

      const msg = {
        to: finalUpdatedData.emailResponsavel,
        from: process.env.EMAIL_USER,
        cc: csdtEmail,
        replyTo: `${process.env.EMAIL_USER}, ${csdtEmail}`,
        subject: `OS Externa ${finalUpdatedData.numeroOs} - ${finalUpdatedData.unidadeEscolar}`,
        html: buildEmailHtml(finalUpdatedData, confirmUrl),
        attachments: [{ content: pdfBase64, filename: `OS-Externa-${finalUpdatedData.numeroOs}.pdf`, contentType: "application/pdf", encoding: "base64" }],
      };

      const emailResponse = await fetch("/api/send-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(msg) });
      if (!emailResponse.ok) throw new Error("Erro ao enviar e-mail");

      setOsNumero(updatedDataFromDb.numeroOs);
      setChamadoData((prev) => ({ ...prev, escola: updatedDataFromDb.unidadeEscolar || "" }));

      const problemaResolvido = formData.solucionado === "Sim";
      clearForm();

      if (!problemaResolvido) {
        await criarChamadoAutomatico(updatedDataFromDb);
        setAlertDialog({ title: "Sucesso", description: `OS Externa ${updatedDataFromDb.numeroOs} enviada por e-mail para ${updatedDataFromDb.unidadeEscolar}! Como o problema nao foi solucionado, um chamado foi criado automaticamente para reagendamento.`, success: true });
      } else {
        setAlertDialog({ title: "Sucesso", description: `OS Externa ${updatedDataFromDb.numeroOs} enviada por e-mail para ${updatedDataFromDb.unidadeEscolar}! O responsavel recebera um e-mail para confirmacao.`, success: true });
        setTimeout(() => { setAlertDialog(null); setShowChamadoModal(true); }, 2000);
      }
    } catch {
      showToastMessage("Erro ao processar a OS. Tente novamente.", "error");
      setAlertDialog({ title: "Erro", description: "Erro ao enviar o formulario. Por favor, tente novamente.", success: false });
    } finally {
      setLoading(false);
    }
  };

  const fetchTecnicoName = async () => {
    try {
      setIsLoadingTecnico(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { setLocalTecnicoName(""); setIsLoadingTecnico(false); return; }
      setLocalUserId(user.id);
      const token = localStorage.getItem("token");
      if (token) {
        const response = await axios.get("/api/user-profile", { headers: { Authorization: `Bearer ${token}` } });
        if (response.data && response.data.displayName) {
          setLocalTecnicoName(response.data.displayName);
          setFormData((prev) => ({ ...prev, tecnicoResponsavel: preservePartnerSuffix(prev.tecnicoResponsavel, response.data.displayName) }));
        } else {
          const fallback = user.email?.split("@")[0] || "Tecnico";
          setLocalTecnicoName(fallback);
          setFormData((prev) => ({ ...prev, tecnicoResponsavel: preservePartnerSuffix(prev.tecnicoResponsavel, fallback) }));
        }
      } else {
        const fallback = user.email?.split("@")[0] || "Tecnico";
        setLocalTecnicoName(fallback);
        setFormData((prev) => ({ ...prev, tecnicoResponsavel: preservePartnerSuffix(prev.tecnicoResponsavel, fallback) }));
      }
    } catch {
      setLocalTecnicoName("Tecnico");
      setFormData((prev) => ({ ...prev, tecnicoResponsavel: "Tecnico" }));
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
      const response = await fetch("/api/chamados-escalas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(chamadoManual) });
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
