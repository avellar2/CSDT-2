import { useEffect, useState } from "react";
import Select from "react-select";

const LocadosPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedName, setSelectedName] = useState(""); // Para o select

  useEffect(() => {
    const fetchItems = async () => {
      const res = await fetch("/api/locados");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    fetchItems();
  }, []);

  // Pega os nomes únicos dos campos name
  const uniqueNames = Array.from(
    new Set(
      items
        .map((item) => item.name)
        .filter(Boolean)
    )
  );

  // Filtra os itens pelo nome selecionado
  const filteredItems = selectedName
    ? items.filter((item) => item.name === selectedName)
    : items;

  const options = uniqueNames.map((name) => ({
    value: name,
    label: name,
  }));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Itens Locados</h1>

      {/* Select de nomes */}
      <div className="mb-6 flex justify-center">
        <div className="w-full max-w-xl">
          <Select
            className="text-gray-800 dark:text-gray-700"
            options={[{ value: "", label: "Todas as escolas" }, ...options]}
            value={
              options.find((opt) => opt.value === selectedName) || { value: "", label: "Todas as escolas" }
            }
            onChange={(opt) => setSelectedName(opt?.value || "")}
            placeholder="Todas as escolas"
            isClearable
            classNamePrefix="react-select"
            styles={{
              control: (base) => ({
                ...base,
                backgroundColor: "var(--tw-bg-opacity,1) #222", // fundo escuro (opcional)
                color: "#fff",
              }),
              singleValue: (base) => ({
                ...base,
                color: "#fff", // cor do texto selecionado
              }),
              input: (base) => ({
                ...base,
                color: "#fff", // cor do texto digitado
              }),
              placeholder: (base) => ({
                ...base,
                color: "#bbb", // cor do placeholder (opcional)
              }),
            }}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Carregando itens...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-6">
          {filteredItems.length > 0 && (
            <>
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-md rounded-lg p-4 border border-blue-300 dark:border-blue-700 flex flex-col items-center">
                <span className="font-semibold text-lg mb-1">PCs</span>
                <span className="text-2xl font-bold">
                  {filteredItems.reduce((acc, item) => acc + (item.pcs ?? 0), 0)}
                </span>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-md rounded-lg p-4 border border-blue-300 dark:border-blue-700 flex flex-col items-center">
                <span className="font-semibold text-lg mb-1">Notebooks</span>
                <span className="text-2xl font-bold">
                  {filteredItems.reduce((acc, item) => acc + (item.notebooks ?? 0), 0)}
                </span>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-md rounded-lg p-4 border border-blue-300 dark:border-blue-700 flex flex-col items-center">
                <span className="font-semibold text-lg mb-1">Tablets</span>
                <span className="text-2xl font-bold">
                  {filteredItems.reduce((acc, item) => acc + (item.tablets ?? 0), 0)}
                </span>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-md rounded-lg p-4 border border-blue-300 dark:border-blue-700 flex flex-col items-center">
                <span className="font-semibold text-lg mb-1">Estabilizadores</span>
                <span className="text-2xl font-bold">
                  {filteredItems.reduce((acc, item) => acc + (item.estabilizadores ?? 0), 0)}
                </span>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-md rounded-lg p-4 border border-blue-300 dark:border-blue-700 flex flex-col items-center">
                <span className="font-semibold text-lg mb-1">Monitores</span>
                <span className="text-2xl font-bold">
                  {filteredItems.reduce((acc, item) => acc + (item.monitors ?? 0), 0)}
                </span>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-md rounded-lg p-4 border border-blue-300 dark:border-blue-700 flex flex-col items-center">
                <span className="font-semibold text-lg mb-1">Impressoras</span>
                <span className="text-2xl font-bold">
                  {filteredItems.reduce((acc, item) => acc + (item.impressoras ?? 0), 0)}
                </span>
              </div>
              {/* Card Total */}
              <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 shadow-md rounded-lg p-4 border border-green-300 dark:border-green-700 flex flex-col items-center">
                <span className="font-semibold text-lg mb-1">Total</span>
                <span className="text-2xl font-bold">
                  {filteredItems.reduce(
                    (acc, item) =>
                      acc +
                      (item.pcs ?? 0) +
                      (item.notebooks ?? 0) +
                      (item.tablets ?? 0) +
                      (item.estabilizadores ?? 0) +
                      (item.monitors ?? 0) +
                      (item.impressoras ?? 0),
                    0
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LocadosPage;