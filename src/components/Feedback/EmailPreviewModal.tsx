import { useState } from "react";
import { X } from "lucide-react";

export interface EmailPreviewContent {
  subject: string;
  html: string;
  text: string;
}

export function EmailPreviewModal({
  preview,
  onClose,
  title = "Pré-visualização do e-mail",
}: {
  preview: EmailPreviewContent;
  onClose: () => void;
  title?: string;
}) {
  const [tab, setTab] = useState<"html" | "text" | "source">("html");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-4xl rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Assunto: <span className="font-medium text-slate-700">{preview.subject}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Fechar pré-visualização"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-200 px-5 pt-3">
          {(
            [
              ["html", "Visual HTML"],
              ["text", "Texto simples"],
              ["source", "Código HTML"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-t-md px-3 py-2 text-sm font-medium ${
                tab === key
                  ? "border-b-2 border-[#1d4ed8] text-[#1d4ed8]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "html" && (
            <iframe
              title="Pré-visualização HTML do e-mail"
              srcDoc={preview.html}
              sandbox=""
              className="h-[600px] w-full rounded-lg border border-slate-200 bg-white"
            />
          )}
          {tab === "text" && (
            <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              {preview.text}
            </pre>
          )}
          {tab === "source" && (
            <pre className="max-h-[600px] overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
              {preview.html}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
