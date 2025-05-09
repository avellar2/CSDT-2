import React, { useState, useEffect, ChangeEvent } from "react";
import { PDFDocument } from "pdf-lib";
import Select from "react-select";
import initialFormData from "../utils/itens"; // Importar os dados iniciais do formulário
import InputsItens from "./InputsItens"; // Importar o componente InputsItens
import { CheckCircle } from "phosphor-react";
import { Button } from "./ui/button";
import { ButtonLoading } from "./ui/ButtonLoading"; // Importando o componente ButtonLoading
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { useHeaderContext } from "../context/HeaderContext";
import { supabase } from "@/lib/supabaseClient";

interface Escola {
  name: string;
  email: string;
}

interface FillPdfFormProps {
  // Outros props...
}

const FillPdfForm: React.FC<FillPdfFormProps> = (props) => {
  const { userName } = useHeaderContext();
  const [formData, setFormData] = useState({
    ...initialFormData,
    tecnicoResponsavel: userName,
    emailResponsavel: "",
    fotosAntes: [] as File[],
    fotosDepois: [] as File[]
  });
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [alertDialog, setAlertDialog] = useState<{ title: string, description: string, success: boolean } | null>(null);
  const [loading, setLoading] = useState(false); // Estado de carregamento

  useEffect(() => {
    // Função para buscar os dados das escolas do banco de dados
    const fetchEscolas = async () => {
      try {
        const response = await fetch("/api/schools"); // Substitua pelo endpoint correto da sua API
        const data = await response.json();
        const escolasAtualizadas = data.map((escola: any) => ({
          ...escola,
          name: substituirCIEP(escola.name),
          email: escola.email
        }));
        setEscolas(escolasAtualizadas);
      } catch (error) {
        console.error("Erro ao buscar escolas:", error);
      }
    };

    fetchEscolas();
  }, []);

  useEffect(() => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      tecnicoResponsavel: userName,
    }));
  }, [userName]);

  const substituirCIEP = (nome: string) => {
    return nome.replace("Centro Integrado de Educação Pública", "CIEP");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        [name]: Array.from(files)
      }));
    }
  };

  const handleSelectChange = (selectedOption: any) => {
    const selectedEscola = escolas.find(escola => escola.name === selectedOption.value);
    setFormData((prevFormData) => ({
      ...prevFormData,
      unidadeEscolar: selectedOption.value,
      emailResponsavel: selectedEscola ? selectedEscola.email : ""
    }));
  };

  const uploadFilesToSupabase = async (files: File[], folder: string) => {
    const urls: string[] = [];
    for (const file of files) {
      const timestamp = new Date().getTime();
      const fileName = `${timestamp}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(`${folder}/${fileName}`, file);

      if (error) {
        console.error('Erro ao fazer upload do arquivo:', error);
        throw error;
      }

      const { publicUrl } = supabase.storage.from('uploads').getPublicUrl(data.path).data;
      urls.push(publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); // Inicia o carregamento

    try {
      // Verificar se o número da OS já existe
      const checkResponse = await fetch(`/api/check-os?numeroOs=${formData.numeroOs}`);
      const checkResult = await checkResponse.json();

      if (checkResult.exists) {
        setAlertDialog({
          title: "Número de OS já existente",
          description: "O número de OS informado já existe. Por favor, escolha outro número.",
          success: false,
        });
        setLoading(false); // Termina o carregamento
        return;
      }

      // Upload fotosAntes
      const fotosAntesUrls = await uploadFilesToSupabase(formData.fotosAntes, "fotos-antes");

      // Upload fotosDepois
      const fotosDepoisUrls = await uploadFilesToSupabase(formData.fotosDepois, "fotos-depois");

      const url = "/pdf-template.pdf"; // Caminho atualizado para o template PDF
      const existingPdfBytes = await fetch(url).then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      // Preencher os campos do PDF com os dados do formulário
      form.getTextField("UNIDADE ESCOLAR").setText(formData.unidadeEscolar);
      form.getTextField("TECNICO RESPONSAVEL").setText(formData.tecnicoResponsavel);
      form.getTextField("NUMERO OS").setText(formData.numeroOs);
      form.getTextField("DATA").setText(formData.data);
      form.getTextField("HORA").setText(formData.hora);
      form.getTextField("NOTBOOKS OUTRO LOCAL").setText(formData.notebooksOutroLocal);
      form.getTextField("TABLETS OUTRO LOCAL").setText(formData.tabletsOutroLocal);
      form.getTextField("SOLICITACAO DA VISITA").setText(formData.solicitacaoDaVisita);
      form.getTextField("RELATORIO").setText(formData.relatorio);
      form.getTextField("PCS SIEDUCA").setText(formData.pcsSieduca);
      form.getTextField("NOTEBOOKS SIEDUCA").setText(formData.notebooksSieduca);
      form.getTextField("TABLETS SIEDUCA").setText(formData.tabletsSieduca);
      form.getTextField("ESTABILIZADORES SIEDUCA").setText(formData.estabilizadoresSieduca);
      form.getTextField("NAO HA SIEDUCA").setText(formData.naoHaSieduca === "Sim" ? "X" : "");
      form.getTextField("DELL SECRETARIA").setText(formData.dellSecretaria);
      form.getTextField("LOCADOS SECRETARIA").setText(formData.locadosSecretaria);
      form.getTextField("OUTROS SECRETARIA").setText(formData.outrosSecretaria);
      form.getTextField("NOTEBOOKS SECRETARIA").setText(formData.notebooksSecretaria);
      form.getTextField("TABLETS SECRETARIA").setText(formData.tabletsSecretaria);
      form.getTextField("ESTABILIZADORES SECRETARIA").setText(formData.estabilizadoresSecretaria);
      form.getTextField("DELL OUTRO LOCAL").setText(formData.dellOutroLocal);
      form.getTextField("LOCADOS OUTRO LOCAL").setText(formData.locadosOutroLocal);
      form.getTextField("OUTROS OUTRO LOCAL").setText(formData.outrosOutroLocal);
      form.getTextField("ESTABILIZADORES OUTRO LOCAL").setText(formData.estabilizadoresOutroLocal);
      form.getTextField("NAO HA OUTRO LOCAL").setText(formData.naoHaOutroLocal === "Sim" ? "X" : "");
      form.getTextField("REDE BR").setText(formData.redeBr === "Sim" ? "X" : "");
      form.getTextField("INTERNET NAS ESCOLAS").setText(formData.internetNasEscolas === "Sim" ? "X" : "");
      form.getTextField("EDUCACAO CONECTADA").setText(formData.educacaoConectada === "Sim" ? "X" : "");
      form.getTextField("NAO HA PROVEDOR").setText(formData.naoHaProvedor === "Sim" ? "X" : "");
      form.getTextField("RACK").setText(formData.rack);
      form.getTextField("SWITCH").setText(formData.switch);
      form.getTextField("ROTEADOR").setText(formData.roteador);
      form.getTextField("OKI").setText(formData.oki);
      form.getTextField("KYOCERA").setText(formData.kyocera);
      form.getTextField("OUTRAS IMPRESSORAS").setText(formData.outrasImpressoras);
      form.getTextField("SIM").setText(formData.solucionado === "Sim" ? "X" : "");
      form.getTextField("NAO").setText(formData.solucionado === "Não" ? "X" : "");

      const pdfBytes = await pdfDoc.save();
      const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

      // Salvar a OS no banco de dados com status "Pendente"
      const response = await fetch("/api/create-os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unidadeEscolar: formData.unidadeEscolar,
          tecnicoResponsavel: formData.tecnicoResponsavel,
          numeroOs: formData.numeroOs,
          data: formData.data,
          hora: formData.hora,
          notebooksOutroLocal: formData.notebooksOutroLocal,
          tabletsOutroLocal: formData.tabletsOutroLocal,
          solicitacaoDaVisita: formData.solicitacaoDaVisita,
          relatorio: formData.relatorio,
          pcsSieduca: formData.pcsSieduca,
          notebooksSieduca: formData.notebooksSieduca,
          tabletsSieduca: formData.tabletsSieduca,
          estabilizadoresSieduca: formData.estabilizadoresSieduca,
          naoHaSieduca: formData.naoHaSieduca,
          dellSecretaria: formData.dellSecretaria,
          locadosSecretaria: formData.locadosSecretaria,
          outrosSecretaria: formData.outrosSecretaria,
          notebooksSecretaria: formData.notebooksSecretaria,
          tabletsSecretaria: formData.tabletsSecretaria,
          estabilizadoresSecretaria: formData.estabilizadoresSecretaria,
          dellOutroLocal: formData.dellOutroLocal,
          locadosOutroLocal: formData.locadosOutroLocal,
          outrosOutroLocal: formData.outrosOutroLocal,
          estabilizadoresOutroLocal: formData.estabilizadoresOutroLocal,
          naoHaOutroLocal: formData.naoHaOutroLocal,
          redeBr: formData.redeBr,
          internetNasEscolas: formData.internetNasEscolas,
          educacaoConectada: formData.educacaoConectada,
          naoHaProvedor: formData.naoHaProvedor,
          rack: formData.rack,
          switch: formData.switch,
          roteador: formData.roteador,
          oki: formData.oki,
          kyocera: formData.kyocera,
          hp: formData.hp,
          ricoh: formData.ricoh,
          outrasImpressoras: formData.outrasImpressoras,
          solucionado: formData.solucionado,
          emailResponsavel: formData.emailResponsavel,
          fotosAntes: fotosAntesUrls,
          fotosDepois: fotosDepoisUrls,
          status: "Pendente",
        }),
      });

      const result = await response.json();

      if (response.status === 400) {
        setAlertDialog({ title: "Erro", description: result.error, success: false });
        return;
      }

      const osId = result.id; // Obter o ID da OS criada
      const aceiteUrl = `http://localhost:3000/confirmar-os?osId=${osId}`;

      const msg = {
        to: formData.emailResponsavel,
        from: process.env.EMAIL_USER,
        subject: "OS Preenchida",
        text: `Por favor, clique no link para aceitar a OS: ${aceiteUrl}`,
        attachments: [
          {
            content: pdfBase64,
            filename: "filled-form.pdf",
            contentType: "application/pdf",
            encoding: "base64",
          },
        ],
      };

      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });

      setAlertDialog({ title: "Sucesso", description: "Email enviado com sucesso!", success: true });
    } catch (error) {
      console.error("Erro ao enviar o formulário:", error);
      setAlertDialog({
        title: "Erro",
        description: "Erro ao enviar o formulário. Por favor, tente novamente.",
        success: false,
      });
    } finally {
      setLoading(false); // Termina o carregamento
    }
  };

  const escolaOptions = escolas.map((escola) => ({
    value: escola.name,
    label: escola.name
  }));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8  ">
      <h1 className="text-3xl mb-8 mt-8">Preencher OS</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white p-4 rounded shadow-md flex flex-col">
        <InputsItens escolaOptions={escolaOptions} formData={formData} handleInputChange={handleInputChange} handleSelectChange={handleSelectChange} handleFileChange={handleFileChange} tecnicoResponsavelLogado={userName} />
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
            className={`flex flex-col text-center ${
              alertDialog.success
                ? "bg-white"
                : "bg-red-100 border border-red-500"
            }`}
          >
            <AlertDialogTitle
              className={`text-lg font-bold ${
                alertDialog.success ? "text-zinc-800" : "text-red-600"
              }`}
            >
              {alertDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription
              className={`${
                alertDialog.success ? "text-zinc-600" : "text-red-500"
              }`}
            >
              {alertDialog.description}
            </AlertDialogDescription>
            <AlertDialogAction asChild>
              <Button
                className={`${
                  alertDialog.success
                    ? "bg-green-400 hover:bg-green-700"
                    : "bg-red-500 hover:bg-red-700"
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