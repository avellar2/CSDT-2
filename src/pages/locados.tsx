import { useEffect, useState } from "react";

const LocadosPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchItems = async () => {
      const res = await fetch("/api/locados");
      const data = await res.json();
      console.log("Dados recebidos do endpoint:", data); // Log para verificar os dados recebidos
      setItems(data || []);
      setLoading(false);
    };
    fetchItems();
  }, []);

  // Filtra os itens conforme a pesquisa
  const filteredItems = items.filter((item) =>
    [item.name, item.brand, item.serialNumber, item.School?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Totalizadores por tipo (apenas dos itens filtrados)
  const totals = filteredItems.reduce((acc: Record<string, number>, item: any) => {
    const key = item.name?.toUpperCase().trim() || "OUTROS";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Itens Locados</h1>

      {/* Barra de pesquisa */}
      <div className="mb-6 flex justify-center">
        <input
          type="text"
          placeholder="Pesquisar por nome, marca, serial ou escola..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-xl px-4 py-2 rounded-lg border border-gray-300 shadow focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-800 dark:text-gray-100 dark:bg-gray-900 dark:border-gray-700"
        />
      </div>

      {/* Totalizadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Object.entries(totals).map(([tipo, total]) => (
          <div
            key={tipo}
            className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-md rounded-lg p-4 border border-blue-300 dark:border-blue-700"
          >
            <h3 className="text-lg font-semibold">{tipo}</h3>
            <p className="text-sm">Quantidade: {total}</p>
          </div>
        ))}
        <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 shadow-md rounded-lg p-4 border border-green-300 dark:border-green-700">
          <h3 className="text-lg font-semibold">Total</h3>
          <p className="text-sm">Quantidade: {filteredItems.length}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Carregando itens...</p>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                {item.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Marca:</strong> {item.brand}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Serial:</strong> {item.serialNumber || "Não informado"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Escola:</strong> {item.schoolId || "Não informado"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Criado em:</strong>{" "}
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString()
                  : "—"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Atualizado em:</strong>{" "}
                {item.updatedAt
                  ? new Date(item.updatedAt).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">
          Nenhum item locado encontrado.
        </p>
      )}
    </div>
  );
};

export default LocadosPage;