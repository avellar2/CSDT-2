import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MagnifyingGlass } from 'phosphor-react';
import axios from 'axios';

interface School {
  id: number;
  name: string;
  inep: number;
  district: string;
  address: string;
  director: string;
  phone: string;
  email: string;
}

const districtColors: { [key: string]: string } = {
  '1': 'bg-blue-300',
  '2': 'bg-green-300',
  '3': 'bg-orange-300',
  '4': 'bg-purple-300',
  '5': 'bg-red-300',
  // Adicione mais distritos e cores conforme necessário
};

const getDistrictColor = (district: string) => {
  return districtColors[district] || 'bg-gray-400';
};

const SchoolsPage: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Função para buscar os dados das escolas do banco de dados
    const fetchSchools = async () => {
      try {
        const response = await axios.get('/api/schools');
        const data = await response.data;
        if (Array.isArray(data)) {
          setSchools(data);
        } else {
          setError('Unexpected response format');
        }
      } catch (error) {
        console.error('Error fetching schools:', error);
        setError('Error fetching schools');
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase())
  ); 

  console.log(schools);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Escolas</h1>
      <div className="relative mb-4">
        <MagnifyingGlass className="absolute left-3 top-2 text-gray-400" size={24} />
        <input
          type="text"
          placeholder="Pesquisar escolas..."
          className="w-full p-2 pl-10 border border-gray-300 bg-zinc-900 bg-  rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b-2 border-gray-200 bg-gray-100 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                Nome da Escola
              </th>
              <th className="py-2 px-4 border-b-2 border-gray-200 bg-gray-100 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                Distrito
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.isArray(filteredSchools) && filteredSchools.map((school) => (
              <tr key={school.id} className={`hover:bg-opacity-75 transition duration-300 text-black ${getDistrictColor(school.district)}`}>
                <td className="py-4 px-6">
                  <Link href={`/schools/${school.id}`} legacyBehavior>
                    <a className="text-zinc-900 font-bold hover:underline">
                      {school.name}
                    </a>
                  </Link>
                </td>
                <td className="py-4 px-6 text-gray-800 ">
                  {school.district || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SchoolsPage;