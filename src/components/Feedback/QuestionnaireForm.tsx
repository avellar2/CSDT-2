import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FEEDBACK_QUESTIONNAIRE,
  type FeedbackChoiceQuestion,
  type FeedbackOpenQuestion,
  type FeedbackQuestion,
} from "@/utils/feedback/questionnaire";
import {
  FEEDBACK_MAX_NAME_LENGTH,
  FEEDBACK_MAX_OTHER_LENGTH,
  FEEDBACK_MAX_REGISTRATION_LENGTH,
  FEEDBACK_MAX_ROLE_LENGTH,
} from "@/utils/feedback/config";

interface AnswerState {
  optionKeys: string[];
  text: string;
  otherText: string;
}

type AnswersState = Record<string, AnswerState>;

interface RespondentState {
  name: string;
  registration: string;
  role: string;
}

const emptyAnswer: AnswerState = { optionKeys: [], text: "", otherText: "" };

function draftKey(token: string) {
  return `csdt-feedback-draft:${token}`;
}

function readDraft(token: string): { answers: AnswersState; respondent: RespondentState } | null {
  try {
    const raw = window.localStorage.getItem(draftKey(token));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      answers: parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {},
      respondent: {
        name: typeof parsed.respondent?.name === "string" ? parsed.respondent.name : "",
        registration:
          typeof parsed.respondent?.registration === "string"
            ? parsed.respondent.registration
            : "",
        role: typeof parsed.respondent?.role === "string" ? parsed.respondent.role : "",
      },
    };
  } catch {
    return null;
  }
}

