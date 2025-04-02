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
}

interface SchoolPageProps {
  school: School | null;
}

const SchoolPage: React.FC<SchoolPageProps> = ({ school }) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [newPhoto, setNewPhoto] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>(school?.photos || []);

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
      <div className={styles.info}>
        <h1 className="text-2xl font-bold mb-4 mt-4 text-center">{school.name}</h1>
        <p><strong>INEP:</strong> {school.inep}</p>
        <p><strong>Distrito:</strong> {school.district}</p>
        <p><strong>Endereço:</strong> {school.address}</p>
        <p><strong>Diretor:</strong> {school.director}</p>
        <p><strong>Telefone:</strong> {school.phone}</p>
        <p><strong>Email:</strong> {school.email}</p>
        <button onClick={openModal} className="bg-blue-500 text-white px-4 py-2 rounded mt-4">Adicionar Foto</button>
        <Link href="/schools" legacyBehavior>
          <a className="text-blue-500 hover:underline">Voltar para a lista de escolas</a>
        </Link>
      </div>
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal} contentLabel="Adicionar Foto">
        <h2>Adicionar Nova Foto</h2>
        <input
          type="text"
          value={newPhoto}
          onChange={(e) => setNewPhoto(e.target.value)}
          placeholder="URL da nova foto"
          className="border p-2 w-full"
        />
        <button onClick={handleAddPhoto} className="bg-green-500 text-white px-4 py-2 rounded mt-4">Adicionar</button>
        <button onClick={closeModal} className="bg-red-500 text-white px-4 py-2 rounded mt-4 ml-2">Cancelar</button>
      </Modal>
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