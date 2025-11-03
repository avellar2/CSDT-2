import { FileText, ComputerTower, WifiHigh, Printer, ClipboardText, CheckCircle, Buildings } from "phosphor-react";
import { FormStep } from "../types/formSteps";

export const formSteps: FormStep[] = [
  {
    id: "principal",
    title: "Principal",
    description: "Informações básicas da OS",
    icon: FileText,
    fields: ["unidadeEscolar", "tecnicoResponsavel", "emailResponsavel", "solicitacaoDaVisita", "diretoraNaEscola"]
  },
  {
    id: "laboratorio",
    title: "Laboratório",
    description: "Equipamentos do laboratório",
    icon: ComputerTower,
    fields: ["temLaboratorio", "pcsProprio", "pcsLocado", "notebooksProprio", "notebooksLocado", "monitoresProprio", "monitoresLocado", "estabilizadoresProprio", "estabilizadoresLocado", "tabletsProprio", "tabletsLocado"]
  },
  {
    id: "outros-locais",
    title: "Outros Locais",
    description: "Equipamentos em outros locais",
    icon: Buildings,
    fields: ["pcsProprioOutrosLocais", "pcsLocadoOutrosLocais", "notebooksProprioOutrosLocais", "notebooksLocadoOutrosLocais", "monitoresProprioOutrosLocais", "monitoresLocadoOutrosLocais", "estabilizadoresProprioOutrosLocais", "estabilizadoresLocadoOutrosLocais", "tabletsProprioOutrosLocais", "tabletsLocadoOutrosLocais"]
  },
  {
    id: "internet",
    title: "Internet",
    description: "Configurações de rede",
    icon: WifiHigh,
    fields: ["redeBr", "educacaoConectada", "naoHaProvedor", "rack", "switch", "roteador"]
  },
  {
    id: "impressoras",
    title: "Impressoras",
    description: "Equipamentos de impressão",
    icon: Printer,
    fields: ["oki", "kyocera", "hp", "ricoh", "outrasImpressoras", "temImpressoraComProblema", "relatorioImpressora", "impressoraComProblema"]
  },
  {
    id: "relatorio",
    title: "Relatório",
    description: "Relatório, fotos e materiais",
    icon: ClipboardText,
    fields: ["pecasOuMaterial", "relatorio", "fotosAntes", "fotosDepois"]
  },
  {
    id: "solucionado",
    title: "Conclusão",
    description: "Status da solução",
    icon: CheckCircle,
    fields: ["solucionado"]
  }
];