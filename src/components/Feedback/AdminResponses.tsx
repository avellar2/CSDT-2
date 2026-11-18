import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
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

export function AdminResponses() {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [district, setDistrict] = useState("");
  const [search, setSearch] = useState("");
  const [includeTest, setIncludeTest] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ResponsesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<ResponseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    feedbackApi<{ campaigns: CampaignOption[] }>("/api/feedback/admin/campaigns")
      .then((response) => setCampaigns(response.campaigns))
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (campaignId) params.set("campaignId", campaignId);
      if (district) params.set("district", district);
      if (search.trim()) params.set("q", search.trim());
      if (includeTest) params.set("includeTest", "1");
      const response = await feedbackApi<ResponsesResponse>(
        `/api/feedback/admin/responses?${params.toString()}`,
      );
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar respostas.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, district, search, includeTest, page]);

  useEffect(() => {
    load();
  }, [load]);

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

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const exportCsv = async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (campaignId) params.set("campaignId", campaignId);
      if (district) params.set("district", district);
      if (search.trim()) params.set("q", search.trim());
      if (includeTest) params.set("includeTest", "1");

      const response = await fetch(
        `/api/feedback/admin/export?${params.toString()}`,
        { headers: getAuthHeaders() },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Erro ao exportar CSV.");
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
            {campaigns
              .filter((campaign) => includeTest || campaign.channel !== "TEST")
              .map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
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

        <label className="flex-1 text-xs font-medium text-slate-600">
          Buscar escola
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Nome da escola"
            className="mt-1 block w-full min-w-[180px] rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex items-center gap-2 pb-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={includeTest}
            onChange={(event) => {
              setIncludeTest(event.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 accent-[#1d4ed8]"
          />
          Incluir testes
        </label>

        <button
          type="button"
          onClick={load}
          className="mb-0.5 inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="mb-0.5 inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Escola</th>
              <th className="px-4 py-2.5 font-medium">Distrito</th>
              <th className="px-4 py-2.5 font-medium">Enviado</th>
              <th className="px-4 py-2.5 font-medium">Respondido</th>
              <th className="px-4 py-2.5 font-medium">Responsável</th>
              <th className="px-4 py-2.5 font-medium">Campanha</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{row.School.name}</td>
                <td className="px-4 py-3 text-slate-600">{row.School.district || "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDateTime(row.Invite?.sentAt ?? null)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDateTime(row.submittedAt)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {row.respondentName}
                  <span className="block text-[11px] text-slate-400">
                    Mat. {row.respondentRegistration} · {row.respondentRole}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {row.Campaign.name}
                  {row.channel === "TEST" && (
                    <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                      TESTE
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openDetail(row.id)}
                    className="text-xs font-medium text-[#1d4ed8] hover:underline"
                  >
                    Ver respostas
                  </button>
                </td>
              </tr>
            ))}
            {data && data.rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                  Nenhuma resposta encontrada com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{data.total} resposta(s)</span>
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

      {(detail || detailLoading) && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="my-8 w-full max-w-3xl rounded-xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {detail ? detail.school.name : "Carregando..."}
                </h3>
                {detail && (
                  <p className="text-xs text-slate-500">
                    {detail.campaign.name} · respondido em {formatDateTime(detail.submittedAt)}
                    {detail.channel === "TEST" && " · TESTE"}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading && !detail && (
              <div className="p-6 text-sm text-slate-500">Carregando respostas...</div>
            )}

            {detail && (
              <div className="max-h-[70vh] overflow-y-auto p-5">
                <div className="rounded-lg bg-slate-50 p-4 text-sm">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Identificação do responsável
                  </h4>
                  <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-slate-500">Nome completo</dt>
                      <dd className="font-medium text-slate-800">{detail.respondent.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Matrícula funcional</dt>
                      <dd className="font-medium text-slate-800">
                        {detail.respondent.registration}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Função/cargo</dt>
                      <dd className="font-medium text-slate-800">{detail.respondent.role}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">E-mail do convite</dt>
                      <dd className="text-slate-700">{detail.recipientEmail || "—"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-4 space-y-3">
                  {FEEDBACK_QUESTIONNAIRE.questions.map((question) => {
                    const answer = detail.answers.find(
                      (entry) => entry.questionKey === question.key,
                    );
                    return (
                      <div key={question.key} className="rounded-lg border border-slate-200 p-3">
                        <p className="text-sm font-medium text-slate-800">
                          {question.number}. {question.title}
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600">
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
