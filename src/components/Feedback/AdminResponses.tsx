import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FlaskConical,
  Info,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { feedbackApi, formatDateTime } from "./api";
import { getAuthHeaders } from "@/utils/client-auth";
import { FEEDBACK_QUESTIONNAIRE } from "@/utils/feedback/questionnaire";

interface CampaignOption {
  id: number;
  name: string;
  channel: string;
}

interface ResponseRow {
  id: number;
  respondentName: string;
  respondentRegistration: string;
  respondentRole: string;
  submittedAt: string;
  channel: string;
  schoolId: number;
  School: { name: string; district: string | null };
  Campaign: { id: number; name: string; channel: string };
  Invite: { sentAt: string | null; recipientEmail: string } | null;
}

interface ResponsesResponse {
  page: number;
  pageSize: number;
  total: number;
  rows: ResponseRow[];
  districts: string[];
  counts?: { official: number; test: number };
}

interface ResponseDetail {
  id: number;
  school: { name: string; district: string | null };
  campaign: { id: number; name: string; channel: string };
  sentAt: string | null;
  recipientEmail: string | null;
  submittedAt: string;
  channel: string;
  respondent: { name: string; registration: string; role: string };
  answers: Array<{
    questionKey: string;
    kind: string;
    optionKeys: string[];
    optionLabels: string[];
    textValue: string | null;
    otherText: string | null;
  }>;
}

export type ResponsesChannelView = "ALL" | "OFFICIAL" | "TEST";

const CHANNEL_OPTIONS: Array<{ value: ResponsesChannelView; label: string }> = [
  { value: "ALL", label: "Todos os canais (oficiais e testes)" },
  { value: "OFFICIAL", label: "Somente respostas oficiais" },
  { value: "TEST", label: "Somente respostas de teste" },
];

