import React, { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import Modal from 'react-modal';
import styles from './SchoolPage.module.css'; // Importar o arquivo CSS

const prisma = new PrismaClient();

interface School {
  id: number;
  name: string;
  inep: number;
  district: string;
  address: string;
  director: string;
  phone: string;
  email: string;
  photos: string[]; // Adicione um array de URLs de fotos
  items: {
    id: number;
    name: string;
    brand: string;
    quantity: number;
    serialNumber?: string; // Adicione o campo serial
    createdAt: string; // Adicione o campo serializado
    updatedAt: string; // Adicione o campo serializado
  }[]; // Adicione os itens relacionados à escola
}

interface SchoolPageProps {
  school: School | null;
}

const SchoolPage: React.FC<SchoolPageProps> = ({ school }) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [newPhoto, setNewPhoto] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>(school?.photos || []);
  const [items, setItems] = useState<School['items']>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        if (school?.id) {
          const response = await fetch(`/api/schools/${school.id}/items`);
          if (!response.ok) {
            throw new Error(`Erro ao buscar itens: ${response.statusText}`);
          }
          const data = await response.json();
          console.log('Dados recebidos do endpoint:', data); // Adicione este log
          setItems(data);
        }
      } catch (error) {
        console.error('Erro ao buscar itens:', error);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, [school?.id]);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const handleAddPhoto = () => {
    if (newPhoto) {
      setPhotos([...photos, newPhoto]);
      setNewPhoto('');
      closeModal();
    }
  };

  if (!school) {
    return <div>Escola não encontrada</div>;
  }

  return (
    <div className={styles.container}>
      {photos.length > 0 ? (
        <div className={styles.mosaic}>
          {photos.map((photo, index) => (
            <div key={index} className={styles.mosaicItem}>
              <img src={photo} alt={`Foto ${index + 1}`} className={styles.mosaicImage} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center">Nenhuma foto disponível</p>
      )}

      {/* Card fixo com informações da escola */}
      <div
        className="fixed bottom-4 right-4 bg-white shadow-lg p-6 rounded-lg z-50 border border-gray-800"
        style={{
          background: "rgba(0, 0, 0, 0.5)",
          color: "white",
          padding: "20px",
          borderRadius: "10px",
        }}
      >
        <h1 className="text-2xl font-bold mb-4 text-center">{school.name}</h1>
        <p><strong>INEP:</strong> {school.inep}</p>
        <p><strong>Distrito:</strong> {school.district}</p>
        <p><strong>Endereço:</strong> {school.address}</p>
        <p><strong>Diretor:</strong> {school.director}</p>
        <p><strong>Telefone:</strong> {school.phone}</p>
        <p><strong>Email:</strong> {school.email}</p>
       
        <Link href="/schools" legacyBehavior>
          <a className="text-blue-300 hover:underline mt-4 block">Voltar para a lista de escolas</a>
        </Link>
      </div>

      {/* Resumo de itens cadastrados */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
          Resumo de itens cadastrados:
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Object.entries(
            items.reduce((acc, item) => {
              // Verifica se o item já existe no acumulador
              if (!acc[item.name]) {
                acc[item.name] = 0;
              }
              // Incrementa o contador para o item
              acc[item.name] += 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([name, quantity]) => (
            <div
              key={name}
              className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shadow-md rounded-lg p-4 border border-blue-300 dark:border-blue-700"
            >
              <h3 className="text-lg font-semibold">{name}</h3>
              <p className="text-sm">Quantidade: {quantity}</p>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
        Itens cadastrados na escola:
      </h2>
      {loadingItems ? (
        <p className="text-gray-600 dark:text-gray-400">Carregando itens...</p>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
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
                <strong>Criado em:</strong> {new Date(item.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Atualizado em:</strong> {new Date(item.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">Nenhum item cadastrado nesta escola.</p>
      )}
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!;
  const school = await prisma.school.findUnique({
    where: { id: Number(id) },
  });

  return {
    props: {
      school,
    },
  };
};

export default SchoolPage;