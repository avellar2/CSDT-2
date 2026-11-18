/**
 * Definição oficial do questionário da Pesquisa de Feedback do CSDT.
 *
 * O texto das perguntas e das alternativas é reproduzido exatamente como no
 * questionário institucional original. Não altere os rótulos sem antes revisar
 * os documentos oficiais: campanhas históricas guardam uma cópia imutável
 * (FeedbackQuestionnaireVersion.definition) desta definição.
 */

export type FeedbackQuestionKind = "SINGLE" | "MULTI" | "OPEN";

export interface FeedbackOption {
  key: string;
  label: string;
}

interface FeedbackQuestionBase {
  /** Identificador estável usado no banco. */
  key: string;
  /** Número exibido na interface (1 a 16). */
  number: number;
  title: string;
  required: boolean;
  /** Permite complemento livre quando a alternativa "Outros" é marcada. */
  allowsOther?: boolean;
}

export interface FeedbackChoiceQuestion extends FeedbackQuestionBase {
  kind: "SINGLE" | "MULTI";
  options: FeedbackOption[];
}

export interface FeedbackOpenQuestion extends FeedbackQuestionBase {
  kind: "OPEN";
  maxLength: number;
}

export type FeedbackQuestion = FeedbackChoiceQuestion | FeedbackOpenQuestion;

export interface FeedbackQuestionnaire {
  version: string;
  title: string;
  organization: string;
  subtitle: string;
  objective: string;
  schoolFieldLabel: string;
  closingMessage: string;
  respondentSection: {
    title: string;
    fields: {
      name: { label: string; required: boolean };
      registration: { label: string; required: boolean };
      role: { label: string; required: boolean };
    };
  };
  questions: FeedbackQuestion[];
}

export const FEEDBACK_QUESTIONNAIRE_VERSION = "csdt-feedback-v1";

