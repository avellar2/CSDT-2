import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { feedbackApi } from "./api";

interface QuestionDistribution {
  questionKey: string;
  number: number;
  title: string;
  kind: "SINGLE" | "MULTI" | "OPEN";
  answeredCount: number;
  buckets: Array<{ key: string; label: string; count: number; percent: number }>;
  otherTexts: string[];
}

interface StatsResponse {
  totalResponses: number;
  note: string;
  questions: QuestionDistribution[];
  participation: {
    invitationsTotal: number;
    invitationsSent: number;
    invitationsFailed: number;
    responses: number;
    participationPercent: number;
  };
  campaigns: Array<{ id: number; name: string; responses: number }>;
}

export function AdminStats() {
  const [campaigns, setCampaigns] = useState<Array<{ id: number; name: string; channel: string }>>(
    [],
  );
  const [campaignId, setCampaignId] = useState("");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    feedbackApi<{ campaigns: Array<{ id: number; name: string; channel: string }> }>(
      "/api/feedback/admin/campaigns",
    )
      .then((response) =>
        setCampaigns(response.campaigns.filter((campaign) => campaign.channel === "OFFICIAL")),
      )
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (campaignId) params.set("campaignId", campaignId);
      const response = await feedbackApi<StatsResponse>(
        `/api/feedback/admin/stats?${params.toString()}`,
      );
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar estatísticas.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const choiceQuestions =
    data?.questions.filter((question) => question.kind !== "OPEN") ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-xs font-medium text-slate-600">
          Campanha
          <select
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todas as campanhas oficiais</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Summary label="Respostas oficiais" value={data.totalResponses} />
            <Summary label="Convites gerados" value={data.participation.invitationsTotal} />
            <Summary label="Convites enviados" value={data.participation.invitationsSent} />
            <Summary label="Participação" value={`${data.participation.participationPercent}%`} />
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            {data.note}
          </div>

          {data.totalResponses === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Ainda não há respostas oficiais para exibir estatísticas.
              {campaignId && " Tente selecionar outra campanha."}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            {choiceQuestions.map((question) => (
              <QuestionChart key={question.questionKey} question={question} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {data.questions
              .filter((question) => question.kind === "OPEN")
              .map((question) => (
                <div
                  key={question.questionKey}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <h3 className="text-sm font-semibold text-slate-800">
                    P{question.number}. {question.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {question.answeredCount} resposta(s) escrita(s). Veja a aba
                    &quot;Comentários&quot; para o texto completo.
                  </p>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function QuestionChart({ question }: { question: QuestionDistribution }) {
  const chartData = question.buckets.map((bucket) => ({
    label: bucket.label.replace(/\.$/, ""),
    count: bucket.count,
    percent: bucket.percent,
  }));

  const height = Math.max(180, chartData.length * 34);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-800">
        P{question.number}. {question.title}
      </h3>
      <p className="mt-0.5 text-[11px] text-slate-500">
        {question.kind === "MULTI"
          ? `${question.answeredCount} respondente(s) · múltipla seleção (percentual sobre respondentes)`
          : `${question.answeredCount} resposta(s) · seleção única`}
      </p>

      <div className="mt-3" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 40, bottom: 4, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={190}
              tick={{ fontSize: 11 }}
              interval={0}
            />
            <Tooltip
              formatter={(value) => [`${value ?? 0} resposta(s)`, "Quantidade"]}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="count" fill="#1d4ed8" radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {question.otherTexts.length > 0 && (
        <div className="mt-2 rounded-md bg-slate-50 p-2 text-[11px] text-slate-600">
          <span className="font-medium">Complementos &quot;Outros&quot;:</span>{" "}
          {question.otherTexts.slice(0, 5).join(" · ")}
          {question.otherTexts.length > 5 && ` (+${question.otherTexts.length - 5})`}
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[#0b2a5b]">{value}</p>
    </div>
  );
}
