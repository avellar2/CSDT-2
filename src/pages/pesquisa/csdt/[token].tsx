import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { AlertTriangle, CheckCircle2, Clock, Loader2, Lock } from "lucide-react";
import { QuestionnaireForm } from "@/components/Feedback/QuestionnaireForm";
import { FEEDBACK_QUESTIONNAIRE } from "@/utils/feedback/questionnaire";
import { formatDeadlineLabel } from "@/utils/feedback/email";

type InviteState = "available" | "answered" | "expired" | "closed" | "invalid";

interface PublicView {
  state: InviteState;
  campaign: { name: string; deadline: string | null } | null;
  school: { name: string } | null;
}

export default function PesquisaFeedbackCsdtPage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";

  const [view, setView] = useState<PublicView | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!router.isReady || !token) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/feedback/public/${encodeURIComponent(token)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok) {
          setRequestError(
            data?.error || "Não foi possível carregar a pesquisa.",
          );
          return;
        }
        setView(data);
      })
      .catch(() => {
        if (!cancelled) {
          setRequestError(
            "Falha de conexão ao carregar a pesquisa. Verifique sua internet e tente novamente.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router.isReady, token]);

  const deadlineLabel = useMemo(
    () => formatDeadlineLabel(view?.campaign?.deadline ? new Date(view.campaign.deadline) : null),
    [view?.campaign?.deadline],
  );

  const schoolName = view?.school?.name ?? "";

  return (
    <>
      <Head>
        <title>Pesquisa de Feedback – CSDT</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-slate-50">
        <header className="bg-[#0b2a5b] px-4 py-8 text-center">
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <Image
              src="/images/logo.png"
              alt="CSDT"
              width={64}
              height={64}
              className="h-16 w-16 object-contain"
              priority
            />
            <h1 className="mt-4 text-xl font-bold text-white sm:text-2xl">
              {FEEDBACK_QUESTIONNAIRE.title}
            </h1>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-blue-100">
              {FEEDBACK_QUESTIONNAIRE.organization}
            </p>
            <p className="text-[11px] uppercase tracking-widest text-blue-200">
              {FEEDBACK_QUESTIONNAIRE.subtitle}
            </p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 py-8">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              <p className="text-sm">Carregando pesquisa...</p>
            </div>
          )}

          {!loading && requestError && (
            <StatusCard
              tone="danger"
              icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
              title="Não foi possível abrir a pesquisa"
              description={requestError}
            />
          )}

          {!loading && !requestError && view?.state === "invalid" && (
            <StatusCard
              tone="danger"
              icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
              title="Link inválido"
              description="Este link não corresponde a um convite válido da Pesquisa de Feedback do CSDT. Solicite um novo convite à equipe."
            />
          )}

          {!loading && !requestError && view?.state === "expired" && (
            <StatusCard
              tone="warning"
              icon={<Clock className="h-6 w-6" aria-hidden="true" />}
              title="Link expirado"
              description="O prazo para responder esta pesquisa terminou. Entre em contato com o CSDT caso precise de um novo convite."
            />
          )}

          {!loading && !requestError && view?.state === "closed" && (
            <StatusCard
              tone="warning"
              icon={<Lock className="h-6 w-6" aria-hidden="true" />}
              title="Pesquisa encerrada"
              description="Esta campanha foi encerrada pelo CSDT e não está mais recebendo respostas."
            />
          )}

          {!loading && !requestError && (view?.state === "answered" || submitted) && (
            <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-[#0b2a5b]">
                Resposta registrada com sucesso
              </h2>
              {schoolName && (
                <p className="mt-2 text-sm font-medium text-slate-600">{schoolName}</p>
              )}
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
                {FEEDBACK_QUESTIONNAIRE.closingMessage}
              </p>
            </div>
          )}

          {!loading && !requestError && view?.state === "available" && (
            <>
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm leading-relaxed text-slate-600">
                  {FEEDBACK_QUESTIONNAIRE.objective}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  São 16 perguntas. O preenchimento leva cerca de 5 minutos.
                </p>
              </div>

              <QuestionnaireForm
                token={token}
                schoolName={schoolName}
                deadlineLabel={deadlineLabel}
                onSubmitted={() => setSubmitted(true)}
              />
            </>
          )}
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center">
          <p className="text-xs text-slate-500">
            Centro de Suporte e Desenvolvimento Tecnológico — Secretaria Municipal de Educação
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Esta página não exige login. Nenhum dado de outras unidades escolares é exibido.
          </p>
        </footer>
      </div>
    </>
  );
}

function StatusCard({
  tone,
  icon,
  title,
  description,
}: {
  tone: "danger" | "warning";
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-8 text-center shadow-sm ${
        tone === "danger" ? "border-red-200" : "border-amber-200"
      }`}
    >
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
          tone === "danger"
            ? "bg-red-50 text-red-600"
            : "bg-amber-50 text-amber-600"
        }`}
      >
        {icon}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[#0b2a5b]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
        {description}
      </p>
    </div>
  );
}
