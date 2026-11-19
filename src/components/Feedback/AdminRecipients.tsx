import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { feedbackApi } from "./api";

interface AuditItem {
  id: number;
  name: string;
  district: string | null;
  email: string | null;
  inep: number;
  students: number;
  type: "SCHOOL" | "ADMIN_SECTOR" | "REVIEW";
  eligible: boolean;
  reason: string;
  source: string;
}

interface AuditResponse {
  summary: {
    total: number;
    schools: number;
    adminSectors: number;
    review: number;
    persisted: number;
  };
  recipients: {
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
  items: AuditItem[];
}

type TypeFilter = "" | AuditItem["type"];

export function AdminRecipients() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AuditItem | null>(null);
  const [overrideType, setOverrideType] = useState<AuditItem["type"]>("SCHOOL");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideBusy, setOverrideBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await feedbackApi<AuditResponse>(
        "/api/feedback/admin/schools-audit",
      );
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao auditar cadastros.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await feedbackApi<AuditResponse>(
        "/api/feedback/admin/schools-audit",
        { method: "POST", body: JSON.stringify({ persist: true }) },
      );
      setData(response);
      setNotice(
        `Classificação persistida para ${response.summary.persisted} registros. Nenhum cadastro foi alterado além dos campos de elegibilidade.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao persistir auditoria.");
    } finally {
      setSaving(false);
    }
  };

  const openOverride = (item: AuditItem) => {
    setEditing(item);
    setOverrideType(item.type);
    setOverrideReason(item.reason);
  };

  const submitOverride = async () => {
    if (!editing) return;
    setOverrideBusy(true);
    setError(null);
    try {
      await feedbackApi(
        `/api/feedback/admin/schools/${editing.id}/eligibility`,
        {
          method: "PATCH",
          body: JSON.stringify({
            eligible: overrideType === "SCHOOL",
            type: overrideType,
            reason: overrideReason,
          }),
        },
      );
      setEditing(null);
      setNotice(
        `Classificação de "${editing.name}" atualizada e registrada em auditoria.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reclassificar unidade.");
    } finally {
      setOverrideBusy(false);
    }
  };

  const items = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.items.filter((item) => {
      if (typeFilter && item.type !== typeFilter) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        (item.district ?? "").toLowerCase().includes(term) ||
        (item.email ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, typeFilter, search]);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-slate-500">
        <RefreshCw className="h-4 w-4 animate-spin" /> Auditando cadastros...
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Destinatários e elegibilidade
          </h2>
          <p className="text-xs text-slate-500">
            A tabela School inclui setores administrativos da SME. Somente unidades
            classificadas como escola recebem convite de campanha oficial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Recarregar
          </button>
          <button
            type="button"
            onClick={persist}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1d4ed8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a45c0] disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Persistindo..." : "Persistir classificação auditada"}
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Unidades escolares" value={data.summary.schools} tone="success" />
        <Card label="Setores administrativos" value={data.summary.adminSectors} tone="danger" />
        <Card label="Em revisão (excluídos)" value={data.summary.review} tone="warning" />
        <Card label="Convites válidos" value={data.recipients.totalInvites} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Mini label="E-mails válidos" value={data.recipients.eligibleSchools} />
        <Mini label="Sem e-mail" value={data.recipients.missingEmail} />
        <Mini label="E-mail inválido" value={data.recipients.invalidEmail} />
        <Mini label="Mensagens a enviar" value={data.recipients.totalMessages} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p>
          <strong>{data.recipients.eligibleSchools}</strong> unidades escolares com
          e-mail válido receberiam convite em{" "}
          <strong>{data.recipients.totalMessages}</strong> mensagens (economia de{" "}
          {data.recipients.savedMessages} por e-mail compartilhado).{" "}
          <strong>{data.summary.adminSectors}</strong> setores administrativos e{" "}
          <strong>{data.summary.review}</strong> cadastros em revisão ficam fora.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium text-slate-600">
          Classificação
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            <option value="SCHOOL">Unidade escolar</option>
            <option value="ADMIN_SECTOR">Setor administrativo</option>
            <option value="REVIEW">Revisão</option>
          </select>
        </label>
        <label className="flex-1 text-xs font-medium text-slate-600">
          Buscar
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, distrito ou e-mail"
              className="block w-full min-w-[200px] rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm"
            />
          </div>
        </label>
        <span className="pb-2 text-xs text-slate-500">{items.length} registro(s)</span>
      </div>

      <div className="max-h-[540px] overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5 font-medium">Unidade</th>
              <th className="px-3 py-2.5 font-medium">Distrito</th>
              <th className="px-3 py-2.5 font-medium">E-mail</th>
              <th className="px-3 py-2.5 font-medium">Classificação</th>
              <th className="px-3 py-2.5 font-medium">Motivo</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <p className="font-medium text-slate-800">{item.name}</p>
                  <p className="text-[10px] text-slate-600">
                    id {item.id} · INEP {item.inep} · matrículas {item.students}
                  </p>
                </td>
                <td className="px-3 py-2.5 text-slate-600">{item.district || "—"}</td>
                <td className="px-3 py-2.5 text-slate-600">
                  {item.email || "—"}
                </td>
                <td className="px-3 py-2.5">
                  <TypeBadge type={item.type} />
                  {item.source === "PERSISTED" && (
                    <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                      auditado
                    </span>
                  )}
                </td>
                <td className="max-w-xs px-3 py-2.5 text-xs text-slate-600">
                  {item.reason}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => openOverride(item)}
                    className="text-xs font-medium text-[#1d4ed8] hover:underline"
                  >
                    Reclassificar
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="my-16 w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Reclassificar unidade
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">{editing.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mt-4 block text-xs font-medium text-slate-600">
              Classificação
              <select
                value={overrideType}
                onChange={(event) =>
                  setOverrideType(event.target.value as AuditItem["type"])
                }
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="SCHOOL">Unidade escolar (elegível)</option>
                <option value="ADMIN_SECTOR">Setor administrativo (não envia)</option>
                <option value="REVIEW">Revisão (não envia)</option>
              </select>
            </label>

            <label className="mt-3 block text-xs font-medium text-slate-600">
              Motivo da decisão (obrigatório)
              <textarea
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                rows={3}
                maxLength={500}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Ex.: CEJA é unidade educacional, apesar de cadastrada em SEDE."
              />
            </label>

            <p className="mt-2 text-[11px] text-slate-500">
              A decisão é registrada na School e na auditoria, com seu usuário e data.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitOverride}
                disabled={overrideBusy || overrideReason.trim().length < 5}
                className="rounded-md bg-[#1d4ed8] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {overrideBusy ? "Salvando..." : "Salvar classificação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: AuditItem["type"] }) {
  if (type === "SCHOOL") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
        <CheckCircle2 className="h-3 w-3" /> Escola
      </span>
    );
  }
  if (type === "ADMIN_SECTOR") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">
        <ShieldCheck className="h-3 w-3" /> Setor SME
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
      <AlertTriangle className="h-3 w-3" /> Revisão
    </span>
  );
}

function Card({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const color =
    tone === "success"
      ? "text-emerald-700"
      : tone === "danger"
        ? "text-red-600"
        : tone === "warning"
          ? "text-amber-700"
          : "text-[#0b2a5b]";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-slate-800">{value}</p>
    </div>
  );
}