export const FEEDBACK_QUESTIONNAIRE: FeedbackQuestionnaire = {
  version: FEEDBACK_QUESTIONNAIRE_VERSION,
  title: "PESQUISA DE FEEDBACK – CSDT",
  organization: "CENTRO DE SUPORTE E DESENVOLVIMENTO TECNOLÓGICO",
  subtitle: "Secretaria Municipal de Educação",
  objective:
    "Avaliar a qualidade dos serviços prestados pelo CSDT, identificar as necessidades das unidades e levantar oportunidades de melhoria.",
  schoolFieldLabel: "Unidade escolar",
  closingMessage:
    "Obrigado por contribuir! Sua participação é importante para aprimorarmos continuamente o atendimento e os serviços tecnológicos oferecidos às unidades da rede municipal.",
  respondentSection: {
    title: "Identificação do responsável pelo preenchimento",
    fields: {
      name: { label: "Nome completo", required: true },
      registration: { label: "Matrícula funcional", required: true },
      role: { label: "Função/cargo na unidade escolar", required: true },
    },
  },
  questions: [
    {
      key: "q1",
      number: 1,
      kind: "SINGLE",
      required: true,
      title: "Como você avalia o atendimento prestado pelo CSDT?",
      options: [
        { key: "excelente", label: "Excelente." },
        { key: "bom", label: "Bom." },
        { key: "regular", label: "Regular." },
        { key: "ruim", label: "Ruim." },
        { key: "nunca-utilizei", label: "Nunca utilizei o atendimento." },
      ],
    },
    {
      key: "q2",
      number: 2,
      kind: "SINGLE",
      required: true,
      title:
        "Como você avalia o tempo de resposta às solicitações realizadas ao CSDT?",
      options: [
        { key: "muito-rapido", label: "Muito rápido." },
        { key: "rapido", label: "Rápido." },
        { key: "satisfatorio", label: "Satisfatório." },
        { key: "demorado", label: "Demorado." },
        { key: "muito-demorado", label: "Muito demorado." },
        { key: "nao-sei-avaliar", label: "Não sei avaliar." },
      ],
    },
    {
      key: "q3",
      number: 3,
      kind: "SINGLE",
      required: true,
      title:
        "Como você avalia a cordialidade e a atenção da equipe durante o atendimento?",
      options: [
        { key: "excelente", label: "Excelente." },
        { key: "boa", label: "Boa." },
        { key: "regular", label: "Regular." },
        { key: "precisa-melhorar", label: "Precisa melhorar." },
        {
          key: "nao-tive-contato",
          label: "Não tive contato direto com a equipe.",
        },
      ],
    },
    {
      key: "q4",
      number: 4,
      kind: "SINGLE",
      required: true,
      title:
        "Quando apresenta um problema tecnológico, você consegue obter uma solução adequada?",
      options: [
        { key: "sempre", label: "Sempre." },
        { key: "maioria-das-vezes", label: "Na maioria das vezes." },
        { key: "as-vezes", label: "Às vezes." },
        { key: "raramente", label: "Raramente." },
        { key: "nunca", label: "Nunca." },
        { key: "nao-sei-avaliar", label: "Não sei avaliar." },
      ],
    },
    {
      key: "q5",
      number: 5,
      kind: "SINGLE",
      required: true,
      title:
        "Como você avalia a comunicação do CSDT com sua unidade escolar?",
      options: [
        { key: "excelente", label: "Excelente." },
        { key: "boa", label: "Boa." },
        { key: "regular", label: "Regular." },
        { key: "insatisfatoria", label: "Insatisfatória." },
        { key: "nao-tenho-contato", label: "Não tenho contato frequente." },
      ],
    },
    {
      key: "q6",
      number: 6,
      kind: "SINGLE",
      required: true,
      title:
        "Você considera que as orientações fornecidas pela equipe são claras e objetivas?",
      options: [
        { key: "sim-sempre", label: "Sim, sempre." },
        { key: "maioria-das-vezes", label: "Na maioria das vezes." },
        { key: "as-vezes", label: "Às vezes." },
        { key: "raramente", label: "Raramente." },
        { key: "nao", label: "Não." },
      ],
    },
    {
      key: "q7",
      number: 7,
      kind: "MULTI",
      required: true,
      allowsOther: true,
      title: "Quais serviços do CSDT você mais utiliza?",
      options: [
        {
          key: "suporte-computadores",
          label: "Suporte técnico em computadores.",
        },
        {
          key: "internet-conectividade",
          label: "Suporte à internet e conectividade.",
        },
        {
          key: "impressoras",
          label: "Atendimento e suporte a impressoras.",
        },
        {
          key: "equipamentos-tecnologicos",
          label: "Suporte a equipamentos tecnológicos.",
        },
        {
          key: "instalacao-configuracao",
          label: "Instalação e configuração de equipamentos.",
        },
        {
          key: "sistemas-softwares",
          label: "Configuração e suporte de sistemas e softwares.",
        },
        {
          key: "informatica-perifericos",
          label: "Suporte a equipamentos de informática e periféricos.",
        },
        { key: "outros", label: "Outros." },
      ],
    },
    {
      key: "q8",
      number: 8,
      kind: "MULTI",
      required: true,
      allowsOther: true,
      title:
        "Quais são as principais dificuldades tecnológicas enfrentadas atualmente em sua unidade?",
      options: [
        {
          key: "computadores-defeito-lentidao",
          label: "Computadores com defeito ou lentidão.",
        },
        {
          key: "falta-equipamentos",
          label: "Falta de computadores ou equipamentos.",
        },
        {
          key: "conexao-internet",
          label: "Problemas de conexão com a internet.",
        },
        { key: "impressoras", label: "Problemas com impressoras." },
        {
          key: "equipamentos-multimidia",
          label: "Dificuldades com equipamentos multimídia.",
        },
        {
          key: "projetores-telas",
          label: "Problemas com projetores e telas interativas.",
        },
        {
          key: "rede-wifi",
          label: "Problemas com rede interna e Wi-Fi.",
        },
        {
          key: "sistemas-softwares",
          label: "Dificuldades com sistemas e softwares.",
        },
        {
          key: "capacitacao",
          label: "Falta de orientação ou capacitação tecnológica.",
        },
        { key: "outros", label: "Outros." },
      ],
    },
    {
      key: "q9",
      number: 9,
      kind: "MULTI",
      required: true,
      allowsOther: true,
      title: "O que você considera que o CSDT poderia melhorar?",
      options: [
        {
          key: "reduzir-tempo",
          label: "Reduzir o tempo de atendimento.",
        },
        {
          key: "comunicacao-unidades",
          label: "Melhorar a comunicação com as unidades.",
        },
        { key: "ampliar-suporte", label: "Ampliar o suporte técnico." },
        {
          key: "acompanhamento-solicitacoes",
          label: "Melhorar o acompanhamento das solicitações.",
        },
        { key: "mais-visitas", label: "Realizar mais visitas técnicas." },
        {
          key: "disponibilidade-equipamentos",
          label: "Ampliar a disponibilidade de equipamentos.",
        },
        {
          key: "orientacoes-capacitacoes",
          label: "Oferecer orientações e capacitações.",
        },
        {
          key: "canais-atendimento",
          label: "Melhorar os canais de atendimento.",
        },
        { key: "outros", label: "Outros." },
      ],
    },
    {
      key: "q10",
      number: 10,
      kind: "SINGLE",
      required: true,
      title: "De maneira geral, qual nota você daria ao CSDT?",
      options: [
        { key: "0-2", label: "0 a 2 – Muito ruim." },
        { key: "3-4", label: "3 a 4 – Ruim." },
        { key: "5-6", label: "5 a 6 – Regular." },
        { key: "7-8", label: "7 a 8 – Bom." },
        { key: "9-10", label: "9 a 10 – Excelente." },
      ],
    },
    {
      key: "q11",
      number: 11,
      kind: "SINGLE",
      required: true,
      title:
        "Você recomendaria o atendimento do CSDT para outra unidade escolar?",
      options: [
        { key: "sim-com-certeza", label: "Sim, com certeza." },
        { key: "provavelmente-sim", label: "Provavelmente sim." },
        { key: "talvez", label: "Talvez." },
        { key: "provavelmente-nao", label: "Provavelmente não." },
        { key: "nao", label: "Não." },
      ],
    },
    {
      key: "q12",
      number: 12,
      kind: "SINGLE",
      required: true,
      title:
        "Como você avalia a contribuição do CSDT para o funcionamento das atividades administrativas e operacionais da sua unidade?",
      options: [
        { key: "contribui-muito", label: "Contribui muito." },
        { key: "contribui-parcialmente", label: "Contribui parcialmente." },
        { key: "contribui-pouco", label: "Contribui pouco." },
        { key: "nao-contribui", label: "Não contribui." },
        { key: "nao-sei-avaliar", label: "Não sei avaliar." },
      ],
    },
    {
      key: "q13",
      number: 13,
      kind: "MULTI",
      required: true,
      allowsOther: true,
      title:
        "Quais ações você gostaria que o CSDT desenvolvesse futuramente?",
      options: [
        { key: "mais-visitas", label: "Mais visitas técnicas às unidades." },
        {
          key: "agilidade-chamados",
          label: "Maior agilidade na resolução de chamados.",
        },
        {
          key: "novos-recursos",
          label: "Implantação de novos recursos tecnológicos.",
        },
        {
          key: "conectividade",
          label: "Ampliação e melhoria da conectividade.",
        },
        {
          key: "equipamentos-informatica",
          label: "Melhorias nos equipamentos de informática.",
        },
        {
          key: "capacitacao-profissionais",
          label: "Capacitação dos profissionais.",
        },
        {
          key: "acompanhamento-periodico",
          label: "Acompanhamento periódico das unidades.",
        },
        {
          key: "canais-comunicacao",
          label: "Criação de novos canais de comunicação.",
        },
        { key: "outros", label: "Outros." },
      ],
    },
    {
      key: "q14",
      number: 14,
      kind: "OPEN",
      required: false,
      maxLength: 2000,
      title:
        "Deixe uma sugestão, crítica ou elogio para nossa equipe.",
    },
    {
      key: "q15",
      number: 15,
      kind: "SINGLE",
      required: true,
      title:
        "Como você avalia o atendimento, a atenção e a disponibilidade do coordenador do CSDT no relacionamento com as unidades escolares?",
      options: [
        {
          key: "excelente",
          label: "Excelente – Sempre atencioso, acessível e prestativo.",
        },
        {
          key: "muito-bom",
          label: "Muito bom – Demonstra atenção e disponibilidade.",
        },
        {
          key: "bom",
          label: "Bom – Atende satisfatoriamente às demandas.",
        },
        {
          key: "regular",
          label: "Regular – Poderia melhorar a comunicação e a disponibilidade.",
        },
        {
          key: "ruim",
          label: "Ruim – Precisa melhorar o relacionamento e o atendimento.",
        },
        {
          key: "nao-tive-contato",
          label: "Não tive contato direto com o coordenador.",
        },
      ],
    },
    {
      key: "q16",
      number: 16,
      kind: "OPEN",
      required: false,
      maxLength: 2000,
      title:
        "O que o coordenador do CSDT poderia melhorar no relacionamento e no atendimento às unidades?",
    },
  ],
};

export const FEEDBACK_QUESTIONS = FEEDBACK_QUESTIONNAIRE.questions;

export function getFeedbackQuestion(key: string): FeedbackQuestion | undefined {
  return FEEDBACK_QUESTIONS.find((question) => question.key === key);
}

export function isChoiceQuestion(
  question: FeedbackQuestion,
): question is FeedbackChoiceQuestion {
  return question.kind === "SINGLE" || question.kind === "MULTI";
}

export function findByOptionKey(
  question: FeedbackChoiceQuestion,
  key: string,
): FeedbackOption | undefined {
  return question.options.find((option) => option.key === key);
}

/** Snapshot serializável para persistir na versão do questionário. */
export function serializeQuestionnaireDefinition() {
  return JSON.parse(JSON.stringify(FEEDBACK_QUESTIONNAIRE));
}
