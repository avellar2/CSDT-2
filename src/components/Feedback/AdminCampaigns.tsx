import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  StopCircle,
  Users,
} from "lucide-react";
import {
  CAMPAIGN_STATUS_LABELS,
  INVITE_STATUS_LABELS,
  feedbackApi,
  formatDateTime,
} from "./api";
import { EmailPreviewModal, type EmailPreviewContent } from "./EmailPreviewModal";

interface CampaignSummary {
  id: number;
  name: string;
  status: string;
  channel: string;
  subject: string;
  deadline: string | null;
  createdAt: string;
  sentAt: string | null;
  preparedAt: string | null;
  authorizedAt: string | null;
  totalInvites: number;
  invitesSent: number;
  invitesFailed: number;
  invitesPending: number;
  jobsPending: number;
  jobsTemporaryFailure: number;
  jobsPermanentFailure: number;
  responses: number;
}

interface CampaignDetail {
  campaign: {
    id: number;
    name: string;
    status: string;
    channel: string;
    subject: string;
    introText: string | null;
    deadline: string | null;
    questionnaireVersion: { version: string; questionCount: number; title: string };
  };
  counts: {
    invitesTotal: number;
    invitesByStatus: Record<string, number>;
    jobsByStatus: Record<string, number>;
    responses: number;
  };
  invites?: {
    total: number;
    rows: Array<{
      id: number;
      schoolId: number;
      recipientEmail: string;
      status: string;
      attempts: number;
      sendCount: number;
      lastError: string | null;
      sentAt: string | null;
      answeredAt: string | null;
      School: { name: string; district: string | null };
    }>;
  };
}

interface PreviewResponse {
  summary: {
    totalSchools: number;
    schoolUnits: number;
    eligibleSchools: number;
    missingEmail: number;
    invalidEmail: number;
    adminSectors: number;
    reviewUnits: number;
    excludedRecords: number;
    duplicateEmails: number;
    totalInvites: number;
    totalMessages: number;
    savedMessages: number;
  };
  plan: {
    includedSchools: Array<{
      id: number;
      name: string;
      district: string | null;
      email: string | null;
      sharedEmail: boolean;
    }>;
    excludedSchools: Array<{
      id: number;
      name: string;
      email: string | null;
      district: string | null;
      type: "SCHOOL" | "ADMIN_SECTOR" | "REVIEW";
      reason: string;
      emailIssue: "MISSING" | "INVALID" | null;
    }>;
    duplicateGroups: Array<{ email: string; schools: string[] }>;
    totalMessages: number;
  };
  preview: EmailPreviewContent;
  alreadyPrepared: boolean;
  previewSchool: string | null;
}

const CONFIRMATION_PHRASE = "ENVIAR PESQUISA ÀS ESCOLAS";

