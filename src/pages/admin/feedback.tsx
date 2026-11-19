import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  MessageSquareText,
  Send,
  ShieldAlert,
  History,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getAuthHeaders } from "@/utils/client-auth";
import { AdminOverview } from "@/components/Feedback/AdminOverview";
import { AdminCampaigns } from "@/components/Feedback/AdminCampaigns";
import { AdminRecipients } from "@/components/Feedback/AdminRecipients";
import { AdminResponses } from "@/components/Feedback/AdminResponses";
import { AdminComments } from "@/components/Feedback/AdminComments";
import { AdminAudit } from "@/components/Feedback/AdminAudit";

const AdminStats = dynamic(
  () => import("@/components/Feedback/AdminStats").then((mod) => mod.AdminStats),
  { ssr: false, loading: () => <div className="py-10 text-sm text-slate-500">Carregando gráficos...</div> },
);

type Tab = "overview" | "campaigns" | "recipients" | "responses" | "stats" | "comments" | "audit";
type ResponsesChannel = "ALL" | "OFFICIAL" | "TEST";

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "Visão Geral", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "campaigns", label: "Campanhas", icon: <Send className="h-4 w-4" /> },
  { id: "recipients", label: "Destinatários", icon: <UserCheck className="h-4 w-4" /> },
  { id: "responses", label: "Respostas", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "stats", label: "Estatísticas", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "comments", label: "Comentários", icon: <MessageSquareText className="h-4 w-4" /> },
  { id: "audit", label: "Auditoria", icon: <History className="h-4 w-4" /> },
];

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");
  const [displayName, setDisplayName] = useState<string>("");
  const [tab, setTab] = useState<Tab>("overview");
  const [responsesChannel, setResponsesChannel] = useState<ResponsesChannel>("ALL");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (cancelled) return;

      if (error || !user) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`/api/get-role?userId=${encodeURIComponent(user.id)}`);
        const data = await response.json();
        if (cancelled) return;

        if (response.ok && data.role === "ADMTOTAL") {
          setDisplayName(data.displayName || "");
          setStatus("allowed");
          return;
        }

        setStatus("denied");
      } catch {
        if (!cancelled) setStatus("denied");
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Ao abrir a lista de respostas, marca como visualizadas para este operador.
  // Controla o badge de "respostas novas" exibido no Dashboard.
  useEffect(() => {
    if (status !== "allowed" || tab !== "responses") return;
    fetch("/api/feedback/admin/mark-viewed", {
      method: "POST",
      headers: getAuthHeaders(),
    }).catch(() => undefined);
  }, [status, tab]);

  if (status === "checking") {
    return (
      <>
        <div aria-hidden className="fixed inset-0 -z-10 bg-slate-50" />
        <div className="feedback-admin-surface flex min-h-[60vh] items-center justify-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando permissões...
        </div>
      </>
    );
  }

  if (status === "denied") {
    return (
      <>
        <div aria-hidden className="fixed inset-0 -z-10 bg-slate-50" />
        <div className="feedback-admin-surface flex min-h-[70vh] items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-[#0b2a5b]">Acesso restrito</h1>
            <p className="mt-2 text-sm text-slate-600">
              A Pesquisa de Feedback é exclusiva do perfil ADMTOTAL. Se você acredita que
              deveria ter acesso, procure a administração do sistema.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-lg bg-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a45c0]"
            >
              Voltar ao painel
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Pesquisa de Feedback — Administração | CSDT</title>
      </Head>

      {/* Fundo claro do módulo, inclusive quando o tema global está escuro. */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-slate-50" />

      <div className="feedback-admin-surface min-h-screen px-0 py-5 sm:py-6">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#0b2a5b] text-white">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1d4ed8]">
                  CSDT · Secretaria Municipal de Educação
                </p>
                <h1 className="mt-0.5 text-xl font-bold text-[#0b2a5b] sm:text-2xl">
                  Pesquisa de Feedback
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Painel administrativo exclusivo do perfil ADMTOTAL. Todas as ações são
                  auditadas.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              {displayName && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  Operador: {displayName}
                </span>
              )}
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-[#1d4ed8] hover:underline"
              >
                ← Voltar ao Dashboard
              </Link>
            </div>
          </div>
        </header>

        <nav
          aria-label="Seções da Pesquisa de Feedback"
          className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm"
        >
          <div className="flex min-w-max gap-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={tab === item.id ? "page" : undefined}
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:ring-offset-1 ${
                  tab === item.id
                    ? "bg-[#0b2a5b] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <main className="mt-5">
          {tab === "overview" && (
            <AdminOverview
              onOpenTestResponses={() => {
                setResponsesChannel("TEST");
                setTab("responses");
              }}
            />
          )}
          {tab === "campaigns" && <AdminCampaigns />}
          {tab === "recipients" && <AdminRecipients />}
          {tab === "responses" && <AdminResponses initialChannel={responsesChannel} />}
          {tab === "stats" && <AdminStats />}
          {tab === "comments" && <AdminComments />}
          {tab === "audit" && <AdminAudit />}
        </main>
      </div>
    </>
  );
}
