import React, { useEffect, useState } from "react";

interface Demand {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

const DailyDemands: React.FC = () => {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formata a data atual para exibição
  const today = new Date();
  const formattedDate = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const fetchDemands = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/daily-demands");

        if (!response.ok) {
          throw new Error("Erro ao buscar demandas do dia");
        }

        const result = await response.json();
        console.log("Demandas recebidas no frontend:", result); // Log das demandas recebidas
        setDemands(result.data || []); // Acessa o array de demandas dentro de `data`
      } catch (error) {
        console.error("Erro:", error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Erro desconhecido");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDemands();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-4xl text-center">
          <p>Carregando demandas de hoje...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-4xl text-center text-red-500">
          <h1 className="text-2xl font-bold mb-4">
            Demandas de {formattedDate}
          </h1>
          <p>Erro: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Demandas de {formattedDate}
        </h1>

        {demands.length > 0 ? (
          <ul className="space-y-4">
            {demands.map((demand) => (
              <li
                key={demand.id}
                className="p-4 bg-gray-100 rounded-lg shadow-sm text-gray-800"
              >
                <h2 className="font-bold">{demand.title}</h2>
                <p className="mt-2 whitespace-pre-line">{demand.description}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(demand.createdAt).toLocaleTimeString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center">
            Nenhuma demanda registrada hoje.
          </p>
        )}
      </div>
    </div>
  );
};

export default DailyDemands;
