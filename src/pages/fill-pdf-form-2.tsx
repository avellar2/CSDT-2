import React, { useState, useEffect, ChangeEvent } from "react";
import { PDFDocument, PDFCheckBox, PDFTextField } from "pdf-lib";
import Select from "react-select";
import initialFormData from "../utils/itens"; // Importar os dados iniciais do formulário
import { CheckCircle } from "phosphor-react";
import { useHeaderContext } from "../context/HeaderContext";
import InputsItens from "@/components/InputsItens";
import { ButtonLoading } from "@/components/ui/ButtonLoading";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabaseClient";

interface Escola {
  name: string;
  email: string;
}

const FillPdfForm: React.FC = () => {
  const { userName } = useHeaderContext();
  interface FormDataType {
    [key: string]: any; // Add this index signature
    tecnicoResponsavel: string;
    emailResponsavel: string;
    fotosAntes: File[] | string[]; // Alterado para File[] para suportar upload de arquivos
    fotosDepois: File[] | string[]; // Alterado para File[] para suportar upload de arquivos
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
    temLaboratorio: boolean;
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
    solucionado: string;
  }

  const [formData, setFormData] = useState<FormDataType>({
    ...initialFormData,
    tecnicoResponsavel: userName,
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
    temLaboratorio: false,
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
    solucionado: "",
  });

  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [alertDialog, setAlertDialog] = useState<{ title: string; description: string; success: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEscolas = async () => {
      try {
        const response = await fetch("/api/schools");
        const data = await response.json();
        setEscolas(data);
      } catch (error) {
        console.error("Erro ao buscar escolas:", error);
      }
    };

    fetchEscolas();
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      const fileArray = Array.from(files); // Converte FileList para Array
      setFormData((prevFormData) => ({
        ...prevFormData,
        [name]: fileArray, // Adiciona os arquivos ao estado
      }));
    }
  };


  const generatePdf = async (formData: FormDataType) => {
    try {
      // Carregar o PDF base da pasta public
      const pdfBytes = await fetch("/os-externa2-EDITADA.pdf").then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Obter o formulário do PDF
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

      // Gerar o PDF preenchido
      const pdfBytesFilled = await pdfDoc.save();

      // Criar um link para download
      const blob = new Blob([pdfBytesFilled.buffer as ArrayBuffer], { type: "application/pdf" }); // Acesse o buffer diretamente
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `OS-${formData.numeroOs || "sem-numero"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao gerar o PDF:", error);
    }
  };

  const handleSelectChange = (selectedOption: any) => {
    const selectedEscola = escolas.find((escola) => escola.name === selectedOption.value);
    setFormData((prevFormData) => ({
      ...prevFormData,
      unidadeEscolar: selectedOption.value,
      emailResponsavel: selectedEscola ? selectedEscola.email : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Salvar os dados no banco e obter o número da OS
      const updatedDataFromDb = await saveDataAndGetNumeroOs(formData);

      // Certifique-se de que o `numeroOs` está definido
      if (!updatedDataFromDb.numeroOs) {
        throw new Error("Número da OS não foi gerado corretamente.");
      }

      // Upload fotosAntes
      const fotosAntesUrls = await uploadFilesToSupabase(formData.fotosAntes as File[], "fotos-antes", updatedDataFromDb.numeroOs);
      // Upload fotosDepois
      const fotosDepoisUrls = await uploadFilesToSupabase(formData.fotosDepois as File[], "fotos-depois", updatedDataFromDb.numeroOs);

      const finalUpdatedData = {
        ...updatedDataFromDb, // Usa os dados atualizados do banco
        fotosAntes: fotosAntesUrls,
        fotosDepois: fotosDepoisUrls,
      };

      // Gerar o PDF preenchido
      await generatePdf(finalUpdatedData);

      setAlertDialog({ title: "Sucesso", description: "Formulário enviado com sucesso!", success: true });
    } catch (error) {
      console.error("Erro ao enviar o formulário:", error);
      setAlertDialog({
        title: "Erro",
        description: "Erro ao enviar o formulário. Por favor, tente novamente.",
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

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

  const uploadFilesToSupabase = async (files: File[], folder: string, numeroOs: string) => {
    const urls: string[] = [];
    for (const file of files) {
      // Verificar se o arquivo possui um nome válido
      const originalFileName = file.name && file.name.trim() !== "" ? file.name : "arquivo-sem-nome";
      const timestamp = new Date().getTime();
      const fileName = `${numeroOs}-${timestamp}-${originalFileName}`; // Inclui o número da OS no nome do arquivo
      const filePath = `${folder}/${fileName}`; // Caminho completo dentro da pasta

      try {
        console.log("Tentando fazer upload do arquivo:", fileName, "na pasta:", folder);

        const { data, error } = await supabase.storage
          .from("os-externa-img") // Nome do bucket
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

        // Obter o link público do arquivo
        const { publicUrl } = supabase.storage
          .from("os-externa-img")
          .getPublicUrl(filePath).data;

        if (!publicUrl) {
          console.error("Erro ao obter o link público do arquivo.");
          throw new Error("Erro ao obter o link público do arquivo.");
        }

        console.log("Link público gerado:", publicUrl);
        urls.push(publicUrl);
      } catch (error) {
        console.error("Erro ao fazer upload da foto:", error);
      }
    }
    return urls;
  };

  const escolaOptions = escolas.map((escola) => ({
    value: escola.name,
    label: escola.name,
  }));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl mb-8 mt-8">Preencher OS</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white p-4 rounded shadow-md flex flex-col">
        <InputsItens
          escolaOptions={escolaOptions}
          formData={formData}
          handleInputChange={handleInputChange}
          handleSelectChange={handleSelectChange}
          handleFileChange={handleFileChange}
          tecnicoResponsavelLogado={userName}
        />
        {loading ? (
          <ButtonLoading />
        ) : (
          <Button
            type="submit"
            className="w-full h-12 bg-green-500 hover:bg-green-700 text-white p-2 rounded flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Preencher OS
          </Button>
        )}
      </form>
      {alertDialog && (
        <AlertDialog open={true} onOpenChange={() => setAlertDialog(null)}>
          <AlertDialogTrigger asChild>
            <Button>{alertDialog.success ? "Sucesso" : "Erro"}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent
            className={`flex flex-col text-center ${alertDialog.success ? "bg-white" : "bg-red-100 border border-red-500"
              }`}
          >
            <AlertDialogTitle
              className={`text-lg font-bold ${alertDialog.success ? "text-zinc-800" : "text-red-600"}`}
            >
              {alertDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription
              className={`${alertDialog.success ? "text-zinc-600" : "text-red-500"}`}
            >
              {alertDialog.description}
            </AlertDialogDescription>
            <AlertDialogAction asChild>
              <Button
                className={`${alertDialog.success ? "bg-green-400 hover:bg-green-700" : "bg-red-500 hover:bg-red-700"
                  }`}
                onClick={() => setAlertDialog(null)}
              >
                <CheckCircle size={32} />
                OK
              </Button>
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default FillPdfForm;