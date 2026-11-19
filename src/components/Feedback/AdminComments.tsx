import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { feedbackApi, formatDateTime } from "./api";

interface CommentRow {
  id: number;
  questionKey: string;
  textValue: string | null;
  Response: {
    id: number;
    submittedAt: string;
    respondentName: string;
    School: { name: string; district: string | null };
    Campaign: { id: number; name: string };
  };
}

interface CommentsResponse {
  page: number;
  pageSize: number;
  total: number;
  rows: CommentRow[];
  districts: string[];
}

export function AdminComments() {
  const [campaigns, setCampaigns] = useState<Array<{ id: number; name: string; channel: string }>>(
    [],
  );
  const [campaignId, setCampaignId] = useState("");
  const [district, setDistrict] = useState("");
  const [school, setSchool] = useState("");
  const [text, setText] = useState("");
  const [questionKey, setQuestionKey] = useState<"" | "q14" | "q16">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CommentsResponse | null>(null);
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
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (campaignId) params.set("campaignId", campaignId);
      if (district) params.set("district", district);
      if (school.trim()) params.set("school", school.trim());
      if (text.trim()) params.set("q", text.trim());
      if (questionKey) params.set("questionKey", questionKey);
      const response = await feedbackApi<CommentsResponse>(
        `/api/feedback/admin/comments?${params.toString()}`,
      );
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar comentários.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, district, school, text, questionKey, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium text-slate-600">
          Campanha
          <select
            value={campaignId}
            onChange={(event) => {
              setCampaignId(event.target.value);
              setPage(1);
            }}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-slate-600">
          Pergunta
          <select
            value={questionKey}
            onChange={(event) => {
              setQuestionKey(event.target.value as "" | "q14" | "q16");
              setPage(1);
            }}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todas (14 e 16)</option>
            <option value="q14">P14 — sugestão, crítica ou elogio</option>
            <option value="q16">P16 — melhorias do coordenador</option>
          </select>
        </label>

        <label className="text-xs font-medium text-slate-600">
          Distrito
          <select
            value={district}
            onChange={(event) => {
              setDistrict(event.target.value);
              setPage(1);
            }}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {(data?.districts ?? []).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-slate-600">
          Escola
          <input
            value={school}
            onChange={(event) => {
              setSchool(event.target.value);
              setPage(1);
            }}
            className="mt-1 block w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Nome da escola"
          />
        </label>

        <label className="flex-1 text-xs font-medium text-slate-600">
          Busca no comentário
          <input
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full min-w-[180px] rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Palavra ou expressão"
          />
        </label>

        <button
          type="button"
          onClick={load}
          className="mb-0.5 inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {data?.rows.map((row) => (
          <article
            key={row.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {row.Response.School.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {row.Response.School.district || "Distrito não informado"} ·{" "}
                  {row.Response.Campaign.name} · {formatDateTime(row.Response.submittedAt)}
                </p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                {row.questionKey === "q14" ? "P14" : "P16"}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {row.textValue}
            </p>
            <p className="mt-2 text-[11px] text-slate-600">
              Responsável: {row.Response.respondentName}
            </p>
          </article>
        ))}
        {data && data.rows.length === 0 && !loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Nenhum comentário encontrado.
          </div>
        )}
      </div>

      {data && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{data.total} comentário(s)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
