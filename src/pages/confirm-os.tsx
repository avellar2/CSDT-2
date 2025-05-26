import { useRouter } from "next/router";
import { useState } from "react";

export default function ConfirmOS() {
  const router = useRouter();
  const { id, token } = router.query;
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/confirm-os", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, token, nome, cpf }),
    });
    if (res.ok) {
      setMessage("OS confirmada com sucesso!");
    } else {
      setMessage("Erro ao confirmar OS. Verifique os dados ou tente novamente.");
    }
    setShowModal(true);
    setLoading(false);
  };

  const closeModal = () => {
    setShowModal(false);
    if (message.includes("sucesso")) {
      window.location.href = "https://www.google.com";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-zinc-700">Confirmação da OS</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-zinc-600">Nome</label>
            <input
              className="w-full border rounded p-2"
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-zinc-600">CPF ou Matrícula</label>
            <input
              className="w-full border rounded p-2"
              type="text"
              value={cpf}
              onChange={e => setCpf(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
            disabled={loading}
          >
            {loading ? "Confirmando..." : "Confirmar OS"}
          </button>
        </form>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center animate-fade-in">
            <div className="mb-4">
              {message.includes("sucesso") ? (
                <svg className="mx-auto mb-2 w-12 h-12 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="mx-auto mb-2 w-12 h-12 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <h2 className={`text-xl font-bold ${message.includes("sucesso") ? "text-green-600" : "text-red-600"}`}>
                {message.includes("sucesso") ? "Sucesso!" : "Erro"}
              </h2>
              <p className="mt-2 text-zinc-700">{message}</p>
            </div>
            <button
              onClick={closeModal}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}