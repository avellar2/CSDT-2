"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/router";
import { PDFDocument, PDFCheckBox, PDFTextField } from "pdf-lib";
import { motion, AnimatePresence } from "framer-motion";
import Select from "react-select";
import initialFormData from "../utils/itens";
import { CheckCircle, FileText, Upload, Check, Warning, X, Info, Buildings, User, Calendar, Clock, Plus } from "phosphor-react";
import { useHeaderContext } from "../context/HeaderContext";
import InputsItens from "@/components/InputsItens";
import { ButtonLoading } from "@/components/ui/ButtonLoading";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabaseClient";
import { uploadFiles } from "@/utils/storageProvider";
import { StepIndicator } from "@/components/StepIndicator";
import { NavigationButtons } from "@/components/NavigationButtons";
import { useMultiStepForm } from "@/hooks/useMultiStepForm";
import { formSteps } from "@/utils/formSteps";
import axios from "axios"; // ADICIONAR esta linha após os outros imports

interface Escola {
  name: string;
  email: string;
}

const FillPdfForm: React.FC = () => {
  const { userName } = useHeaderContext();
  const router = useRouter();

  interface FormDataType {
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

  const [formData, setFormData] = useState<FormDataType>({
    ...initialFormData,
    tecnicoResponsavel: '', // MODIFICAR: trocar userName por string vazia
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

  // ADICIONAR estes 2 states após os states existentes
  const [localTecnicoName, setLocalTecnicoName] = useState<string>('');
  const [isLoadingTecnico, setIsLoadingTecnico] = useState(true);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [alertDialog, setAlertDialog] = useState<{ title: string; description: string; success: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChamadoModal, setShowChamadoModal] = useState(false);
  const [osNumero, setOsNumero] = useState<string>("");
  const [chamadoData, setChamadoData] = useState({
    escola: "",
    titulo: "",
    descricao: "",
    categoria: ""
  });

  // 🚀 UX States
  const [showToast, setShowToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // 🎯 Multi-step form hook
  const {
    currentStep,
    totalSteps,
    completedSteps,
    goToStep,
    nextStep,
    previousStep,
    canProceedToStep,
    currentStepData,
    markStepAsCompleted,
    reset
  } = useMultiStepForm();

  // 🎯 Toast notification system
  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 4000);
  };

  // 🔗 Pre-fill form from URL parameters (from daily-demands)
  useEffect(() => {
    if (router.isReady) {
      const { schoolName, demand } = router.query;
      
      if (schoolName || demand) {
        setFormData(prev => ({
          ...prev,
          unidadeEscolar: schoolName as string || prev.unidadeEscolar,
          solicitacaoDaVisita: demand as string || prev.solicitacaoDaVisita
        }));
        
        if (schoolName) {
          showToastMessage(`Escola pré-selecionada: ${schoolName}`, 'info');
        }
      }
    }
  }, [router.isReady, router.query]);

  // 📊 Calculate form completion progress
  const calculateProgress = () => {
    const totalFields = formSteps.reduce((acc, step) => acc + step.fields.length, 0);
    const filledFields = formSteps.reduce((acc, step) => {
      const stepFilledFields = step.fields.filter(field => {
        const value = formData[field];
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        if (field === 'temLaboratorio' || field === 'temImpressoraComProblema') {
          return value !== undefined && value !== null && typeof value === 'boolean';
        }
        
        // Se a escola não tem laboratório, considerar campos do laboratório como preenchidos
        const labFields = ['pcsProprio', 'pcsLocado', 'notebooksProprio', 'notebooksLocado',
                          'monitoresProprio', 'monitoresLocado', 'estabilizadoresProprio',
                          'estabilizadoresLocado', 'tabletsProprio', 'tabletsLocado'];
        if (labFields.includes(field) && formData.temLaboratorio === false) {
          return true;
        }

        // Se não tem impressora com problema, considerar campos de problema como preenchidos
        const printerProblemFields = ['relatorioImpressora', 'impressoraComProblema'];
        if (printerProblemFields.includes(field) && formData.temImpressoraComProblema === false) {
          return true;
        }

        return value && value.toString().trim() !== '';
      });
      return acc + stepFilledFields.length;
    }, 0);

    const progressPercent = Math.round((filledFields / totalFields) * 100);
    setProgress(progressPercent);
  };

  // Calculate step progress
  const calculateStepProgress = () => {
    const currentStepFields = currentStepData.fields;
    const filledFields = currentStepFields.filter(field => {
      const value = formData[field];
      if (Array.isArray(value)) {
        return true; // Arrays são opcionais
      }
      if (field === 'temLaboratorio' || field === 'temImpressoraComProblema') {
        return value !== undefined && value !== null && typeof value === 'boolean';
      }
      
      // Se a escola não tem laboratório, considerar campos do laboratório como preenchidos
      const labFields = ['pcsProprio', 'pcsLocado', 'notebooksProprio', 'notebooksLocado',
                        'monitoresProprio', 'monitoresLocado', 'estabilizadoresProprio',
                        'estabilizadoresLocado', 'tabletsProprio', 'tabletsLocado'];
      if (labFields.includes(field) && formData.temLaboratorio === false) {
        return true;
      }

      // Se não tem impressora com problema, considerar campos de problema como preenchidos
      const printerProblemFields = ['relatorioImpressora', 'impressoraComProblema'];
      if (printerProblemFields.includes(field) && formData.temImpressoraComProblema === false) {
        return true;
      }

      return value && value.toString().trim() !== '';
    });

    return Math.round((filledFields.length / currentStepFields.length) * 100);
  };

  useEffect(() => {
    const fetchEscolas = async () => {
      try {
        const response = await fetch("/api/schools");
        const data = await response.json();
        setEscolas(data);
        showToastMessage('Escolas carregadas com sucesso!', 'success');
      } catch (error) {
        console.error("Erro ao buscar escolas:", error);
        showToastMessage('Erro ao carregar escolas. Tente novamente.', 'error');
      }
    };

    fetchEscolas();
  }, []);

  useEffect(() => {
    calculateProgress();
  }, [formData]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
    setIsDirty(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);

      // Validate file size (10MB max)
      const oversizedFiles = fileArray.filter(file => file.size > 10 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        showToastMessage(`Arquivos muito grandes: ${oversizedFiles.map(f => f.name).join(', ')}`, 'error');
        return;
      }

      setFormData((prevFormData) => ({
        ...prevFormData,
        [name]: fileArray,
      }));

      showToastMessage(`${fileArray.length} arquivo(s) selecionado(s) com sucesso!`, 'success');
      setIsDirty(true);
    } else {
      setFormData((prevFormData) => ({
        ...prevFormData,
        [name]: [],
      }));
    }
  };

  const handleSelectChange = (selectedOption: any) => {
    const selectedEscola = escolas.find((escola) => escola.name === selectedOption.value);
    setFormData((prevFormData) => ({
      ...prevFormData,
      unidadeEscolar: selectedOption.value,
      emailResponsavel: selectedEscola ? selectedEscola.email : "",
    }));
    setIsDirty(true);
  };

  const handleNext = () => {
    if (canProceedToStep(currentStep + 1, formData)) {
      markStepAsCompleted(currentStep);
      nextStep();
      showToastMessage(`Etapa "${currentStepData.title}" concluída!`, 'success');
    } else {
      showToastMessage('Preencha todos os campos obrigatórios antes de continuar.', 'warning');
    }
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleStepClick = (step: number) => {
    // Permitir navegação apenas para passos já completados ou o próximo passo
    const maxAllowedStep = Math.max(...completedSteps, currentStep);
    if (step <= maxAllowedStep + 1) {
      goToStep(step);
    }
  };

  // Funções do PDF e submit (mantendo as mesmas do código original)
  const generatePdfBytes = async (formData: FormDataType): Promise<string> => {
    try {
      const pdfBytes = await fetch("/os-externa2-EDITADA.pdf").then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      // Preencher os campos do formulário
      form.getTextField("UNIDADE ESCOLAR").setText(formData.unidadeEscolar || "");
      form.getTextField("NUMERO OS").setText(formData.numeroOs || "");
      form.getTextField("DATA").setText(formData.data || "");
      form.getTextField("HORA").setText(formData.hora || "");
      form.getTextField("TECNICO RESPONSAVEL").setText(formData.tecnicoResponsavel || "");
      form.getTextField("LAB_PC_P").setText(formData.pcsProprio?.toString() || "");
      form.getTextField("LAB_PC_L").setText(formData.pcsLocado?.toString() || "");
      form.getTextField("LAB_ESTABILIZADOR_P").setText(formData.estabilizadoresProprio?.toString() || "");
      form.getTextField("LAB_ESTABILIZADOR_L").setText(formData.estabilizadoresLocado?.toString() || "");
      form.getTextField("OUT_PC_P").setText(formData.pcsProprioOutrosLocais?.toString() || "");
      form.getTextField("OUT_PC_L").setText(formData.pcsLocadoOutrosLocais?.toString() || "");
      form.getTextField("OUT_ESTABILIZADOR_P").setText(formData.estabilizadoresProprioOutrosLocais?.toString() || "");
      form.getTextField("OUT_ESTABILIZADOR_L").setText(formData.estabilizadoresLocadoOutrosLocais?.toString() || "");
      form.getTextField("LAB_MONITOR_P").setText(formData.monitoresProprio?.toString() || "");
      form.getTextField("LAB_MONITOR_L").setText(formData.monitoresLocado?.toString() || "");
      form.getTextField("LAB_TABLET_P").setText(formData.tabletsProprio?.toString() || "");
      form.getTextField("LAB_TABLET_L").setText(formData.tabletsLocado?.toString() || "");
      form.getTextField("OUT_MONITOR_P").setText(formData.monitoresProprioOutrosLocais?.toString() || "");
      form.getTextField("OUT_MONITOR_L").setText(formData.monitoresLocadoOutrosLocais?.toString() || "");
      form.getTextField("OUT_TABLET_P").setText(formData.tabletsProprioOutrosLocais?.toString() || "");
      form.getTextField("OUT_TABLET_L").setText(formData.tabletsLocadoOutrosLocais?.toString() || "");
      form.getTextField("LAB_NOTEBOOK_P").setText(formData.notebooksProprio?.toString() || "");
      form.getTextField("LAB_NOTEBOOK_L").setText(formData.notebooksLocado?.toString() || "");
      form.getTextField("OUT_NOTEBOOK_P").setText(formData.notebooksProprioOutrosLocais?.toString() || "");
      form.getTextField("OUT_NOTEBOOK_L").setText(formData.notebooksLocadoOutrosLocais?.toString() || "");
      form.getTextField("RACK").setText(formData.rack?.toString() || "");
      form.getTextField("ROTEADOR").setText(formData.roteador?.toString() || "");
      form.getTextField("OKI").setText(formData.oki?.toString() || "");
      form.getTextField("RICOH").setText(formData.ricoh?.toString() || "");
      form.getTextField("SWITCH").setText(formData.switch?.toString() || "");
      form.getTextField("KYOCERA").setText(formData.kyocera?.toString() || "");
      form.getTextField("PROPRIA").setText(String(formData.outrasImpressoras) || "");
      form.getTextField("HP").setText(formData.hp?.toString() || "");
      form.getTextField("SOLICITACAO").setText(formData.solicitacaoDaVisita || "");
      form.getTextField("PECA").setText(formData.pecasOuMaterial || "");
      form.getTextField("RELATORIO").setText(formData.relatorio || "");

      const fieldRedeBr = form.getField("REDEBR");
      if (fieldRedeBr instanceof PDFCheckBox) {
        form.getCheckBox("REDEBR").check(); // Marca o checkbox com um "X"
      } else if (fieldRedeBr instanceof PDFTextField) {
        form.getTextField("REDEBR").setText(formData.redeBr || ""); // Caso seja um campo de texto, preenche normalmente
      }

      const fieldEducacaoConectada = form.getField("EDUCACAOCONECTADA");
      if (fieldEducacaoConectada instanceof PDFCheckBox) {
        form.getCheckBox("EDUCACAOCONECTADA").check(); // Marca o checkbox com um "X"
      } else if (fieldEducacaoConectada instanceof PDFTextField) {
        form.getTextField("EDUCACAOCONECTADA").setText(formData.educacaoConectada || ""); // Caso seja um campo de texto, preenche normalmente
      }

      const fieldNaoHaProvedor = form.getField("NAOHAPROVEDOR");
      if (fieldNaoHaProvedor instanceof PDFCheckBox) {
        form.getCheckBox("NAOHAPROVEDOR").check(); // Marca o checkbox com um "X"
      } else if (fieldNaoHaProvedor instanceof PDFTextField) {
        form.getTextField("NAOHAPROVEDOR").setText(formData.naoHaProvedor || ""); // Caso seja um campo de texto, preenche normalmente
      }

      const fieldNaoHaLaboratorio = form.getField("NAOHALABORATORIO");
      if (fieldNaoHaLaboratorio instanceof PDFCheckBox) {
        form.getCheckBox("NAOHALABORATORIO").check(); // Marca o checkbox com um "X"
      } else if (fieldNaoHaLaboratorio instanceof PDFTextField) {
        form.getTextField("NAOHALABORATORIO").setText(formData.temLaboratorio ? "Sim" : "Não"); // Caso seja um campo de texto, preenche normalmente
      }

      // Preencher o campo "Problema Solucionado"
      const fieldSim = form.getField("SIM");
      const fieldNao = form.getField("NAO");

      if (fieldSim instanceof PDFCheckBox) {
        formData.solucionado === "Sim" ? fieldSim.check() : fieldSim.uncheck();
      }

      if (fieldNao instanceof PDFCheckBox) {
        formData.solucionado === "Não" ? fieldNao.check() : fieldNao.uncheck();
      }

      // Gerar o PDF preenchido e retornar como base64
      const pdfBytesFilled = await pdfDoc.save();
      const pdfBase64 = Buffer.from(pdfBytesFilled).toString("base64");
      return pdfBase64;
    } catch (error) {
      console.error("Erro ao gerar o PDF:", error);
      throw error;
    }
  };

  // Adicione essa função após os outros handlers, antes do generatePdfBytes
  const clearForm = () => {
    setFormData({
      ...initialFormData,
      tecnicoResponsavel: localTecnicoName,
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

    // Reset dos estados do multi-step form
    reset();
    setIsDirty(false);
    setProgress(0);

    // Toast de confirmação
    showToastMessage('Formulário limpo com sucesso!', 'info');
  };

  const handleSubmit = async () => {
    if (!canProceedToStep(currentStep, formData)) {
      showToastMessage('Preencha todos os campos obrigatórios antes de finalizar.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const updatedDataFromDb = await saveDataAndGetNumeroOs(formData);

      if (!updatedDataFromDb.numeroOs) {
        throw new Error("Número da OS não foi gerado corretamente.");
      }

      console.log("Dados salvos:", updatedDataFromDb);

      const fotosAntesUrls = await uploadFiles(
        formData.fotosAntes as File[],
        "fotos-antes",
        updatedDataFromDb.numeroOs
      );

      const fotosDepoisUrls = await uploadFiles(
        formData.fotosDepois as File[],
        "fotos-depois",
        updatedDataFromDb.numeroOs
      );

      // Atualizar o registro no banco com as URLs das fotos
      const updateResponse = await fetch("/api/update-os-externa-fotos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numeroOs: updatedDataFromDb.numeroOs,
          fotosAntes: fotosAntesUrls,
          fotosDepois: fotosDepoisUrls,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error("Erro ao atualizar fotos no banco:", errorData);
        throw new Error("Erro ao atualizar fotos no banco de dados");
      }

      // Gerar token único para confirmação
      const { v4: uuidv4 } = await import("uuid");
      const confirmToken = uuidv4();

      // Atualizar com o token de confirmação
      await fetch("/api/update-os-externa-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numeroOs: updatedDataFromDb.numeroOs,
          assinado: confirmToken,
        }),
      });

      const finalUpdatedData = {
        ...updatedDataFromDb,
        fotosAntes: fotosAntesUrls,
        fotosDepois: fotosDepoisUrls,
      };

      console.log("Dados finais atualizados:", finalUpdatedData);

      // Gerar o PDF preenchido como base64
      const pdfBase64 = await generatePdfBytes(finalUpdatedData);

      const getBaseUrl = () => {
        // Em desenvolvimento, usar localhost
        if (process.env.NODE_ENV === 'development') {
          return 'http://localhost:3000';
        }

        // Em produção, usar a URL do Vercel
        return process.env.NEXT_PUBLIC_BASE_URL || 'https://csdt.vercel.app';
      };

      // Monta o link de confirmação
      const confirmUrl = `${getBaseUrl()}/confirmar-os-externa?numeroOs=${finalUpdatedData.numeroOs}&token=${confirmToken}`;

      // Enviar por e-mail com HTML estilizado
      const msg = {
        to: finalUpdatedData.emailResponsavel,
        from: process.env.EMAIL_USER,
        subject: `OS Externa ${finalUpdatedData.numeroOs} - ${finalUpdatedData.unidadeEscolar}`,
        text: `
          Olá,
          Segue em anexo a Ordem de Serviço (OS) Externa ${finalUpdatedData.numeroOs} referente a sua escola: ${finalUpdatedData.unidadeEscolar}.

          OS gerada pelo técnico: ${finalUpdatedData.tecnicoResponsavel}
          Data: ${finalUpdatedData.data}
          Hora: ${finalUpdatedData.hora}

          Para concluir o processo, é necessário assinar eletronicamente a OS.

          Link para assinatura: ${confirmUrl}

          Caso não consiga clicar no link acima, copie e cole no seu navegador.

          Este endereço de e-mail serve apenas para envio de OS eletrônica.
          Para mais informações: csdt@smeduquedecaxias.rj.gov.br
        `,
        html: `
          <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 32px 0;">
            <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; padding: 32px 24px;">
              <h2 style="color: #2563eb; text-align: center; margin-bottom: 16px;">
                Confirmação de OS Externa - CSDT
              </h2>
              <p style="font-size: 16px; color: #222; margin-bottom: 16px;">
                Olá,<br>
                Segue em anexo a Ordem de Serviço (OS) Externa ${finalUpdatedData.numeroOs} referente a sua escola: <strong>${finalUpdatedData.unidadeEscolar}</strong>.
              </p>
              <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 14px; color: #475569;">
                  <strong>OS gerada pelo técnico:</strong> ${finalUpdatedData.tecnicoResponsavel}<br>
                  <strong>Data:</strong> ${finalUpdatedData.data}<br>
                  <strong>Hora:</strong> ${finalUpdatedData.hora}
                </p>
              </div>
              <p style="font-size: 16px; color: #222; margin-bottom: 24px;">
                <strong>Para concluir o processo, é necessário assinar eletronicamente a OS.</strong>
              </p>
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${confirmUrl}" style="display: inline-block; background: #2563eb; color: #fff; font-weight: bold; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 16px;">
                  Assinar OS Eletronicamente
                </a>
              </div>
              <p style="font-size: 14px; color: #555; margin-bottom: 8px;">
                Caso não consiga clicar no botão acima, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="font-size: 13px; color: #2563eb; word-break: break-all; margin-bottom: 24px;">
                ${confirmUrl}
              </p>
              <hr style="margin: 24px 0;">
              <p style="font-size: 13px; color: #888;">
                Este endereço de e-mail serve apenas para envio de OS eletrônica.<br>
                Para mais informações: <a href="mailto:csdt@smeduquedecaxias.rj.gov.br" style="color: #2563eb;">csdt@smeduquedecaxias.rj.gov.br</a>
              </p>
            </div>
          </div>
        `,
        attachments: [
          {
            content: pdfBase64,
            filename: `OS-Externa-${finalUpdatedData.numeroOs}.pdf`,
            contentType: "application/pdf",
            encoding: "base64",
          },
        ],
      };

      const emailResponse = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });

      if (!emailResponse.ok) {
        throw new Error("Erro ao enviar e-mail");
      }

      // Guardar dados para o modal de chamados
      setOsNumero(updatedDataFromDb.numeroOs);
      setChamadoData(prev => ({
        ...prev,
        escola: updatedDataFromDb.unidadeEscolar || ""
      }));

      // Verificar se problema foi solucionado
      const problemaResolvido = formData.solucionado === "Sim";

      // LIMPAR O FORMULÁRIO APÓS SUCESSO
      clearForm();

      if (!problemaResolvido) {
        // Se problema não foi solucionado, criar chamado automático
        await criarChamadoAutomatico(updatedDataFromDb);

        setAlertDialog({
          title: "Sucesso",
          description: `OS Externa ${updatedDataFromDb.numeroOs} enviada por e-mail para ${updatedDataFromDb.unidadeEscolar}! Como o problema não foi solucionado, um chamado foi criado automaticamente para reagendamento.`,
          success: true
        });
      } else {
        // Se problema foi solucionado, perguntar se quer abrir chamado
        setAlertDialog({
          title: "Sucesso",
          description: `OS Externa ${updatedDataFromDb.numeroOs} enviada por e-mail para ${updatedDataFromDb.unidadeEscolar}! O responsável receberá um e-mail para confirmação.`,
          success: true
        });

        // Após fechar o alert de sucesso, mostrar modal de chamados
        setTimeout(() => {
          setAlertDialog(null);
          setShowChamadoModal(true);
        }, 2000);
      }
    } catch (error) {
      console.error("Erro ao enviar o formulário:", error);
      showToastMessage('Erro ao processar a OS. Tente novamente.', 'error');
      setAlertDialog({
        title: "Erro",
        description: "Erro ao enviar o formulário. Por favor, tente novamente.",
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // ADICIONAR esta função
  const fetchTecnicoName = async () => {
    try {
      setIsLoadingTecnico(true);

      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        setLocalTecnicoName('');
        setIsLoadingTecnico(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/api/user-profile', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data && response.data.displayName) {
          setLocalTecnicoName(response.data.displayName);
          setFormData(prev => ({ ...prev, tecnicoResponsavel: response.data.displayName }));
        } else {
          const fallback = user.email?.split('@')[0] || 'Técnico';
          setLocalTecnicoName(fallback);
          setFormData(prev => ({ ...prev, tecnicoResponsavel: fallback }));
        }
      } else {
        const fallback = user.email?.split('@')[0] || 'Técnico';
        setLocalTecnicoName(fallback);
        setFormData(prev => ({ ...prev, tecnicoResponsavel: fallback }));
      }
    } catch (error) {
      setLocalTecnicoName('Técnico');
      setFormData(prev => ({ ...prev, tecnicoResponsavel: 'Técnico' }));
    } finally {
      setIsLoadingTecnico(false);
    }
  };

  useEffect(() => {
    fetchTecnicoName();
  }, []);

  useEffect(() => {
    if (userName && !isLoadingTecnico) {
      setLocalTecnicoName(userName);
      setFormData(prev => ({ ...prev, tecnicoResponsavel: userName }));
    }
  }, [userName, isLoadingTecnico]);

  const saveDataAndGetNumeroOs = async (formData: FormDataType): Promise<FormDataType> => {
    try {
      const currentDate = new Date();
      const updatedData = {
        ...formData,

        data: currentDate.toISOString().split("T")[0], // Atualiza a data no formato YYYY-MM-DD
        hora: new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "America/Sao_Paulo", // Define explicitamente o fuso horário
        }).format(currentDate), // Atualiza a hora no formato HH:mm
      };

      const response = await fetch("/api/save-os-externa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ formData: updatedData }),
      });

      const result = await response.json();

      if (!response.ok || !result.id) {
        throw new Error(result.error || "Erro ao salvar os dados");
      }

      const numeroOs = `${result.id}/${currentDate.getFullYear()}`;
      console.log("Número da OS gerado:", numeroOs);

      return { ...updatedData, numeroOs }; // Retorna os dados atualizados com o número da OS
    } catch (error) {
      console.error("Erro ao salvar os dados e obter o número da OS:", error);
      throw error;
    }
  };

  // Função para criar chamado automático quando problema não foi solucionado
  const criarChamadoAutomatico = async (osData: any) => {
    try {
      const chamadoAutomatico = {
        escola: osData.unidadeEscolar,
        titulo: `Reagendamento - OS ${osData.numeroOs} - ${osData.unidadeEscolar}`,
        descricao: `Problema não solucionado na OS ${osData.numeroOs}. Solicitação original: ${osData.solicitacaoDaVisita}. Relatório: ${osData.relatorio}`,
        categoria: "Reagendamento",
        tecnico: osData.tecnicoResponsavel,
        osOriginal: osData.numeroOs,
        automatico: true
      };

      const response = await fetch('/api/chamados-escalas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chamadoAutomatico)
      });

      if (!response.ok) {
        throw new Error('Erro ao criar chamado automático');
      }

      console.log('Chamado automático criado com sucesso');
    } catch (error) {
      console.error('Erro ao criar chamado automático:', error);
      showToastMessage('Aviso: Erro ao criar chamado automático', 'warning');
    }
  };

  // Função para criar chamado manual
  const criarChamadoManual = async () => {
    try {
      if (!chamadoData.titulo || !chamadoData.descricao || !chamadoData.categoria) {
        showToastMessage('Preencha todos os campos obrigatórios', 'warning');
        return;
      }

      const chamadoManual = {
        escola: chamadoData.escola,
        titulo: chamadoData.titulo,
        descricao: chamadoData.descricao,
        categoria: chamadoData.categoria,
        tecnico: localTecnicoName,
        osOriginal: osNumero,
        automatico: false
      };

      const response = await fetch('/api/chamados-escalas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chamadoManual)
      });

      if (!response.ok) {
        throw new Error('Erro ao criar chamado');
      }

      showToastMessage('Chamado criado com sucesso!', 'success');
      setShowChamadoModal(false);

      // Limpar dados do chamado
      setChamadoData({
        escola: "",
        titulo: "",
        descricao: "",
        categoria: ""
      });
    } catch (error) {
      console.error('Erro ao criar chamado manual:', error);
      showToastMessage('Erro ao criar chamado. Tente novamente.', 'error');
    }
  };

  // FUNÇÃO DE BACKUP - UPLOAD PARA SUPABASE (MANTIDA COMO STANDBY)
  // Para usar Supabase novamente, altere NEXT_PUBLIC_STORAGE_PROVIDER="supabase" no .env
  /*
  const uploadFilesToSupabase = async (files: File[], folder: string, numeroOs: string) => {
    const urls: string[] = [];

    for (const file of files) {
      // Verificar se o arquivo possui um nome válido
      const originalFileName = file.name && file.name.trim() !== "" ? file.name : "arquivo-sem-nome";
      const timestamp = new Date().getTime();
      const fileName = `${timestamp}-${originalFileName}`;

      // Manter a organização por subpastas com número da OS
      const filePath = `${folder}/${numeroOs}/${fileName}`;

      try {
        console.log("Tentando fazer upload do arquivo:", fileName, "no caminho:", filePath);

        const { data, error } = await supabase.storage
          .from("os-externa-img")
          .upload(filePath, file);

        if (error) {
          console.error("Erro ao fazer upload do arquivo:", error);
          throw error;
        }

        if (!data) {
          console.error("Erro: Nenhum dado retornado do upload.");
          throw new Error("Erro ao fazer upload do arquivo.");
        }

        console.log("Upload bem-sucedido:", data);

        // Obter o link público do arquivo usando o caminho correto
        const { data: publicUrlData } = supabase.storage
          .from("os-externa-img")
          .getPublicUrl(filePath);

        if (!publicUrlData || !publicUrlData.publicUrl) {
          console.error("Erro ao obter o link público do arquivo.");
          throw new Error("Erro ao obter o link público do arquivo.");
        }

        console.log("Link público gerado:", publicUrlData.publicUrl);
        urls.push(publicUrlData.publicUrl);
      } catch (error) {
        console.error("Erro ao fazer upload da foto:", error);
        // Continue para os próximos arquivos mesmo se um falhar
      }
    }

    console.log("URLs finais geradas:", urls);
    return urls;
  };
  */

  const escolaOptions = escolas.map((escola) => ({
    value: escola.name,
    label: escola.name,
  }));

  const stepProgress = calculateStepProgress();
  const canProceed = canProceedToStep(currentStep, formData);

  return (
    <motion.div
      className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Toast Notifications */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%' }}
            className="fixed top-0 left-1/2 z-50 transform"
          >
            <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg backdrop-blur-sm border ${showToast.type === 'success' ? 'bg-green-500/90 text-white border-green-400' :
              showToast.type === 'error' ? 'bg-red-500/90 text-white border-red-400' :
                showToast.type === 'warning' ? 'bg-yellow-500/90 text-white border-yellow-400' :
                  'bg-blue-500/90 text-white border-blue-400'
              }`}>
              {showToast.type === 'success' && <Check size={20} />}
              {showToast.type === 'error' && <X size={20} />}
              {showToast.type === 'warning' && <Warning size={20} />}
              {showToast.type === 'info' && <Info size={20} />}
              <span className="font-medium">{showToast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTAINER PRINCIPAL */}
      <div className="relative z-10 pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">
          {/* Header do formulário */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-8"
          >
            <motion.div
              className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-2xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <currentStepData.icon size={28} className="text-white" />
            </motion.div>

            <motion.h1
              className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {currentStepData.title}
            </motion.h1>

            <motion.p
              className="text-slate-300 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              {currentStepData.description}
            </motion.p>

            {/* Step Indicator */}

            <StepIndicator
              currentStep={currentStep}
              onStepClick={handleStepClick}
              completedSteps={completedSteps}
            />


            {/* Step Progress Bar */}
            <motion.div
              className="mt-6 max-w-md mx-auto"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">
                  Progresso da Etapa
                </span>
                <span className="text-sm text-blue-400 font-semibold">
                  {stepProgress}%
                </span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${stepProgress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Form Container */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="backdrop-blur-xl bg-slate-800/85 rounded-3xl p-6 border border-slate-700/50 shadow-2xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <InputsItens
                  escolaOptions={escolaOptions}
                  formData={formData}
                  handleInputChange={handleInputChange}
                  handleSelectChange={handleSelectChange}
                  handleFileChange={handleFileChange}
                  tecnicoResponsavelLogado={localTecnicoName || 'Carregando...'}
                  isLoadingTecnico={isLoadingTecnico}
                  currentStep={currentStep}
                  currentStepFields={currentStepData.fields}
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Navigation Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-20 backdrop-blur-xl bg-slate-800/85 rounded-3xl p-6 border border-slate-700/50 shadow-2xl"
          >
            <NavigationButtons
              currentStep={currentStep}
              totalSteps={totalSteps}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSubmit={handleSubmit}
              canProceed={canProceed}
              isLoading={loading}
            />

            {/* Dirty indicator */}
            {isDirty && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center text-yellow-400 text-sm flex items-center justify-center gap-2 mt-4"
              >
                <Warning size={16} />
                <span>Formulário modificado</span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Enhanced Alert Dialog */}
      {alertDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setAlertDialog(null)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`rounded-2xl p-8 max-w-md w-full shadow-2xl border ${alertDialog.success
              ? 'bg-slate-800/95 border-green-400/30'
              : 'bg-slate-800/95 border-red-400/30'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${alertDialog.success ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <CheckCircle size={40} className={alertDialog.success ? 'text-green-400' : 'text-red-400'} />
              </motion.div>

              <motion.h3
                className={`text-2xl font-bold mb-3 ${alertDialog.success ? 'text-green-400' : 'text-red-400'
                  }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {alertDialog.title}
              </motion.h3>

              <motion.p
                className="text-slate-200 mb-8 text-lg leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {alertDialog.description}
              </motion.p>

              <motion.button
                onClick={() => setAlertDialog(null)}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${alertDialog.success
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                  : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
                  } text-white`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Continuar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de Chamados */}
      {showChamadoModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-slate-800/95 border border-blue-400/30 rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="text-center mb-6">
              <motion.div
                className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <Plus size={32} className="text-blue-400" />
              </motion.div>

              <h3 className="text-2xl font-bold text-blue-400 mb-2">
                Criar Novo Chamado?
              </h3>

              <p className="text-slate-300 text-sm">
                Você encontrou algum serviço adicional que precisa ser agendado para esta escola?
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Escola
                </label>
                <input
                  type="text"
                  value={chamadoData.escola}
                  disabled
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Título do Chamado *
                </label>
                <input
                  type="text"
                  value={chamadoData.titulo}
                  onChange={(e) => setChamadoData(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Instalação de impressora"
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Categoria *
                </label>
                <select
                  value={chamadoData.categoria}
                  onChange={(e) => setChamadoData(prev => ({ ...prev, categoria: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Instalação">Instalação</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Configuração">Configuração</option>
                  <option value="Troca de Equipamento">Troca de Equipamento</option>
                  <option value="Problema de Rede">Problema de Rede</option>
                  <option value="Impressora">Impressora</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descrição *
                </label>
                <textarea
                  value={chamadoData.descricao}
                  onChange={(e) => setChamadoData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva o serviço que precisa ser agendado..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                onClick={() => setShowChamadoModal(false)}
                className="flex-1 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Não, obrigado
              </motion.button>

              <motion.button
                onClick={criarChamadoManual}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Criar Chamado
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default FillPdfForm;

