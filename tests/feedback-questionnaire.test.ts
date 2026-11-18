import { describe, expect, it } from "vitest";
import {
  FEEDBACK_QUESTIONNAIRE,
  FEEDBACK_QUESTIONNAIRE_VERSION,
  isChoiceQuestion,
} from "@/utils/feedback/questionnaire";

describe("Questionário oficial — Pesquisa de Feedback CSDT", () => {
  it("possui exatamente 16 perguntas numeradas de 1 a 16", () => {
    expect(FEEDBACK_QUESTIONNAIRE.questions).toHaveLength(16);
    expect(FEEDBACK_QUESTIONNAIRE.questions.map((question) => question.number)).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 1),
    );
    expect(FEEDBACK_QUESTIONNAIRE.questions.map((question) => question.key)).toEqual(
      Array.from({ length: 16 }, (_, index) => `q${index + 1}`),
    );
  });

  it("mantém título e identificação institucional", () => {
    expect(FEEDBACK_QUESTIONNAIRE.title).toBe("PESQUISA DE FEEDBACK – CSDT");
    expect(FEEDBACK_QUESTIONNAIRE.organization).toBe(
      "CENTRO DE SUPORTE E DESENVOLVIMENTO TECNOLÓGICO",
    );
    expect(FEEDBACK_QUESTIONNAIRE.subtitle).toBe("Secretaria Municipal de Educação");
    expect(FEEDBACK_QUESTIONNAIRE.schoolFieldLabel).toBe("Unidade escolar");
    expect(FEEDBACK_QUESTIONNAIRE_VERSION).toBe("csdt-feedback-v1");
  });

  it("reproduz o texto exato das perguntas", () => {
    const titles = FEEDBACK_QUESTIONNAIRE.questions.map((question) => question.title);
    expect(titles[0]).toBe("Como você avalia o atendimento prestado pelo CSDT?");
    expect(titles[1]).toBe(
      "Como você avalia o tempo de resposta às solicitações realizadas ao CSDT?",
    );
    expect(titles[2]).toBe(
      "Como você avalia a cordialidade e a atenção da equipe durante o atendimento?",
    );
    expect(titles[3]).toBe(
      "Quando apresenta um problema tecnológico, você consegue obter uma solução adequada?",
    );
    expect(titles[4]).toBe("Como você avalia a comunicação do CSDT com sua unidade escolar?");
    expect(titles[5]).toBe(
      "Você considera que as orientações fornecidas pela equipe são claras e objetivas?",
    );
    expect(titles[6]).toBe("Quais serviços do CSDT você mais utiliza?");
    expect(titles[7]).toBe(
      "Quais são as principais dificuldades tecnológicas enfrentadas atualmente em sua unidade?",
    );
    expect(titles[8]).toBe("O que você considera que o CSDT poderia melhorar?");
    expect(titles[9]).toBe("De maneira geral, qual nota você daria ao CSDT?");
    expect(titles[10]).toBe(
      "Você recomendaria o atendimento do CSDT para outra unidade escolar?",
    );
    expect(titles[11]).toBe(
      "Como você avalia a contribuição do CSDT para o funcionamento das atividades administrativas e operacionais da sua unidade?",
    );
    expect(titles[12]).toBe(
      "Quais ações você gostaria que o CSDT desenvolvesse futuramente?",
    );
    expect(titles[13]).toBe("Deixe uma sugestão, crítica ou elogio para nossa equipe.");
    expect(titles[14]).toBe(
      "Como você avalia o atendimento, a atenção e a disponibilidade do coordenador do CSDT no relacionamento com as unidades escolares?",
    );
    expect(titles[15]).toBe(
      "O que o coordenador do CSDT poderia melhorar no relacionamento e no atendimento às unidades?",
    );
  });

  it("reproduz exatamente as alternativas das perguntas de seleção única", () => {
    const q1 = FEEDBACK_QUESTIONNAIRE.questions[0];
    const q2 = FEEDBACK_QUESTIONNAIRE.questions[1];
    const q3 = FEEDBACK_QUESTIONNAIRE.questions[2];
    const q4 = FEEDBACK_QUESTIONNAIRE.questions[3];
    const q5 = FEEDBACK_QUESTIONNAIRE.questions[4];
    const q6 = FEEDBACK_QUESTIONNAIRE.questions[5];
    const q10 = FEEDBACK_QUESTIONNAIRE.questions[9];
    const q11 = FEEDBACK_QUESTIONNAIRE.questions[10];
    const q12 = FEEDBACK_QUESTIONNAIRE.questions[11];
    const q15 = FEEDBACK_QUESTIONNAIRE.questions[14];

    expect(isChoiceQuestion(q1) && q1.options.map((option) => option.label)).toEqual([
      "Excelente.",
      "Bom.",
      "Regular.",
      "Ruim.",
      "Nunca utilizei o atendimento.",
    ]);
    expect(isChoiceQuestion(q2) && q2.options.map((option) => option.label)).toEqual([
      "Muito rápido.",
      "Rápido.",
      "Satisfatório.",
      "Demorado.",
      "Muito demorado.",
      "Não sei avaliar.",
    ]);
    expect(isChoiceQuestion(q3) && q3.options.map((option) => option.label)).toEqual([
      "Excelente.",
      "Boa.",
      "Regular.",
      "Precisa melhorar.",
      "Não tive contato direto com a equipe.",
    ]);
    expect(isChoiceQuestion(q4) && q4.options.map((option) => option.label)).toEqual([
      "Sempre.",
      "Na maioria das vezes.",
      "Às vezes.",
      "Raramente.",
      "Nunca.",
      "Não sei avaliar.",
    ]);
    expect(isChoiceQuestion(q5) && q5.options.map((option) => option.label)).toEqual([
      "Excelente.",
      "Boa.",
      "Regular.",
      "Insatisfatória.",
      "Não tenho contato frequente.",
    ]);
    expect(isChoiceQuestion(q6) && q6.options.map((option) => option.label)).toEqual([
      "Sim, sempre.",
      "Na maioria das vezes.",
      "Às vezes.",
      "Raramente.",
      "Não.",
    ]);
    expect(isChoiceQuestion(q10) && q10.options.map((option) => option.label)).toEqual([
      "0 a 2 – Muito ruim.",
      "3 a 4 – Ruim.",
      "5 a 6 – Regular.",
      "7 a 8 – Bom.",
      "9 a 10 – Excelente.",
    ]);
    expect(isChoiceQuestion(q11) && q11.options.map((option) => option.label)).toEqual([
      "Sim, com certeza.",
      "Provavelmente sim.",
      "Talvez.",
      "Provavelmente não.",
      "Não.",
    ]);
    expect(isChoiceQuestion(q12) && q12.options.map((option) => option.label)).toEqual([
      "Contribui muito.",
      "Contribui parcialmente.",
      "Contribui pouco.",
      "Não contribui.",
      "Não sei avaliar.",
    ]);
    expect(isChoiceQuestion(q15) && q15.options.map((option) => option.label)).toEqual([
      "Excelente – Sempre atencioso, acessível e prestativo.",
      "Muito bom – Demonstra atenção e disponibilidade.",
      "Bom – Atende satisfatoriamente às demandas.",
      "Regular – Poderia melhorar a comunicação e a disponibilidade.",
      "Ruim – Precisa melhorar o relacionamento e o atendimento.",
      "Não tive contato direto com o coordenador.",
    ]);
  });

  it("reproduz exatamente as alternativas das perguntas de múltipla seleção", () => {
    const q7 = FEEDBACK_QUESTIONNAIRE.questions[6];
    const q8 = FEEDBACK_QUESTIONNAIRE.questions[7];
    const q9 = FEEDBACK_QUESTIONNAIRE.questions[8];
    const q13 = FEEDBACK_QUESTIONNAIRE.questions[12];

    expect(q7.kind).toBe("MULTI");
    expect(q8.kind).toBe("MULTI");
    expect(q9.kind).toBe("MULTI");
    expect(q13.kind).toBe("MULTI");

    expect(isChoiceQuestion(q7) && q7.options.map((option) => option.label)).toEqual([
      "Suporte técnico em computadores.",
      "Suporte à internet e conectividade.",
      "Atendimento e suporte a impressoras.",
      "Suporte a equipamentos tecnológicos.",
      "Instalação e configuração de equipamentos.",
      "Configuração e suporte de sistemas e softwares.",
      "Suporte a equipamentos de informática e periféricos.",
      "Outros.",
    ]);
    expect(isChoiceQuestion(q8) && q8.options.map((option) => option.label)).toEqual([
      "Computadores com defeito ou lentidão.",
      "Falta de computadores ou equipamentos.",
      "Problemas de conexão com a internet.",
      "Problemas com impressoras.",
      "Dificuldades com equipamentos multimídia.",
      "Problemas com projetores e telas interativas.",
      "Problemas com rede interna e Wi-Fi.",
      "Dificuldades com sistemas e softwares.",
      "Falta de orientação ou capacitação tecnológica.",
      "Outros.",
    ]);
    expect(isChoiceQuestion(q9) && q9.options.map((option) => option.label)).toEqual([
      "Reduzir o tempo de atendimento.",
      "Melhorar a comunicação com as unidades.",
      "Ampliar o suporte técnico.",
      "Melhorar o acompanhamento das solicitações.",
      "Realizar mais visitas técnicas.",
      "Ampliar a disponibilidade de equipamentos.",
      "Oferecer orientações e capacitações.",
      "Melhorar os canais de atendimento.",
      "Outros.",
    ]);
    expect(isChoiceQuestion(q13) && q13.options.map((option) => option.label)).toEqual([
      "Mais visitas técnicas às unidades.",
      "Maior agilidade na resolução de chamados.",
      "Implantação de novos recursos tecnológicos.",
      "Ampliação e melhoria da conectividade.",
      "Melhorias nos equipamentos de informática.",
      "Capacitação dos profissionais.",
      "Acompanhamento periódico das unidades.",
      "Criação de novos canais de comunicação.",
      "Outros.",
    ]);
  });

  it("define as perguntas abertas 14 e 16 e permite complemento em Outros", () => {
    const q14 = FEEDBACK_QUESTIONNAIRE.questions[13];
    const q16 = FEEDBACK_QUESTIONNAIRE.questions[15];
    expect(q14.kind).toBe("OPEN");
    expect(q16.kind).toBe("OPEN");

    const multiWithOther = FEEDBACK_QUESTIONNAIRE.questions.filter(
      (question) => question.kind === "MULTI" && question.allowsOther,
    );
    expect(multiWithOther.map((question) => question.number)).toEqual([7, 8, 9, 13]);
  });

  it("possui seção de identificação do responsável sem assinatura", () => {
    const section = FEEDBACK_QUESTIONNAIRE.respondentSection;
    expect(section.title).toBe("Identificação do responsável pelo preenchimento");
    expect(section.fields.name.label).toBe("Nome completo");
    expect(section.fields.registration.label).toBe("Matrícula funcional");
    expect(section.fields.role.label).toBe("Função/cargo na unidade escolar");
    expect(section.fields.name.required).toBe(true);
    expect(section.fields.registration.required).toBe(true);
    expect(section.fields.role.required).toBe(true);

    const definition = JSON.stringify(FEEDBACK_QUESTIONNAIRE).toLowerCase();
    expect(definition).not.toContain("assinatura");
    expect(definition).not.toContain("signature");
  });

  it("mantém o encerramento institucional", () => {
    expect(FEEDBACK_QUESTIONNAIRE.closingMessage).toBe(
      "Obrigado por contribuir! Sua participação é importante para aprimorarmos continuamente o atendimento e os serviços tecnológicos oferecidos às unidades da rede municipal.",
    );
  });
});
