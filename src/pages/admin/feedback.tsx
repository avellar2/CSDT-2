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
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando permissões...
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-4 text-lg font-semibold text-slate-800">Acesso restrito</h1>
        <p className="mt-2 text-sm text-slate-600">
          A Pesquisa de Feedback é exclusiva do perfil ADMTOTAL. Se você acredita que
          deveria ter acesso, procure a administração do sistema.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-[#1d4ed8] px-4 py-2 text-sm font-medium text-white"
        >
          Voltar ao painel
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Pesquisa de Feedback — Administração | CSDT</title>
      </Head>

      <div className="py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0b2a5b]">Pesquisa de Feedback — CSDT</h1>
            <p className="mt-1 text-sm text-slate-600">
              Área exclusiva do perfil ADMTOTAL. Todas as ações são auditadas.
            </p>
          </div>
          {displayName && (
            <p className="text-xs text-slate-500">Operador: {displayName}</p>
          )}
        </div>

        <nav className="mt-5 flex flex-wrap gap-1 border-b border-slate-200">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-t-md px-3 py-2.5 text-sm font-medium transition ${
                tab === item.id
                  ? "border-b-2 border-[#1d4ed8] text-[#1d4ed8]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-5">
          {tab === "overview" && <AdminOverview />}
          {tab === "campaigns" && <AdminCampaigns />}
          {tab === "recipients" && <AdminRecipients />}
          {tab === "responses" && <AdminResponses />}
          {tab === "stats" && <AdminStats />}
          {tab === "comments" && <AdminComments />}
          {tab === "audit" && <AdminAudit />}
        </div>
      </div>
    </>
  );
}