export function AdminResponses({
  initialChannel = "ALL",
}: {
  initialChannel?: ResponsesChannelView;
}) {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [district, setDistrict] = useState("");
  const [search, setSearch] = useState("");
  const [channelView, setChannelView] = useState<ResponsesChannelView>(initialChannel);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ResponsesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<ResponseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setChannelView(initialChannel);
  }, [initialChannel]);

  useEffect(() => {
    feedbackApi<{ campaigns: CampaignOption[] }>("/api/feedback/admin/campaigns")
      .then((response) => setCampaigns(response.campaigns))
      .catch(() => undefined);
  }, []);

  // Mantém o filtro de campanha coerente com o canal escolhido.
  useEffect(() => {
    if (!campaignId) return;
    const selected = campaigns.find((campaign) => String(campaign.id) === campaignId);
    if (!selected) return;
    if (channelView === "OFFICIAL" && selected.channel === "TEST") setCampaignId("");
    if (channelView === "TEST" && selected.channel !== "TEST") setCampaignId("");
  }, [channelView, campaigns, campaignId]);

  const buildParams = useCallback(
    (includePaging: boolean) => {
      const params = new URLSearchParams();
      if (includePaging) {
        params.set("page", String(page));
        params.set("pageSize", "25");
      }
      if (campaignId) params.set("campaignId", campaignId);
      if (district) params.set("district", district);
      if (search.trim()) params.set("q", search.trim());
      if (channelView === "ALL") params.set("includeTest", "1");
      else params.set("channel", channelView);
      return params;
    },
    [campaignId, district, search, channelView, page],
  );

  const fetchData = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const response = await feedbackApi<ResponsesResponse>(
          `/api/feedback/admin/responses?${buildParams(true).toString()}`,
        );
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar respostas.");
      } finally {
        if (showSpinner) setLoading(false);
        setRefreshing(false);
      }
    },
    [buildParams],
  );

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Atualiza sozinho a cada 60s e ao voltar o foco para a aba, sem reiniciar
  // o servidor e sem recarregar a página inteira.
  useEffect(() => {
    const onFocus = () => fetchData(false);
    const timer = window.setInterval(() => fetchData(false), 60_000);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchData]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const response = await feedbackApi<ResponseDetail>(
        `/api/feedback/admin/responses/${id}`,
      );
      setDetail(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar resposta.");
    } finally {
      setDetailLoading(false);
    }
  };

  const exportCsv = async () => {
    setError(null);
    try {
      const response = await fetch(
        `/api/feedback/admin/export?${buildParams(false).toString()}`,
        { headers: getAuthHeaders() },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Erro ao exportar CSV.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pesquisa-feedback-csdt-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao exportar CSV.");
    }
  };

  const visibleCampaigns = useMemo(() => {
    if (channelView === "OFFICIAL") {
      return campaigns.filter((campaign) => campaign.channel !== "TEST");
    }
    if (channelView === "TEST") {
      return campaigns.filter((campaign) => campaign.channel === "TEST");
    }
    return campaigns;
  }, [campaigns, channelView]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const counts = data?.counts;
  const hasTestOnly = (counts?.test ?? 0) > 0 && (counts?.official ?? 0) === 0;

  const emptyState = useMemo(() => {
    if (channelView === "OFFICIAL" && (counts?.test ?? 0) > 0) {
      return {
        title: "Nenhuma resposta oficial ainda",
        body: `Existem ${counts?.test} resposta(s) de TESTE registrada(s). Elas não entram nos indicadores oficiais, mas podem ser consultadas.`,
        action: "Ver respostas de teste" as const,
      };
    }
    if (channelView === "TEST" && (counts?.test ?? 0) === 0) {
      return {
        title: "Nenhuma resposta de teste",
        body: "Ainda não há respostas de campanhas TEST. Use o envio de teste na Visão Geral para gerar uma.",
        action: null,
      };
    }
    return {
      title: "Nenhuma resposta encontrada",
      body: "Ajuste os filtros ou aguarde novas respostas. A lista se atualiza automaticamente a cada 60 segundos.",
      action: null,
    };
  }, [channelView, counts]);

  return (
    <div className="space-y-4">
      {/* Aviso sobre testes */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        <FlaskConical className="mt-0.5 h-4 w-4 flex-none" />
        <p>
          Respostas de <strong>TESTE</strong> aparecem identificadas e{" "}
          {channelView === "ALL"
            ? "estão visíveis por padrão"
            : "podem ser exibidas selecionando o canal correspondente"}
          . Elas <strong>não entram</strong> nos indicadores oficiais, nas estatísticas
          nem nos números do Dashboard.
        </p>
      </div>

      {/* Filtros */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-slate-600">
            Campanha
            <select
              value={campaignId}
              onChange={(event) => {
                setCampaignId(event.target.value);
                setPage(1);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              <option value="">Todas as campanhas</option>
              {visibleCampaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.channel === "TEST" ? "[TESTE] " : ""}
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Canal
            <select
              value={channelView}
              onChange={(event) => {
                setChannelView(event.target.value as ResponsesChannelView);
                setPage(1);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              {CHANNEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Distrito
            <select
              value={district}
              onChange={(event) => {
                setDistrict(event.target.value);
                setPage(1);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              <option value="">Todos</option>
              {(data?.districts ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Buscar escola
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Nome da escola"
                className="block w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm text-slate-900"
              />
            </div>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-600">
            {data
              ? `${data.total} resposta(s) no filtro atual`
              : "Carregando respostas..."}
            {counts
              ? ` · ${counts.official} oficial(is) · ${counts.test} teste(s) no total`
              : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fetchData(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d4ed8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a45c0]"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Escola</th>
              <th className="px-4 py-3 font-semibold">Distrito</th>
              <th className="px-4 py-3 font-semibold">Campanha</th>
              <th className="px-4 py-3 font-semibold">Enviado</th>
              <th className="px-4 py-3 font-semibold">Respondido</th>
              <th className="px-4 py-3 font-semibold">Responsável</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {row.School.name}
                </td>
                <td className="px-4 py-3 text-slate-700">{row.School.district || "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-700">
                  <span className="flex flex-wrap items-center gap-1">
                    {row.channel === "TEST" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                        Teste
                      </span>
                    )}
                    <span>{row.Campaign.name}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDateTime(row.Invite?.sentAt ?? null)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDateTime(row.submittedAt)}
                </td>
                <td className="px-4 py-3 text-slate-800">
                  {row.respondentName}
                  <span className="block text-[11px] text-slate-600">
                    Mat. {row.respondentRegistration} · {row.respondentRole}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openDetail(row.id)}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-[#1d4ed8] hover:bg-blue-50"
                  >
                    Ver respostas
                  </button>
                </td>
              </tr>
            ))}

            {data && data.rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12">
                  <div className="mx-auto max-w-md text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      {hasTestOnly ? (
                        <FlaskConical className="h-5 w-5" />
                      ) : (
                        <Info className="h-5 w-5" />
                      )}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      {emptyState.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {emptyState.body}
                    </p>
                    {emptyState.action && (
                      <button
                        type="button"
                        onClick={() => {
                          setChannelView("ALL");
                          setPage(1);
                        }}
                        className="mt-3 rounded-lg bg-[#1d4ed8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a45c0]"
                      >
                        {emptyState.action}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {loading && !data && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-600">
                  Carregando respostas...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>{data.total} resposta(s)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700 disabled:opacity-40"
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
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Modal de detalhes */}
      {(detail || detailLoading) && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="my-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-[#0b2a5b]">
                    {detail ? detail.school.name : "Carregando..."}
                  </h3>
                  {detail?.channel === "TEST" && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                      Teste
                    </span>
                  )}
                </div>
                {detail && (
                  <p className="mt-0.5 text-xs text-slate-600">
                    {detail.campaign.name} · respondido em{" "}
                    {formatDateTime(detail.submittedAt)}
                    {detail.recipientEmail ? ` · ${detail.recipientEmail}` : ""}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading && !detail && (
              <div className="p-6 text-sm text-slate-600">Carregando respostas...</div>
            )}

            {detail && (
              <div className="max-h-[72vh] overflow-y-auto p-5">
                {detail.channel === "TEST" && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Resposta de TESTE — não compõe indicadores oficiais.
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Identificação do responsável
                  </h4>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-slate-600">Nome completo</dt>
                      <dd className="font-semibold text-slate-900">
                        {detail.respondent.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-600">Matrícula funcional</dt>
                      <dd className="font-semibold text-slate-900">
                        {detail.respondent.registration}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-600">Função/cargo</dt>
                      <dd className="font-semibold text-slate-900">
                        {detail.respondent.role}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-4 space-y-3">
                  {FEEDBACK_QUESTIONNAIRE.questions.map((question) => {
                    const answer = detail.answers.find(
                      (entry) => entry.questionKey === question.key,
                    );
                    return (
                      <div
                        key={question.key}
                        className="rounded-xl border border-slate-200 bg-white p-3.5"
                      >
                        <p className="text-sm font-semibold leading-snug text-slate-900">
                          <span className="mr-1.5 text-[#1d4ed8]">{question.number}.</span>
                          {question.title}
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                          {answer?.textValue
                            ? answer.textValue
                            : answer && answer.optionLabels.length > 0
                              ? `${answer.optionLabels.join(" · ")}${
                                  answer.otherText ? ` (Outros: ${answer.otherText})` : ""
                                }`
                              : "Não respondida."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