function persistDraft(token: string, answers: AnswersState, respondent: RespondentState) {
  try {
    window.localStorage.setItem(
      draftKey(token),
      JSON.stringify({ answers, respondent, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Armazenamento indisponível (modo privado): o formulário continua normal.
  }
}

function clearDraft(token: string) {
  try {
    window.localStorage.removeItem(draftKey(token));
  } catch {
    // Ignora.
  }
}

function isAnswered(question: FeedbackQuestion, answer: AnswerState | undefined): boolean {
  if (!answer) return false;
  if (question.kind === "OPEN") return answer.text.trim().length > 0;
  return answer.optionKeys.length > 0;
}

export interface QuestionnaireFormProps {
  token: string;
  schoolName: string;
  deadlineLabel: string | null;
  onSubmitted: () => void;
}

export function QuestionnaireForm({
  token,
  schoolName,
  deadlineLabel,
  onSubmitted,
}: QuestionnaireFormProps) {
  const [answers, setAnswers] = useState<AnswersState>({});
  const [respondent, setRespondent] = useState<RespondentState>({
    name: "",
    registration: "",
    role: "",
  });
  const [hydrated, setHydrated] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDraftNotice, setShowDraftNotice] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    const draft = readDraft(token);
    if (draft) {
      setAnswers(draft.answers);
      setRespondent(draft.respondent);
      setShowDraftNotice(true);
    }
    setHydrated(true);
  }, [token]);

  useEffect(() => {
    if (!hydrated || submittedRef.current) return;
    persistDraft(token, answers, respondent);
  }, [answers, respondent, hydrated, token]);

  const requiredItems = useMemo(() => {
    const questionItems = FEEDBACK_QUESTIONNAIRE.questions.filter(
      (question) => question.required,
    );
    return questionItems.length + 3;
  }, []);

  const completedItems = useMemo(() => {
    const completedQuestions = FEEDBACK_QUESTIONNAIRE.questions.filter((question) =>
      isAnswered(question, answers[question.key]),
    ).length;
    const completedRespondent = [respondent.name, respondent.registration, respondent.role]
      .filter((value) => value.trim().length > 0).length;
    return completedQuestions + completedRespondent;
  }, [answers, respondent]);

  const progress = Math.min(
    100,
    Math.round((completedItems / requiredItems) * 100),
  );

  const updateAnswer = useCallback((questionKey: string, patch: Partial<AnswerState>) => {
    setAnswers((previous) => ({
      ...previous,
      [questionKey]: { ...(previous[questionKey] ?? emptyAnswer), ...patch },
    }));
  }, []);

  const toggleOption = useCallback(
    (question: FeedbackChoiceQuestion, optionKey: string) => {
      setAnswers((previous) => {
        const current = previous[question.key] ?? emptyAnswer;
        if (question.kind === "SINGLE") {
          return { ...previous, [question.key]: { ...current, optionKeys: [optionKey] } };
        }
        const exists = current.optionKeys.includes(optionKey);
        const optionKeys = exists
          ? current.optionKeys.filter((key) => key !== optionKey)
          : [...current.optionKeys, optionKey];
        return {
          ...previous,
          [question.key]: {
            ...current,
            optionKeys,
            otherText: optionKeys.includes("outros") ? current.otherText : "",
          },
        };
      });
    },
    [],
  );

  const validate = useCallback((): string[] => {
    const found: string[] = [];
    if (!respondent.name.trim()) found.push("Informe o nome completo do responsável.");
    if (!respondent.registration.trim()) found.push("Informe a matrícula funcional.");
    if (!respondent.role.trim()) found.push("Informe a função/cargo na unidade escolar.");

    for (const question of FEEDBACK_QUESTIONNAIRE.questions) {
      if (question.required && !isAnswered(question, answers[question.key])) {
        found.push(`Responda a pergunta ${question.number}.`);
      }
    }
    return found;
  }, [answers, respondent]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const found = validate();
    setErrors(found);
    if (found.length > 0) {
      const firstInvalid = document.querySelector("[data-invalid='true']");
      firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      respondent: {
        name: respondent.name.trim(),
        registration: respondent.registration.trim(),
        role: respondent.role.trim(),
      },
      answers: Object.fromEntries(
        FEEDBACK_QUESTIONNAIRE.questions.map((question) => {
          const answer = answers[question.key] ?? emptyAnswer;
          return [
            question.key,
            {
              optionKeys: answer.optionKeys,
              text: answer.text,
              otherText: answer.otherText,
            },
          ];
        }),
      ),
    };

    try {
      const response = await fetch(`/api/feedback/public/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 201) {
        submittedRef.current = true;
        clearDraft(token);
        onSubmitted();
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (response.status === 422 && Array.isArray(data.errors)) {
        setErrors(data.errors);
      } else if (response.status === 409) {
        submittedRef.current = true;
        clearDraft(token);
        setSubmitError(
          data.errors?.[0] ||
            "Esta pesquisa já foi respondida para esta unidade escolar.",
        );
      } else if (response.status === 410) {
        setSubmitError(data.errors?.[0] || "Este link não está mais disponível.");
      } else if (response.status === 429) {
        setSubmitError(
          "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
        );
      } else {
        setSubmitError(
          data.error || "Não foi possível enviar a pesquisa. Tente novamente.",
        );
      }
    } catch {
      setSubmitError(
        "Falha de conexão. Suas respostas foram preservadas neste dispositivo; tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="pb-24">
      {/* Progresso fixo */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-b-xl">
        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
          <span>Progresso do preenchimento</span>
          <span className="tabular-nums text-[#0b2a5b]">{progress}%</span>
        </div>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Progresso do preenchimento"
        >
          <div
            className="h-full rounded-full bg-[#1d4ed8] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {showDraftNotice && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Encontramos respostas salvas neste dispositivo em um preenchimento anterior.
          Você pode continuar de onde parou.
        </div>
      )}

      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {FEEDBACK_QUESTIONNAIRE.schoolFieldLabel}
        </p>
        <p className="mt-1 text-lg font-semibold text-[#0b2a5b]">{schoolName}</p>
        <p className="mt-1 text-xs text-slate-500">
          Unidade identificada automaticamente pelo link. Não é possível alterá-la.
        </p>
        {deadlineLabel && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Prazo para participação: <strong>{deadlineLabel}</strong>
          </p>
        )}
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p className="font-semibold">Revise os campos abaixo antes de enviar:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {submitError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {submitError}
        </div>
      )}

      <div className="space-y-4">
        {FEEDBACK_QUESTIONNAIRE.questions.map((question) => (
          <QuestionCard
            key={question.key}
            question={question}
            answer={answers[question.key]}
            invalid={question.required && !isAnswered(question, answers[question.key]) && errors.length > 0}
            onToggleOption={toggleOption}
            onText={(value) => updateAnswer(question.key, { text: value })}
            onOtherText={(value) => updateAnswer(question.key, { otherText: value })}
          />
        ))}
      </div>

      {/* Identificação do responsável — obrigatória */}
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-[#0b2a5b]">
          {FEEDBACK_QUESTIONNAIRE.respondentSection.title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Estes dados identificam quem preencheu a pesquisa e ficam visíveis apenas
          para a administração do CSDT.
        </p>

        <div className="mt-5 space-y-5">
          <TextField
            id="respondent-name"
            label={FEEDBACK_QUESTIONNAIRE.respondentSection.fields.name.label}
            required
            value={respondent.name}
            maxLength={FEEDBACK_MAX_NAME_LENGTH}
            autoComplete="name"
            onChange={(value) => setRespondent((prev) => ({ ...prev, name: value }))}
          />
          <TextField
            id="respondent-registration"
            label={FEEDBACK_QUESTIONNAIRE.respondentSection.fields.registration.label}
            required
            value={respondent.registration}
            maxLength={FEEDBACK_MAX_REGISTRATION_LENGTH}
            inputMode="numeric"
            hint="A matrícula é armazenada como texto para preservar zeros à esquerda."
            onChange={(value) =>
              setRespondent((prev) => ({ ...prev, registration: value }))
            }
          />
          <TextField
            id="respondent-role"
            label={FEEDBACK_QUESTIONNAIRE.respondentSection.fields.role.label}
            required
            value={respondent.role}
            maxLength={FEEDBACK_MAX_ROLE_LENGTH}
            placeholder="Ex.: Diretor(a), Coordenador(a), Secretário(a) escolar"
            onChange={(value) => setRespondent((prev) => ({ ...prev, role: value }))}
          />
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Suas respostas são salvas automaticamente neste dispositivo até o envio.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-[#1d4ed8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1a45c0] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Finalizar e enviar pesquisa"}
        </button>
      </div>
    </form>
  );
}

interface QuestionCardProps {
  question: FeedbackQuestion;
  answer: AnswerState | undefined;
  invalid: boolean;
  onToggleOption: (question: FeedbackChoiceQuestion, optionKey: string) => void;
  onText: (value: string) => void;
  onOtherText: (value: string) => void;
}

function QuestionCard({
  question,
  answer,
  invalid,
  onToggleOption,
  onText,
  onOtherText,
}: QuestionCardProps) {
  const current = answer ?? emptyAnswer;
  const inputType = question.kind === "MULTI" ? "checkbox" : "radio";

  return (
    <section
      data-invalid={invalid ? "true" : "false"}
      className={`rounded-xl border bg-white p-5 shadow-sm sm:p-6 ${
        invalid ? "border-red-300" : "border-slate-200"
      }`}
    >
      <fieldset>
        <legend className="text-base font-semibold leading-relaxed text-[#0b2a5b]">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#1d4ed8]">
            {question.number}
          </span>
          {question.title}
          {question.required && (
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          )}
        </legend>

        {question.kind === "OPEN" ? (
          <OpenField
            question={question}
            value={current.text}
            onChange={onText}
            invalid={invalid}
          />
        ) : (
          <div className="mt-4 space-y-2">
            {question.options.map((option) => {
              const checked = current.optionKeys.includes(option.key);
              const optionId = `${question.key}-${option.key}`;
              return (
                <label
                  key={option.key}
                  htmlFor={optionId}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                    checked
                      ? "border-[#1d4ed8] bg-blue-50/70"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    id={optionId}
                    name={question.key}
                    type={inputType}
                    value={option.key}
                    checked={checked}
                    onChange={() => onToggleOption(question, option.key)}
                    className="mt-0.5 h-5 w-5 flex-none accent-[#1d4ed8]"
                  />
                  <span className="leading-relaxed text-slate-700">{option.label}</span>
                </label>
              );
            })}

            {question.allowsOther && current.optionKeys.includes("outros") && (
              <div className="mt-3 pl-8">
                <label
                  htmlFor={`${question.key}-outros-texto`}
                  className="text-xs font-medium text-slate-600"
                >
                  Complemento para &quot;Outros&quot; (opcional)
                </label>
                <input
                  id={`${question.key}-outros-texto`}
                  type="text"
                  value={current.otherText}
                  maxLength={FEEDBACK_MAX_OTHER_LENGTH}
                  onChange={(event) => onOtherText(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-blue-100"
                  placeholder="Descreva, se desejar"
                />
              </div>
            )}
          </div>
        )}
      </fieldset>
    </section>
  );
}

function OpenField({
  question,
  value,
  onChange,
  invalid,
}: {
  question: FeedbackOpenQuestion;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  return (
    <div className="mt-4">
      <textarea
        id={question.key}
        value={value}
        rows={5}
        maxLength={question.maxLength}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
        className="w-full resize-y rounded-lg border border-slate-300 px-3 py-3 text-sm leading-relaxed outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-blue-100"
        placeholder="Escreva sua resposta"
      />
      <p className="mt-1 text-right text-xs text-slate-400">
        {value.length}/{question.maxLength}
      </p>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  required,
  maxLength,
  autoComplete,
  inputMode,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength: number;
  autoComplete?: string;
  inputMode?: "numeric" | "text";
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        type="text"
        required={required}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-blue-100"
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
