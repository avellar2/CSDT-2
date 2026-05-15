import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Plus, Check, X, AlertTriangle, Info } from "lucide-react";

interface FillPdfModalsProps {
  showToast: { message: string; type: "success" | "error" | "warning" | "info" } | null;
  alertDialog: { title: string; description: string; success: boolean } | null;
  setAlertDialog: (v: null) => void;
  showChamadoModal: boolean;
  setShowChamadoModal: (v: boolean) => void;
  chamadoData: { escola: string; titulo: string; descricao: string; categoria: string };
  setChamadoData: React.Dispatch<React.SetStateAction<{ escola: string; titulo: string; descricao: string; categoria: string }>>;
  criarChamadoManual: () => Promise<void>;
}

const FillPdfModals: React.FC<FillPdfModalsProps> = ({
  showToast,
  alertDialog,
  setAlertDialog,
  showChamadoModal,
  setShowChamadoModal,
  chamadoData,
  setChamadoData,
  criarChamadoManual,
}) => {
  return (
    <>
      {/* Toast Notifications */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: "-50%" }}
            animate={{ opacity: 1, y: 20, x: "-50%" }}
            exit={{ opacity: 0, y: -100, x: "-50%" }}
            className="fixed top-0 left-1/2 z-50 transform"
          >
            <div
              className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg backdrop-blur-sm border ${
                showToast.type === "success"
                  ? "bg-green-500/90 text-white border-green-400"
                  : showToast.type === "error"
                  ? "bg-red-500/90 text-white border-red-400"
                  : showToast.type === "warning"
                  ? "bg-yellow-500/90 text-white border-yellow-400"
                  : "bg-blue-500/90 text-white border-blue-400"
              }`}
            >
              {showToast.type === "success" && <Check size={20} />}
              {showToast.type === "error" && <X size={20} />}
              {showToast.type === "warning" && <AlertTriangle size={20} />}
              {showToast.type === "info" && <Info size={20} />}
              <span className="font-medium">{showToast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Alert Dialog */}
      {alertDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setAlertDialog(null)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`rounded-2xl p-8 max-w-md w-full shadow-2xl border ${
              alertDialog.success ? "bg-slate-800/95 border-green-400/30" : "bg-slate-800/95 border-red-400/30"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                  alertDialog.success ? "bg-green-500/20" : "bg-red-500/20"
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <CheckCircle size={40} className={alertDialog.success ? "text-green-400" : "text-red-400"} />
              </motion.div>
              <motion.h3
                className={`text-2xl font-bold mb-3 ${alertDialog.success ? "text-green-400" : "text-red-400"}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {alertDialog.title}
              </motion.h3>
              <motion.p
                className="text-slate-200 mb-8 text-lg leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {alertDialog.description}
              </motion.p>
              <motion.button
                onClick={() => setAlertDialog(null)}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                  alertDialog.success
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700"
                } text-white`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Continuar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de Chamados */}
      {showChamadoModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-slate-800/95 border border-blue-400/30 rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="text-center mb-6">
              <motion.div
                className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <Plus size={32} className="text-blue-400" />
              </motion.div>
              <h3 className="text-2xl font-bold text-blue-400 mb-2">Criar Novo Chamado?</h3>
              <p className="text-slate-300 text-sm">
                Você encontrou algum serviço adicional que precisa ser agendado para esta escola?
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Escola</label>
                <input
                  type="text"
                  value={chamadoData.escola}
                  disabled
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Título do Chamado *</label>
                <input
                  type="text"
                  value={chamadoData.titulo}
                  onChange={(e) => setChamadoData((prev) => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Instalação de impressora"
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Categoria *</label>
                <select
                  value={chamadoData.categoria}
                  onChange={(e) => setChamadoData((prev) => ({ ...prev, categoria: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Instalação">Instalação</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Configuração">Configuração</option>
                  <option value="Troca de Equipamento">Troca de Equipamento</option>
                  <option value="Problema de Rede">Problema de Rede</option>
                  <option value="Impressora">Impressora</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Descrição *</label>
                <textarea
                  value={chamadoData.descricao}
                  onChange={(e) => setChamadoData((prev) => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva o serviço que precisa ser agendado..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                onClick={() => setShowChamadoModal(false)}
                className="flex-1 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Não, obrigado
              </motion.button>
              <motion.button
                onClick={criarChamadoManual}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Criar Chamado
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

export default FillPdfModals;
