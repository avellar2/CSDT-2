import { useRouter } from "next/router";
import useSWR from "swr";
import { ArrowRight, ClipboardList, Loader2, Star } from "lucide-react";
import { getAuthHeadersNoContentType } from "@/utils/client-auth";
import { CAMPAIGN_STATUS_LABELS } from "./api";

interface DashboardSnapshot {
  activeCampaign:
    | {
        id: number;
        name: string;
        status: string;
        createdAt: string;
        invitationsTotal: number;
        invitationsSent: number;
        invitationsFailed: number;
        responses: number;
        pendingResponses: number;
        participationPercent: number;
        newResponses: number;
      }
    | null;
  hasOfficialCampaigns: boolean;
  newResponses: number;
  lastSeenAt: string | null;
}

interface OverviewSubset {
  dashboard?: DashboardSnapshot | null;
}

async function fetcher(url: string): Promise<OverviewSubset> {
  const response = await fetch(url, { headers: getAuthHeadersNoContentType() });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * Card da Pesquisa de Feedback no Dashboard.
 * Visível apenas para ADMTOTAL (o card nem é montado para outras roles).
 * Revalida a cada 60s, sem refetch ao ganhar foco.
 */
export function FeedbackSurveyCard({
  isFavorite,
  onToggleFavorite,
  onOpen,
}: {
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen?: () => void;
}) {
  const router = useRouter();

  const { data, error, isLoading } = useSWR<OverviewSubset>(
    "/api/feedback/admin/overview",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
      errorRetryCount: 1,
    },
  );

  const snapshot = data?.dashboard ?? null;
  const campaign = snapshot?.activeCampaign ?? null;
  const newResponses = snapshot?.newResponses ?? 0;

  const openPanel = () => {
    if (onOpen) onOpen();
    else router.push("/admin/feedback");
  };

  const metrics = campaign
    ? [
        {
          label: "Convites enviados",
          value: campaign.invitationsSent,
          hint: "aceitos pelo SMTP",
        },
        {
          label: "Escolas responderam",
          value: campaign.responses,
          hint: "respostas oficiais",
        },
        {
          label: "Escolas pendentes",
          value: campaign.pendingResponses,
          hint: "sem resposta",
        },
        {
          label: "Participação",
          value: `${campaign.participationPercent}%`,
          hint: "respostas / convites",
        },
      ]
    : [];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Abrir painel da Pesquisa de Feedback"
      onClick={openPanel}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPanel();
        }
      }}
      className="relative cursor-pointer sm:col-span-2 bg-gradient-to-br from-[#0b2a5b] via-[#123a7a] to-[#1d4ed8] text-white p-5 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.01] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite();
        }}
        aria-label={
          isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"
        }
        className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/20 transition-colors"
      >
        <Star
          size={16}
          className={
            isFavorite
              ? "text-yellow-300 fill-yellow-300"
              : "text-white/70 hover:text-white"
          }
        />
      </button>

      {newResponses > 0 && (
        <div
          className="absolute -top-2 -left-2 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow"
          title={`${newResponses} resposta(s) nova(s) desde sua última visualização`}
        >
          {newResponses > 99 ? "99+" : newResponses}
        </div>
      )}

      <div className="flex items-start justify-between gap-3 pr-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-white/15">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">
              Pesquisa de Feedback
            </p>
            <p className="mt-0.5 text-[11px] text-blue-100">
              {campaign
                ? campaign.name
                : snapshot
                  ? "Nenhuma campanha oficial criada"
                  : "Carregando indicadores..."}
            </p>
          </div>
        </div>

        {campaign && (
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-blue-50">
            {CAMPAIGN_STATUS_LABELS[campaign.status] ?? campaign.status}
          </span>
        )}
      </div>

      {isLoading && !snapshot && (
        <div className="mt-4 flex items-center gap-2 text-xs text-blue-100">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Atualizando...
        </div>
      )}

      {error && !snapshot && (
        <p className="mt-4 text-xs text-blue-100">
          Indicadores indisponíveis no momento. Abra o painel para tentar novamente.
        </p>
      )}

      {snapshot && !campaign && (
        <p className="mt-4 text-xs leading-relaxed text-blue-100">
          Crie uma campanha oficial no painel para acompanhar convites e respostas.
          Campanhas de teste não entram nestes números.
        </p>
      )}

      {campaign && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg bg-white/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-blue-100">
                {metric.label}
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums">
                {metric.value}
              </p>
              <p className="text-[10px] text-blue-200">{metric.hint}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] leading-snug text-blue-200">
          &quot;Enviados&quot; = aceitos pelo SMTP; entrega na caixa de entrada não é
          confirmada. Atualiza a cada 60s.
        </p>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-white/90">
          Abrir painel <ArrowRight size={14} />
        </span>
      </div>
    </div>
  );
}
