import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  FlaskConical,
  Mail,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";
import { feedbackApi, formatDateTime } from "./api";
import { EmailPreviewModal, type EmailPreviewContent } from "./EmailPreviewModal";

interface OverviewResponse {
  eligibility: {
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
  participation: {
    campaigns: number;
    campaignsSending: number;
    invitationsTotal: number;
    invitationsSent: number;
    invitationsFailed: number;
    responses: number;
    pendingResponses: number;
    unansweredSchools: number;
    participationPercent: number;
  };
  responseCounts: {
    official: number;
    test: number;
  };
  campaigns: unknown[];
  recentFailures: Array<{
    id: number;
    recipientEmail: string;
    lastError: string | null;
    updatedAt: string;
    School: { name: string };
    Campaign: { id: number; name: string };
  }>;
  recentAudit: Array<{
    id: number;
    action: string;
    actorUserId: string;
    actorName: string | null;
    actorRole: string;
    campaignId: number | null;
    createdAt: string;
  }>;
  system: {
    smtpConfigured: boolean;
    workerEnabled: boolean;
    testRecipient: string;
    institutionalContact?: string;
    officialBaseUrl?: string;
    officialBaseUrlValid?: { ok: boolean; reason?: string };
  };
}

interface TestEmailResult {
  recipient: string;
  cc?: string;
  url: string;
  accepted: string[];
  rejected: string[];
  primaryAccepted?: boolean;
  ccStatus?: "ACCEPTED" | "REJECTED" | "NOT_CONFIGURED";
  ccError?: string | null;
  messageId: string;
  smtpResponse: string;
  subject: string;
  html: string;
  text: string;
  note: string;
}

export function AdminOverview({
  onOpenTestResponses,
}: {
  onOpenTestResponses?: () => void;
} = {}) {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<TestEmailResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [preview, setPreview] = useState<EmailPreviewContent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await feedbackApi<OverviewResponse>("/api/feedback/admin/overview");
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar visão geral.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendTest = async () => {
    setSendingTest(true);
    setTestError(null);
    setTestResult(null);
    try {
      const result = await feedbackApi<TestEmailResult>(
        "/api/feedback/admin/test-email",
        { method: "POST", body: JSON.stringify({}) },
      );
      setTestResult(result);
      await load();
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Erro no envio de teste.");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-slate-500">
        <RefreshCw className="h-4 w-4 animate-spin" /> Carregando visão geral...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { eligibility, participation } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Escolas elegíveis"
          value={eligibility.eligibleSchools}
          hint={`${eligibility.schoolUnits} unidades escolares`}
        />
        <MetricCard
          icon={<Send className="h-4 w-4" />}
          label="Convites enviados"
          value={participation.invitationsSent}
          hint="aceitos pelo SMTP"
        />
        <MetricCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="Envios com falha"
          value={participation.invitationsFailed}
          tone={participation.invitationsFailed > 0 ? "danger" : "default"}
          hint="falhas definitivas"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Respostas oficiais"
          value={participation.responses}
          tone="success"
          hint="somente canal OFFICIAL"
        />
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          label="Pendências"
          value={participation.unansweredSchools}
          hint="convites sem resposta"
        />
        <MetricCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Participação"
          value={`${participation.participationPercent}%`}
          hint="respostas / convites"
        />
      </div>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <FlaskConical className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-900">Respostas de teste</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
              <strong className="tabular-nums">{data.responseCounts.test}</strong>{" "}
              resposta(s) de teste. Elas ficam separadas e não entram nos indicadores
              oficiais nem nas estatísticas.
            </p>
          </div>
        </div>
        {onOpenTestResponses && (
          <button
            type="button"
            onClick={onOpenTestResponses}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            Ver respostas de teste
          </button>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Users className="h-4 w-4 text-[#1d4ed8]" /> Auditoria dos destinatários
          </h3>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Unidades cadastradas" value={eligibility.totalSchools} />
            <Row label="Classificadas como escola" value={eligibility.schoolUnits} />
            <Row label="Com e-mail válido" value={eligibility.eligibleSchools} />
            <Row label="Sem e-mail" value={eligibility.missingEmail} tone="warning" />
            <Row label="E-mail inválido" value={eligibility.invalidEmail} tone="warning" />
            <Row
              label="Setores administrativos (SEDE/SME)"
              value={eligibility.adminSectors}
              tone="warning"
            />
            <Row label="Em revisão (não enviam)" value={eligibility.reviewUnits} />
            <Row label="E-mails compartilhados" value={eligibility.duplicateEmails} />
          </dl>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p>
              <strong>{eligibility.totalInvites}</strong> escolas receberiam convite em{" "}
              <strong>{eligibility.totalMessages}</strong> mensagens. O agrupamento
              evita <strong>{eligibility.savedMessages}</strong> e-mails duplicados para
              endereços compartilhados, mantendo um link exclusivo por unidade.
            </p>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Nenhum endereço é inventado. Escolas sem e-mail ou com endereço inválido
            ficam fora do envio.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Mail className="h-4 w-4 text-[#1d4ed8]" /> Configuração de envio
          </h3>
          <div className="mt-4 space-y-2 text-sm">
            <StatusLine
              ok={data.system.smtpConfigured}
              label={data.system.smtpConfigured ? "SMTP configurado" : "SMTP não configurado"}
            />
            <StatusLine
              ok={data.system.workerEnabled}
              label={
                data.system.workerEnabled
                  ? "Worker de envio habilitado"
                  : "Worker de envio desabilitado (FEEDBACK_QUEUE_WORKER_ENABLED)"
              }
              neutralWhenFalse
            />
            <StatusLine
              ok={participation.campaignsSending === 0}
              label={
                participation.campaignsSending === 0
                  ? "Nenhuma campanha enviando agora"
                  : `${participation.campaignsSending} campanha(s) em envio`
              }
              neutralWhenFalse
            />
            {data.system.officialBaseUrlValid && (
              <StatusLine
                ok={data.system.officialBaseUrlValid.ok}
                label={
                  data.system.officialBaseUrlValid.ok
                    ? `Links oficiais: ${data.system.officialBaseUrl}`
                    : `Links oficiais bloqueados: ${data.system.officialBaseUrlValid.reason ?? "URL inválida"}`
                }
                neutralWhenFalse={false}
              />
            )}
          </div>

          <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs">
            <Row
              label="CC institucional"
              value={data.system.institutionalContact ?? "csdt@smeduquedecaxias.rj.gov.br"}
            />
            <Row
              label="Reply-To"
              value={data.system.institutionalContact ?? "csdt@smeduquedecaxias.rj.gov.br"}
            />
          </dl>

          <p className="mt-3 text-xs text-slate-600">
            O SMTP atual é o configurado em <code>EMAIL_USER</code>/<code>EMAIL_PASS</code>.
            Limites e entregabilidade dependem do provedor. Não há garantia de que a
            mensagem caia na caixa de entrada.
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FlaskConical className="h-4 w-4 text-[#1d4ed8]" /> Envio de teste
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">
              Envia o template real para o único destinatário autorizado:{" "}
              <strong>{data.system.testRecipient}</strong>. Cada teste gera uma campanha
              isolada (canal TESTE) e não entra nas estatísticas oficiais.
            </p>
          </div>
          <button
            type="button"
            onClick={sendTest}
            disabled={sendingTest || !data.system.smtpConfigured}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a45c0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sendingTest ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            ENVIAR E-MAIL DE TESTE
          </button>
        </div>

        {testError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {testError}
          </div>
        )}

        {testResult && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              {testResult.accepted.length > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              Resultado do SMTP
            </p>
            <dl className="mt-3 space-y-1.5 text-xs">
              <Row label="Destinatário" value={testResult.recipient} />
              <Row label="CC institucional" value={testResult.cc ?? "csdt@smeduquedecaxias.rj.gov.br"} />
              <Row
                label="Status do CC"
                value={
                  testResult.ccStatus === "ACCEPTED"
                    ? "aceito pelo SMTP"
                    : testResult.ccStatus === "REJECTED"
                      ? `rejeitado${testResult.ccError ? ` — ${testResult.ccError}` : ""}`
                      : "não configurado"
                }
              />
              <Row label="Aceitos" value={testResult.accepted.join(", ") || "—"} />
              <Row label="Rejeitados" value={testResult.rejected.join(", ") || "—"} />
              <Row label="Message-ID" value={testResult.messageId || "—"} mono />
              <Row label="Resposta SMTP" value={testResult.smtpResponse || "—"} mono />
            </dl>
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {testResult.note}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={testResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Abrir link do formulário de teste
              </a>
              <button
                type="button"
                onClick={() =>
                  setPreview({
                    subject: testResult.subject,
                    html: testResult.html,
                    text: testResult.text,
                  })
                }
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Ver HTML e texto simples
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-800">Falhas recentes</h3>
          {data.recentFailures.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhuma falha registrada.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {data.recentFailures.map((failure) => (
                <li key={failure.id} className="py-2.5 text-xs">
                  <p className="font-medium text-slate-700">{failure.School.name}</p>
                  <p className="text-slate-500">{failure.recipientEmail}</p>
                  <p className="mt-0.5 text-red-600">{failure.lastError || "Erro não informado."}</p>
                  <p className="mt-0.5 text-slate-600">{formatDateTime(failure.updatedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-800">Ações administrativas recentes</h3>
          {data.recentAudit.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhuma ação registrada.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-xs">
              {data.recentAudit.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-700">{entry.action}</p>
                    <p className="text-slate-500">
                      {entry.actorName || entry.actorUserId} ({entry.actorRole})
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-slate-600">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {preview && (
        <EmailPreviewModal
          preview={preview}
          onClose={() => setPreview(null)}
          title="E-mail de teste"
        />
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "danger"
        ? "text-red-600"
        : "text-[#0b2a5b]";
  const iconTone =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "danger"
        ? "bg-red-50 text-red-600"
        : "bg-blue-50 text-[#1d4ed8]";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg ${iconTone}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  tone?: "warning";
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`max-w-[60%] break-words text-right ${
          tone === "warning" ? "font-medium text-amber-700" : "text-slate-800"
        } ${mono ? "font-mono text-[11px]" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusLine({
  ok,
  label,
  neutralWhenFalse,
}: {
  ok: boolean;
  label: string;
  neutralWhenFalse?: boolean;
}) {
  const color = ok
    ? "text-emerald-600"
    : neutralWhenFalse
      ? "text-slate-500"
      : "text-red-600";
  return (
    <p className={`flex items-center gap-2 ${color}`}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {label}
    </p>
  );
}
