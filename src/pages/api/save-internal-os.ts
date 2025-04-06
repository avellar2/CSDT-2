import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const { setor, tecnico, problema, descricao } = req.body;

      // Validação básica dos dados recebidos
      if (!setor || !tecnico || !problema || !descricao) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios." });
      }

      // Criação do registro no banco de dados
      const newInternalOS = await prisma.internalOS.create({
        data: {
          setorId: String(setor.value), // Converte o ID do setor para String
          tecnicoId: tecnico.value, // ID do técnico selecionado
          problema: problema.value, // Problema selecionado
          descricao, // Descrição do problema
          createdAt: new Date(),
        },
      });

      return res.status(201).json(newInternalOS);
    } catch (error) {
      console.error("Erro ao salvar OS interna:", error);
      return res.status(500).json({ error: "Erro ao salvar OS interna." });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}