export function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newIntro, setNewIntro] = useState("");
  const [newDeadline, setNewDeadline] = useState("");

  const [confirmText, setConfirmText] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await feedbackApi<{ campaigns: CampaignSummary[] }>(
        "/api/feedback/admin/campaigns",
      );
      setCampaigns(response.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar campanhas.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (campaignId: number) => {
    try {
      const response = await feedbackApi<CampaignDetail>(
        `/api/feedback/admin/campaigns/${campaignId}?invites=1`,
      );
      setDetail(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar campanha.");
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
      setPreviewData(null);
      setConfirmText("");
      setConfirmChecked(false);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("create");
    setError(null);
    setNotice(null);
    try {
      const response = await feedbackApi<{ campaign: { id: number } }>(
        "/api/feedback/admin/campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            name: newName,
            subject: newSubject || undefined,
            introText: newIntro || undefined,
            deadline: newDeadline || null,
          }),
        },
      );
      setNotice("Campanha criada como rascunho. Nenhum e-mail foi enviado.");
      setShowCreate(false);
      setNewName("");
      setNewSubject("");
      setNewIntro("");
      setNewDeadline("");
      await loadCampaigns();
      setSelectedId(response.campaign.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar campanha.");
    } finally {
      setBusy(null);
    }
  };

  const loadPreview = async () => {
    if (!selectedId) return;
    setBusy("preview");
    setError(null);
    try {
      const response = await feedbackApi<PreviewResponse>(
        `/api/feedback/admin/campaigns/${selectedId}/preview`,
      );
      setPreviewData(response);
      setPreviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar pré-visualização.");
    } finally {
      setBusy(null);
    }
  };

  const prepare = async () => {
    if (!selectedId) return;
    setBusy("prepare");
    setError(null);
    setNotice(null);
    try {
      const response = await feedbackApi<{ invites: number; messages?: number; alreadyPrepared: boolean }>(
        `/api/feedback/admin/campaigns/${selectedId}/prepare`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setNotice(
        response.alreadyPrepared
          ? "Os convites desta campanha já estavam preparados."
          : `Convites preparados: ${response.invites} escolas em ${response.messages ?? "?"} mensagens. Nada foi enviado.`,
      );
      await loadCampaigns();
      await loadDetail(selectedId);
      const preview = await feedbackApi<PreviewResponse>(
        `/api/feedback/admin/campaigns/${selectedId}/preview`,
      );
      setPreviewData(preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao preparar convites.");
    } finally {
      setBusy(null);
    }
  };

  const authorizeSend = async () => {
    if (!selectedId || !previewData) return;
    setBusy("send");
    setError(null);
    setNotice(null);
    try {
      const result = await feedbackApi<{ queued: number; total: number; message: string }>(
        `/api/feedback/admin/campaigns/${selectedId}/send`,
        {
          method: "POST",
          body: JSON.stringify({
            confirm: true,
            confirmationText: CONFIRMATION_PHRASE,
            expectedMessages: previewData.summary.totalMessages,
          }),
        },
      );
      setNotice(result.message);
      setConfirmText("");
      setConfirmChecked(false);
      await loadCampaigns();
      await loadDetail(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autorizar envio.");
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = async (action: "PAUSE" | "RESUME" | "CLOSE") => {
    if (!selectedId) return;
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      await feedbackApi(`/api/feedback/admin/campaigns/${selectedId}/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setNotice(
        action === "PAUSE"
          ? "Campanha pausada. Novos envios ficam suspensos."
          : action === "RESUME"
            ? "Campanha retomada."
            : "Campanha encerrada. Novas respostas foram bloqueadas.",
      );
      await loadCampaigns();
      await loadDetail(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar a campanha.");
    } finally {
      setBusy(null);
    }
  };

  const processQueue = async () => {
    setBusy("queue");
    setError(null);
    setNotice(null);
    try {
      const result = await feedbackApi<{
        processed: number;
        sent: number;
        failedTemporary: number;
        failedPermanent: number;
        skipped: number;
      }>("/api/feedback/admin/queue?limit=10", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotice(
        `Lote processado: ${result.processed} job(s), ${result.sent} enviado(s), ${result.failedTemporary} falha(s) temporária(s), ${result.failedPermanent} falha(s) definitiva(s), ${result.skipped} ignorado(s).`,
      );
      await loadCampaigns();
      if (selectedId) await loadDetail(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar fila.");
    } finally {
      setBusy(null);
    }
  };

  const selectedSummary = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedId) ?? null,
    [campaigns, selectedId],
  );

  const totalJobs = detail
    ? Object.values(detail.counts.jobsByStatus).reduce((acc, value) => acc + value, 0)
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Campanhas</h2>
          <p className="text-xs text-slate-500">
            Criar, preparar e autorizar o envio. Preparar nunca envia.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadCampaigns}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1d4ed8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a45c0]"
          >
            <Plus className="h-3.5 w-3.5" /> Nova campanha
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={createCampaign}
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <h3 className="text-sm font-semibold text-slate-800">Nova campanha</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              Nome da campanha *
              <input
                required
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                maxLength={160}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Pesquisa de Feedback 2026"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Prazo (opcional)
              <input
                type="date"
                value={newDeadline}
                onChange={(event) => setNewDeadline(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-slate-600 md:col-span-2">
              Assunto do e-mail
              <input
                value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)}
                maxLength={300}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="CSDT | Pesquisa de Feedback — Sua opinião é importante"
              />
            </label>
            <label className="text-xs font-medium text-slate-600 md:col-span-2">
              Texto de abertura
              <textarea
                value={newIntro}
                onChange={(event) => setNewIntro(event.target.value)}
                rows={3}
                maxLength={2000}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="O Centro de Suporte e Desenvolvimento Tecnológico (CSDT), da Secretaria Municipal de Educação, convida sua unidade escolar a participar de nossa Pesquisa de Feedback."
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy === "create"}
              className="rounded-md bg-[#1d4ed8] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {busy === "create" ? "Criando..." : "Criar rascunho"}
            </button>
          </div>
          <p className="mt-2 text-right text-[11px] text-slate-400">
            Criar uma campanha não envia nenhum e-mail.
          </p>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Campanha</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Convites</th>
              <th className="px-4 py-2.5 text-right font-medium">Enviados</th>
              <th className="px-4 py-2.5 text-right font-medium">Respostas</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.map((campaign) => (
              <tr
                key={campaign.id}
                className={selectedId === campaign.id ? "bg-blue-50/50" : "hover:bg-slate-50"}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{campaign.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {campaign.channel === "TEST" ? "Teste" : "Oficial"} ·{" "}
                    {formatDateTime(campaign.createdAt)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={campaign.status} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{campaign.totalInvites}</td>
                <td className="px-4 py-3 text-right tabular-nums">{campaign.invitesSent}</td>
                <td className="px-4 py-3 text-right tabular-nums">{campaign.responses}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedId(selectedId === campaign.id ? null : campaign.id)
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1d4ed8] hover:underline"
                  >
                    {selectedId === campaign.id ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                  Nenhuma campanha criada. Use &quot;Nova campanha&quot; para começar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedSummary && detail && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800">{detail.campaign.name}</h3>
              <p className="text-xs text-slate-500">
                Questionário {detail.campaign.questionnaireVersion.version} ·{" "}
                {detail.campaign.questionnaireVersion.questionCount} perguntas
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadPreview}
                disabled={busy === "preview"}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-3.5 w-3.5" /> Ver e-mail
              </button>
              <button
                type="button"
                onClick={prepare}
                disabled={busy === "prepare" || detail.campaign.channel === "TEST"}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Users className="h-3.5 w-3.5" /> Preparar convites
              </button>
              <button
                type="button"
                onClick={processQueue}
                disabled={busy === "queue"}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busy === "queue" ? "animate-spin" : ""}`} />
                Processar lote
              </button>
              {detail.campaign.status === "SENDING" && (
                <button
                  type="button"
                  onClick={() => changeStatus("PAUSE")}
                  disabled={busy === "PAUSE"}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
                >
                  <Pause className="h-3.5 w-3.5" /> Pausar
                </button>
              )}
              {detail.campaign.status === "PAUSED" && (
                <button
                  type="button"
                  onClick={() => changeStatus("RESUME")}
                  disabled={busy === "RESUME"}
                  className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
                >
                  <Play className="h-3.5 w-3.5" /> Retomar
                </button>
              )}
              {!["CLOSED", "SENT"].includes(detail.campaign.status) && (
                <button
                  type="button"
                  onClick={() => changeStatus("CLOSE")}
                  disabled={busy === "CLOSE"}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600"
                >
                  <StopCircle className="h-3.5 w-3.5" /> Encerrar
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat label="Convites gerados" value={detail.counts.invitesTotal} />
            <MiniStat
              label="Enviados"
              value={
                (detail.counts.invitesByStatus.SENT ?? 0) +
                (detail.counts.invitesByStatus.ANSWERED ?? 0)
              }
            />
            <MiniStat
              label="Falhas"
              value={detail.counts.invitesByStatus.FAILED ?? 0}
              tone={(detail.counts.invitesByStatus.FAILED ?? 0) > 0 ? "danger" : "default"}
            />
            <MiniStat label="Respostas" value={detail.counts.responses} tone="success" />
          </div>

          <div className="grid gap-3 text-xs sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="mb-1 font-semibold text-slate-700">Fila de envio</p>
              {Object.entries(detail.counts.jobsByStatus).length === 0 ? (
                <p className="text-slate-500">Nenhum job criado ainda.</p>
              ) : (
                <ul className="space-y-0.5 text-slate-600">
                  {Object.entries(detail.counts.jobsByStatus).map(([status, count]) => (
                    <li key={status} className="flex justify-between">
                      <span>{statusLabel(status)}</span>
                      <span className="tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="mb-1 font-semibold text-slate-700">Convites por situação</p>
              {Object.entries(detail.counts.invitesByStatus).length === 0 ? (
                <p className="text-slate-500">Nenhum convite criado ainda.</p>
              ) : (
                <ul className="space-y-0.5 text-slate-600">
                  {Object.entries(detail.counts.invitesByStatus).map(([status, count]) => (
                    <li key={status} className="flex justify-between">
                      <span>{INVITE_STATUS_LABELS[status] ?? status}</span>
                      <span className="tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Confirmação de envio */}
          {detail.campaign.channel === "OFFICIAL" &&
            ["READY", "PAUSED"].includes(detail.campaign.status) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <ShieldAlert className="h-4 w-4" /> Autorização de envio geral
                </h4>
                {!previewData ? (
                  <p className="mt-1 text-xs text-amber-900">
                    Abra a pré-visualização para revisar os destinatários e o e-mail antes
                    de liberar o envio.
                  </p>
                ) : (
                  <>
                    <ul className="mt-2 grid gap-1 text-xs text-amber-900 sm:grid-cols-2">
                      <li>Unidades escolares: {previewData.summary.schoolUnits}</li>
                      <li>Com e-mail válido: {previewData.summary.eligibleSchools}</li>
                      <li>Mensagens previstas: {previewData.summary.totalMessages}</li>
                      <li>Setores administrativos excluídos: {previewData.summary.adminSectors}</li>
                      <li>Cadastros em revisão: {previewData.summary.reviewUnits}</li>
                      <li>E-mails inválidos: {previewData.summary.invalidEmail}</li>
                      <li>Sem e-mail: {previewData.summary.missingEmail}</li>
                      <li>Endereços compartilhados: {previewData.summary.duplicateEmails}</li>
                    </ul>

                    <details className="mt-3 rounded-md border border-amber-200 bg-white/60 p-2">
                      <summary className="cursor-pointer text-xs font-semibold text-amber-900">
                        Ver escolas incluídas ({previewData.plan.includedSchools.length})
                      </summary>
                      <ul className="mt-2 grid max-h-40 gap-0.5 overflow-auto text-[11px] text-slate-700 sm:grid-cols-2">
                        {previewData.plan.includedSchools.map((school) => (
                          <li key={school.id}>
                            {school.name}
                            {school.sharedEmail && (
                              <span className="ml-1 rounded bg-slate-100 px-1 text-[9px] text-slate-500">
                                e-mail compartilhado
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>

                    <details className="mt-2 rounded-md border border-amber-200 bg-white/60 p-2">
                      <summary className="cursor-pointer text-xs font-semibold text-amber-900">
                        Ver registros excluídos e motivos ({previewData.plan.excludedSchools.length})
                      </summary>
                      <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-[11px] text-slate-700">
                        {previewData.plan.excludedSchools.map((school) => (
                          <li key={`${school.id}-${school.type}`}>
                            <span className="font-medium">{school.name}</span>
                            <span className="text-slate-500"> — {school.reason}</span>
                          </li>
                        ))}
                      </ul>
                    </details>

                    <label className="mt-3 flex items-start gap-2 text-xs text-amber-900">
                      <input
                        type="checkbox"
                        checked={confirmChecked}
                        onChange={(event) => setConfirmChecked(event.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#1d4ed8]"
                      />
                      Confirmo que revisei os destinatários e o conteúdo do e-mail.
                    </label>
                    <label className="mt-2 block text-xs font-medium text-amber-900">
                      Digite exatamente <code className="rounded bg-amber-100 px-1">{CONFIRMATION_PHRASE}</code>
                      <input
                        value={confirmText}
                        onChange={(event) => setConfirmText(event.target.value)}
                        className="mt-1 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm"
                        placeholder={CONFIRMATION_PHRASE}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={authorizeSend}
                      disabled={
                        busy === "send" ||
                        !confirmChecked ||
                        confirmText !== CONFIRMATION_PHRASE ||
                        previewData.summary.totalMessages !== totalJobs
                      }
                      className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#1d4ed8] px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" /> ENVIAR PESQUISA ÀS ESCOLAS
                    </button>
                    <p className="mt-2 text-[11px] text-amber-800">
                      O envio ocorre em lotes pela fila. Se o worker estiver desabilitado,
                      nada será enviado até habilitar <code>FEEDBACK_QUEUE_WORKER_ENABLED=true</code>.
                    </p>
                  </>
                )}
              </div>
            )}

          {detail.invites && detail.invites.rows.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-800">
                Convites ({detail.invites.total})
              </h4>
              <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Escola</th>
                      <th className="px-3 py-2 font-medium">E-mail</th>
                      <th className="px-3 py-2 font-medium">Situação</th>
                      <th className="px-3 py-2 font-medium">Enviado</th>
                      <th className="px-3 py-2 font-medium">Respondido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.invites.rows.map((invite) => (
                      <tr key={invite.id}>
                        <td className="px-3 py-2 text-slate-800">{invite.School.name}</td>
                        <td className="px-3 py-2 text-slate-500">{invite.recipientEmail}</td>
                        <td className="px-3 py-2">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                            {INVITE_STATUS_LABELS[invite.status] ?? invite.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {formatDateTime(invite.sentAt)}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {formatDateTime(invite.answeredAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {previewOpen && previewData && (
        <EmailPreviewModal
          preview={previewData.preview}
          onClose={() => setPreviewOpen(false)}
          title={`Pré-visualização — ${previewData.previewSchool ?? "exemplo"}`}
        />
      )}

      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <FileText className="mt-0.5 h-4 w-4 flex-none text-slate-400" />
        <p>
          O PDF da pesquisa serve apenas como referência do formulário digital. O convite
          leva à página pública, onde a escola responde sem login. Nenhum anexo é enviado.
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "SENT"
      ? "bg-emerald-100 text-emerald-800"
      : status === "SENDING"
        ? "bg-blue-100 text-blue-800"
        : status === "PAUSED"
          ? "bg-amber-100 text-amber-800"
          : status === "CLOSED"
            ? "bg-slate-200 text-slate-700"
            : status === "READY"
              ? "bg-indigo-100 text-indigo-800"
              : "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {CAMPAIGN_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p
        className={`text-lg font-semibold tabular-nums ${
          tone === "success"
            ? "text-emerald-700"
            : tone === "danger"
              ? "text-red-600"
              : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    PROCESSING: "Processando",
    SENT: "Aceito pelo SMTP",
    FAILED_TEMPORARY: "Falha temporária",
    FAILED_PERMANENT: "Falha definitiva",
    CANCELLED: "Cancelado",
  };
  return labels[status] ?? status;
}
