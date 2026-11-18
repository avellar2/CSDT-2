import { useEffect, useState } from "react";
import { feedbackApi, formatDateTime } from "./api";

interface AuditEntry {
  id: number;
  campaignId: number | null;
  actorUserId: string;
  actorName: string | null;
  actorRole: string;
  action: string;
  inviteId: number | null;
  metadata: unknown;
  createdAt: string;
}

export function AdminAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feedbackApi<{ entries: AuditEntry[] }>("/api/feedback/admin/audit?pageSize=100")
      .then((response) => setEntries(response.entries))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Erro ao carregar auditoria."),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800">Auditoria</h2>
        <p className="text-xs text-slate-500">
          Registro das ações administrativas sobre campanhas, envios e exportações.
        </p>
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
              <th className="px-4 py-2.5 font-medium">Data</th>
              <th className="px-4 py-2.5 font-medium">Ação</th>
              <th className="px-4 py-2.5 font-medium">Operador</th>
              <th className="px-4 py-2.5 font-medium">Campanha</th>
              <th className="px-4 py-2.5 font-medium">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                  {formatDateTime(entry.createdAt)}
                </td>
                <td className="px-4 py-2.5 font-medium text-slate-800">{entry.action}</td>
                <td className="px-4 py-2.5 text-slate-600">
                  {entry.actorName || entry.actorUserId}
                  <span className="ml-1 text-[11px] text-slate-400">({entry.actorRole})</span>
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {entry.campaignId ?? "—"}
                </td>
                <td className="max-w-md px-4 py-2.5">
                  <code className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-slate-500">
                    {entry.metadata ? JSON.stringify(entry.metadata) : "—"}
                  </code>
                </td>
              </tr>
            ))}
            {entries.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  Nenhuma ação registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
