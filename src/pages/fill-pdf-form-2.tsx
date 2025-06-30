import React, { useState, useEffect, ChangeEvent } from "react";
import { PDFDocument } from "pdf-lib";
import Select from "react-select";
import initialFormData from "../utils/itens"; // Importar os dados iniciais do formulário
import { CheckCircle } from "phosphor-react";
import { useHeaderContext } from "../context/HeaderContext";
import InputsItens from "@/components/InputsItens";
import { ButtonLoading } from "@/components/ui/ButtonLoading";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Escola {
  name: string;
  email: string;
}

const FillPdfForm: React.FC = () => {
  const { userName } = useHeaderContext();
  const [formData, setFormData] = useState({
    ...initialFormData,
    tecnicoResponsavel: userName,
    emailResponsavel: "",
    fotosAntes: [] as File[],
    fotosDepois: [] as File[],
    pcsProprio: 0,
    pcsLocado: 0,
    notebooksProprio: 0,
    notebooksLocado: 0,
    monitoresProprio: 0,
    monitoresLocado: 0,
    estabilizadoresProprio: 0,
    estabilizadoresLocado: 0,
    tabletsProprio: 0,
    tabletsLocado: 0,
    pcsProprioOutrosLocais: 0,
    pcsLocadoOutrosLocais: 0,
    notebooksProprioOutrosLocais: 0,
    notebooksLocadoOutrosLocais: 0,
    monitoresProprioOutrosLocais: 0,
    monitoresLocadoOutrosLocais: 0,
    estabilizadoresProprioOutrosLocais: 0,
    estabilizadoresLocadoOutrosLocais: 0,
    tabletsProprioOutrosLocais: 0,
    tabletsLocadoOutrosLocais: 0,
    pecasOuMaterial: "",
    relatorio: "",
    solicitacaoDaVisita: "",
    temLaboratorio: false,
    redeBr: "",
    educacaoConectada: "",
    naoHaProvedor: "",
    rack: 0,
    switch: 0,
    roteador: 0,
    oki: 0,
    kyocera: 0,
    hp: 0,
    ricoh: 0,
    outrasImpressoras: 0,
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
    if (files) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        [name]: Array.from(files),
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/save-os-externa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ formData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao salvar os dados");
      }

      console.log("Dados salvos com sucesso:", result.data);
      setAlertDialog({ title: "Sucesso", description: "Formulário enviado com sucesso!", success: true });
    } catch (error) {
      console.error("Erro ao enviar o formulário:", error);
      setAlertDialog({ title: "Erro", description: "Erro ao enviar o formulário. Tente novamente.", success: false });
    } finally {
      setLoading(false);
    }
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
            className={`flex flex-col text-center ${
              alertDialog.success ? "bg-white" : "bg-red-100 border border-red-500"
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
                className={`${
                  alertDialog.success ? "bg-green-400 hover:bg-green-700" : "bg-red-500 hover:bg-red-700"
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