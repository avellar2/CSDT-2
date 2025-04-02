import React, { useEffect, useState } from "react";

const ItemList: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolItemCount, setSchoolItemCount] = useState(0);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/items');
        const data = await response.json();
        setItems(data);
      } catch (error) {
        console.error('Error fetching items:', error);
      }
    };

    fetchItems();
  }, []);

  useEffect(() => {
    const countItemsInSchool = () => {
      const count = items.filter((item) =>
        item.school.toLowerCase().includes(searchTerm.toLowerCase())
      ).length;
      setSchoolItemCount(count);
    };

    countItemsInSchool();
  }, [searchTerm, items]);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.school.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-800 p-6 rounded shadow-md w-full">
      <h2 className="text-2xl mb-4 text-white">Lista de Itens</h2>
      <input
        type="text"
        placeholder="Pesquisar"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded mt-1 mb-4 focus:border-blue-500 focus:outline-none"
      />
      {searchTerm && (
        <p className="text-white mb-4">
          Quantidade de itens na escola "{searchTerm}": {schoolItemCount}
        </p>
      )}
      <ul>
        {filteredItems.map((item) => (
          <li key={item.id} className="mb-2 bg-white p-6">
            <div className="gap-1 grid grid-cols-1">
              <div className="bg-gray-800 p-2">
                <strong className="text-gray-200">Nome:</strong> {item.name} <br />
              </div>
              <div className="bg-gray-800 p-2">
                <strong className="text-gray-200">Marca:</strong> {item.brand} <br />
              </div>
              <div className="bg-gray-800 p-2">
                <strong className="text-gray-200">Número de Série:</strong> {item.serialNumber} <br />
              </div>
              <div className="bg-gray-800 p-2">
                <strong className="text-gray-200">Escola:</strong> {item.school} <br />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ItemList;